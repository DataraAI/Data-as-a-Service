"""Migrate legacy public data into the shared public catalog."""

from __future__ import annotations

import argparse
import os
import sys

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.config import settings
from datara.services.azure_service import AzureService
from datara.services.sql_store import SQLStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate legacy public data into the shared public container")
    parser.add_argument("--admin-email", required=True, help="Existing approved admin email that will own migrated catalog rows")
    parser.add_argument("--source-container", default=settings.azure_blob_container)
    parser.add_argument("--target-container", default=settings.azure_public_container)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def route_parts_for_prefix(prefix: str) -> tuple[str, str, str] | None:
    parts = [segment for segment in prefix.split("/") if segment]
    if len(parts) < 3:
        return None
    category = parts[0]
    if category == "humanoid":
        category = "dexterity"
    return category, parts[1], parts[2]


def migrate_prefix(
    *,
    azure: AzureService,
    source_container: str,
    source_prefix: str,
    target_container: str,
    target_prefix: str,
    dataset: dict[str, str],
) -> tuple[int, int]:
    copied_or_moved = 0

    if source_container == target_container and source_prefix.rstrip("/") == target_prefix.rstrip("/"):
        print(f"Backfilling catalog only for {target_prefix}")
    else:
        for blob in azure.list_blobs(source_container, source_prefix):
            suffix = blob.name[len(source_prefix.rstrip("/")) + 1 :]
            target_blob = f"{target_prefix}/{suffix}"

            if source_container == target_container:
                azure.move_blob(
                    source_container=source_container,
                    source_blob=blob.name,
                    target_container=target_container,
                    target_blob=target_blob,
                    overwrite=False,
                )
            else:
                azure.copy_blob(
                    source_container=source_container,
                    source_blob=blob.name,
                    target_container=target_container,
                    target_blob=target_blob,
                    overwrite=False,
                )
            copied_or_moved += 1

    updated_docs = azure.rewrite_cosmos_docs_for_prefix(
        source_container=source_container,
        source_prefix=source_prefix,
        target_container=target_container,
        target_prefix=target_prefix,
        dataset_id=dataset["id"],
        owner_user_id=dataset["owner_user_id"],
        visibility="public",
        source_dataset_id=None,
    )
    return copied_or_moved, updated_docs


def main() -> None:
    args = parse_args()
    store = SQLStore()
    azure = AzureService()

    admin_user = store.get_user_by_email(args.admin_email)
    if not admin_user:
        raise SystemExit(f"No admin user found for {args.admin_email}")
    if admin_user["role"] != "admin":
        raise SystemExit(f"{args.admin_email} is not an admin in the auth catalog")

    azure.ensure_container(args.target_container)
    source_client = azure.get_container_client(args.source_container)
    prefixes = set()
    for blob in source_client.list_blobs():
        parts = [segment for segment in blob.name.split("/") if segment]
        if len(parts) >= 3:
            prefixes.add("/".join(parts[:3]))

    migrated = 0
    for prefix in sorted(prefixes):
        route_parts = route_parts_for_prefix(prefix)
        if not route_parts:
            continue
        category, brand, dataset_name = route_parts
        target_prefix = f"{category}/{brand}/{dataset_name}"

        if args.source_container == args.target_container and prefix == target_prefix:
            print(f"Registering existing public dataset {prefix}")
        else:
            print(f"Migrating {prefix} -> {target_prefix}")

        if args.dry_run:
            migrated += 1
            continue

        dataset = store.backfill_dataset(
            owner_user=admin_user,
            created_by_user=admin_user,
            visibility="public",
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            storage_container=args.target_container,
            storage_prefix=target_prefix,
            source_kind="migration",
        )

        blob_count, doc_count = migrate_prefix(
            azure=azure,
            source_container=args.source_container,
            source_prefix=prefix,
            target_container=args.target_container,
            target_prefix=target_prefix,
            dataset=dataset,
        )
        print(
            f"Finished {target_prefix}: migrated {blob_count} blobs and rewrote {doc_count} Cosmos documents"
        )
        migrated += 1

    print(f"Migrated {migrated} dataset roots")


if __name__ == "__main__":
    main()
