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
    legacy_category = parts[0]

    if legacy_category == "humanoid":
        return "dexterity", parts[1], parts[2]

    if legacy_category.lower() == "peeling":
        return "dexterity", "peeling", parts[2]

    if legacy_category.lower() == "washingmachine":
        return "dexterity", "washingMachine", parts[2]

    return legacy_category, parts[1], parts[2]


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
    source_prefix = source_prefix.rstrip("/")
    target_prefix = target_prefix.rstrip("/")

    if source_container == target_container and source_prefix == target_prefix:
        print(f"Backfilling catalog only for {target_prefix}")
    else:
        for blob in azure.list_blobs(source_container, source_prefix):
            suffix = blob.name[len(source_prefix) + 1 :]
            target_blob = f"{target_prefix}/{suffix}"

            if blob.name == target_blob:
                continue

            if azure.blob_exists(target_container, target_blob):
                print(f"Skipping existing blob {target_container}/{target_blob}")
                continue

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
    print(f"Using auth catalog: {settings.sqlite_path}")
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
    failures: list[tuple[str, str]] = []
    for prefix in sorted(prefixes):
        route_parts = route_parts_for_prefix(prefix)
        if not route_parts:
            continue
        category, brand, dataset_name = route_parts
        target_prefix = f"{category}/{brand}/{dataset_name}"
        resolved_storage_prefix = prefix if args.source_container == args.target_container else target_prefix

        if args.source_container == args.target_container and prefix == target_prefix:
            print(f"Registering existing public dataset {prefix}")
        else:
            print(f"Migrating {prefix} -> {target_prefix} (storage: {resolved_storage_prefix})")

        if args.dry_run:
            migrated += 1
            continue

        try:
            dataset = store.backfill_dataset(
                owner_user=admin_user,
                created_by_user=admin_user,
                visibility="public",
                category=category,
                brand=brand,
                dataset_name=dataset_name,
                storage_container=args.target_container,
                storage_prefix=resolved_storage_prefix,
                source_kind="migration",
            )

            blob_count, doc_count = migrate_prefix(
                azure=azure,
                source_container=args.source_container,
                source_prefix=prefix,
                target_container=args.target_container,
                target_prefix=resolved_storage_prefix,
                dataset=dataset,
            )
            print(
                f"Finished {target_prefix}: migrated {blob_count} blobs and rewrote {doc_count} Cosmos documents"
            )
            migrated += 1
        except Exception as exc:
            failures.append((prefix, str(exc)))
            print(f"Failed {prefix}: {exc}")

    print(f"Migrated {migrated} dataset roots")
    if failures:
        print("")
        print("Migration finished with failures:")
        for prefix, message in failures:
            print(f" - {prefix}: {message}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
