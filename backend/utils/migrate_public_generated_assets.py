"""Copy generated legacy dataset assets into the new public layout.

This is a supplemental migration companion for migrate_public_dataset_layout.py.
It intentionally does not write the core dataset shell that the first migration
owns:

    <vertical>/<task>/README.md
    <vertical>/<task>/<task>.mp4
    <vertical>/<task>/misc/orig/**
    <vertical>/<task>/misc/egos/**
    <vertical>/<task>/misc/masks/**
    SQL dataset catalog rows

It only copies generated/extra assets such as corner-case outputs, occlusion
videos, new-angle videos, hand mesh artifacts, preview videos, cache files, and
downloadable generated metadata. Run with --dry-run first.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Any

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.config import settings
from datara.services.azure_service import AzureService
from datara.services.sql_store import SQLStore
from utils.migrate_public_dataset_layout import (
    CopyPlan,
    MigrationStats,
    choose_source_video,
    copy_blob_with_metadata,
    discover_datasets_from_blobs,
    list_blob_names,
    matches_filter,
    migrated_copy_plans,
    normalize_vertical,
    resolve_admin_user,
    resolve_target_prefix,
    source_task_intelligence,
    write_file_doc,
    write_text_blob,
)


CORE_LAYOUT_KINDS = {
    "source_video",
    "additional_source_video",
    "frame",
    "mask_frame",
    "readme",
    "root_video",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Copy generated/extra legacy roboteyeview assets into roboteyeview-public "
            "without touching core dataset files created by the first migration."
        )
    )
    parser.add_argument("--admin-email", required=True, help="Approved admin user for source catalog access.")
    parser.add_argument("--source-container", default="roboteyeview")
    parser.add_argument("--target-container", default="roboteyeview-public")
    parser.add_argument(
        "--category",
        default="",
        help="Optional category/vertical filter, e.g. serverrack, dexterity, warehouse, carAutomation.",
    )
    parser.add_argument(
        "--dataset-prefix",
        default="",
        help="Optional legacy storage prefix filter, e.g. serverrack/Dell/dataRackInstall.",
    )
    parser.add_argument("--limit", type=int, default=0, help="Optional max number of datasets to process.")
    parser.add_argument(
        "--conflict-strategy",
        choices=["fail", "skip", "suffix"],
        default="fail",
        help="Must match the first migration script so both scripts resolve duplicate task names identically.",
    )
    parser.add_argument("--overwrite-existing", action="store_true", help="Overwrite target blobs that already exist.")
    parser.add_argument("--skip-corner-cases", action="store_true", help="Do not copy corner-case frame outputs.")
    parser.add_argument("--skip-generated", action="store_true", help="Do not copy generated videos or hand outputs.")
    parser.add_argument("--skip-preview", action="store_true", help="Do not copy preview/ assets.")
    parser.add_argument("--skip-cache", action="store_true", help="Do not copy misc/cache or VIPE cache files.")
    parser.add_argument(
        "--skip-task-intelligence-json",
        action="store_true",
        help="Do not materialize taskIntelligence into <task>_intelligence.JSON.",
    )
    parser.add_argument(
        "--skip-cosmos",
        action="store_true",
        help="Copy Blob assets only; do not clone or write Cosmos metadata.",
    )
    parser.add_argument(
        "--include-private",
        action="store_true",
        help="Also inspect private datasets visible to the admin user. Public-only is the default.",
    )
    parser.add_argument(
        "--discover-from-blobs",
        action="store_true",
        help="Scan Blob prefixes and migrate datasets even when SQL public catalog rows are missing.",
    )
    parser.add_argument(
        "--target-catalog-wait-seconds",
        type=int,
        default=0,
        help=(
            "When running in parallel with the first migration, wait this long for the target SQL "
            "dataset row to appear before skipping that dataset."
        ),
    )
    parser.add_argument("--verbose-copies", action="store_true", help="Print every individual blob copy plan.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned changes without writing Blob/Cosmos.")
    return parser.parse_args()


def supplemental_copy_plans(
    *,
    source_blobs: list[str],
    source_prefix: str,
    target_prefix: str,
    task_slug: str,
    source_video: str | None,
    include_corner_cases: bool = True,
    include_generated: bool = True,
    include_preview: bool = True,
    include_cache: bool = True,
) -> list[CopyPlan]:
    plans = migrated_copy_plans(
        source_blobs=source_blobs,
        source_prefix=source_prefix,
        target_prefix=target_prefix,
        task_slug=task_slug,
        source_video=source_video,
        include_frames=include_corner_cases,
        include_generated=include_generated,
        include_preview=include_preview,
        include_cache=include_cache,
        include_readme=False,
    )
    return [
        plan
        for plan in plans
        if plan.kind not in CORE_LAYOUT_KINDS
    ]


def safe_cosmos_metadata(
    *,
    azure: AzureService,
    container: str,
    prefix: str,
) -> tuple[dict[str, dict[str, Any]], bool]:
    try:
        return azure.get_cosmos_metadata_for_prefix(container, prefix), True
    except Exception as exc:
        print(f"  WARN skipping Cosmos metadata for {container}/{prefix}: {exc}")
        return {}, False


def copy_blob_without_metadata(
    *,
    azure: AzureService,
    source_container: str,
    target_container: str,
    plan: CopyPlan,
    overwrite: bool,
    verbose: bool,
    dry_run: bool,
) -> tuple[int, int, bool]:
    action = "COPY"
    if not dry_run and azure.blob_exists(target_container, plan.target_blob):
        if not overwrite:
            if verbose:
                print(f"  SKIP existing {target_container}/{plan.target_blob}")
            return 0, 0, True
        action = "OVERWRITE"

    if dry_run:
        action = "WOULD COPY"
    if verbose:
        print(f"  {action} {plan.kind}: {plan.source_blob} -> {plan.target_blob}")
    if not dry_run:
        azure.copy_blob(
            source_container=source_container,
            source_blob=plan.source_blob,
            target_container=target_container,
            target_blob=plan.target_blob,
            overwrite=overwrite,
        )
    return 1, 0, False


def find_target_dataset(
    *,
    store: SQLStore,
    admin_user: dict[str, Any],
    source_dataset: dict[str, Any],
    target_container: str,
    target_prefix: str,
    task_slug: str,
    wait_seconds: int,
    dry_run: bool,
) -> dict[str, Any] | None:
    if dry_run:
        return {
            "id": "dry-run-target",
            "owner_user_id": admin_user["id"],
            "owner_storage_slug": admin_user["storage_slug"],
            "created_by_user_id": admin_user["id"],
            "visibility": "public",
            "category": target_prefix.split("/", 1)[0],
            "brand": "",
            "dataset_name": task_slug,
            "storage_container": target_container,
            "storage_prefix": target_prefix,
            "source_kind": "public-layout-migration",
            "source_dataset_id": source_dataset.get("source_dataset_id") or source_dataset.get("id"),
            "task": source_dataset.get("task") or task_slug,
        }

    deadline = time.monotonic() + max(wait_seconds, 0)
    while True:
        target_dataset = store.get_dataset_by_storage(target_container, target_prefix)
        if target_dataset:
            return target_dataset
        if time.monotonic() >= deadline:
            return None
        time.sleep(2)


def migrate_supplemental_dataset(
    *,
    args: argparse.Namespace,
    store: SQLStore,
    azure: AzureService,
    admin_user: dict[str, Any],
    source_dataset: dict[str, Any],
    task_slug: str,
    target_prefix: str,
) -> tuple[int, int, int, int]:
    source_container = str(source_dataset["storage_container"])
    source_prefix = str(source_dataset["storage_prefix"]).rstrip("/")
    target_container = str(args.target_container)
    source_blobs = list(source_dataset.get("_source_blobs") or list_blob_names(azure, source_container, source_prefix))
    source_video = choose_source_video(source_blobs, source_prefix, str(source_dataset.get("dataset_name") or task_slug))

    plans = supplemental_copy_plans(
        source_blobs=source_blobs,
        source_prefix=source_prefix,
        target_prefix=target_prefix,
        task_slug=task_slug,
        source_video=source_video,
        include_corner_cases=not args.skip_corner_cases,
        include_generated=not args.skip_generated,
        include_preview=not args.skip_preview,
        include_cache=not args.skip_cache,
    )

    print(f"SUPPLEMENT {source_container}/{source_prefix} -> {target_container}/{target_prefix}")

    if not plans and args.skip_task_intelligence_json:
        print("  Dataset summary: planned_or_copied=0 skipped=0 cosmos_docs=0 intelligence_json=0")
        return 0, 0, 0, 0

    target_dataset = find_target_dataset(
        store=store,
        admin_user=admin_user,
        source_dataset=source_dataset,
        target_container=target_container,
        target_prefix=target_prefix,
        task_slug=task_slug,
        wait_seconds=int(args.target_catalog_wait_seconds or 0),
        dry_run=bool(args.dry_run),
    )
    if not target_dataset:
        print(
            f"  SKIP missing target catalog row {target_container}/{target_prefix}; "
            "run after the first migration or increase --target-catalog-wait-seconds"
        )
        return 0, 1, 0, 0

    source_metadata: dict[str, dict[str, Any]] = {}
    target_metadata: dict[str, dict[str, Any]] = {}
    cosmos_available = not args.skip_cosmos
    if cosmos_available:
        source_metadata, source_cosmos_ok = safe_cosmos_metadata(
            azure=azure,
            container=source_container,
            prefix=source_prefix,
        )
        target_metadata, target_cosmos_ok = (
            ({}, True)
            if args.dry_run
            else safe_cosmos_metadata(
                azure=azure,
                container=target_container,
                prefix=target_prefix,
            )
        )
        cosmos_available = source_cosmos_ok and target_cosmos_ok

    blob_copies = 0
    skipped = 0
    cosmos_docs = 0
    intelligence_count = 0

    for plan in plans:
        if cosmos_available:
            copied, docs, did_skip = copy_blob_with_metadata(
                azure=azure,
                source_container=source_container,
                target_container=target_container,
                plan=plan,
                target_prefix=target_prefix,
                target_dataset=target_dataset,
                source_dataset=source_dataset,
                source_metadata=source_metadata,
                target_metadata=target_metadata,
                overwrite=bool(args.overwrite_existing),
                verbose=bool(args.verbose_copies),
                dry_run=bool(args.dry_run),
            )
        else:
            copied, docs, did_skip = copy_blob_without_metadata(
                azure=azure,
                source_container=source_container,
                target_container=target_container,
                plan=plan,
                overwrite=bool(args.overwrite_existing),
                verbose=bool(args.verbose_copies),
                dry_run=bool(args.dry_run),
            )
        blob_copies += copied
        cosmos_docs += docs
        if did_skip:
            skipped += 1

    has_planned_intelligence_json = any(plan.kind == "task_intelligence_json" for plan in plans)
    if not args.skip_task_intelligence_json and cosmos_available and not has_planned_intelligence_json and source_video:
        intelligence = source_task_intelligence(source_metadata, source_video)
        if intelligence:
            intelligence_blob = f"{target_prefix}/{task_slug}_intelligence.JSON"
            wrote = write_text_blob(
                azure=azure,
                container=target_container,
                blob=intelligence_blob,
                text=json.dumps(intelligence, indent=2, ensure_ascii=False),
                content_type="application/json; charset=utf-8",
                overwrite=bool(args.overwrite_existing),
                dry_run=bool(args.dry_run),
            )
            if wrote:
                intelligence_count += 1
                cosmos_docs += write_file_doc(
                    azure=azure,
                    target_container=target_container,
                    target_blob=intelligence_blob,
                    target_prefix=target_prefix,
                    target_dataset=target_dataset,
                    source_dataset=source_dataset,
                    doc_type="task_intelligence_file",
                    source_type="task_intelligence",
                    dry_run=bool(args.dry_run),
                )
            else:
                skipped += 1

    print(
        f"  Dataset summary: planned_or_copied={blob_copies} skipped={skipped} "
        f"cosmos_docs={cosmos_docs} intelligence_json={intelligence_count}"
    )
    return blob_copies, skipped, cosmos_docs, intelligence_count


def source_datasets(
    *,
    args: argparse.Namespace,
    store: SQLStore,
    azure: AzureService,
    admin_user: dict[str, Any],
) -> list[dict[str, Any]]:
    requested_category = normalize_vertical(args.category) if args.category else ""
    datasets = [
        dataset
        for dataset in store.list_accessible_datasets(admin_user)
        if str(dataset.get("storage_container") or "") == args.source_container
        and (args.include_private or dataset.get("visibility") == "public")
        and matches_filter(str(dataset.get("storage_prefix") or ""), args.dataset_prefix)
        and (not requested_category or normalize_vertical(dataset.get("category")) == requested_category)
    ]
    datasets.sort(key=lambda dataset: str(dataset.get("storage_prefix") or ""))

    if args.discover_from_blobs or not datasets:
        if not datasets:
            print("No matching SQL catalog rows found; falling back to Blob prefix discovery.")
        discovered = discover_datasets_from_blobs(
            store=store,
            azure=azure,
            admin_user=admin_user,
            source_container=args.source_container,
            prefix_filter=args.dataset_prefix,
            category_filter=requested_category,
        )
        known_prefixes = {str(dataset.get("storage_prefix") or "").rstrip("/") for dataset in datasets}
        for dataset in discovered:
            if str(dataset.get("storage_prefix") or "").rstrip("/") not in known_prefixes:
                datasets.append(dataset)
        datasets.sort(key=lambda dataset: str(dataset.get("storage_prefix") or ""))

    if args.limit > 0:
        datasets = datasets[: args.limit]
    return datasets


def main() -> None:
    args = parse_args()
    print(f"Using auth database: {settings.auth_database_label}")
    print(f"Source container: {args.source_container}")
    print(f"Target container: {args.target_container}")
    print("Mode: supplemental generated assets only; core layout targets are skipped")
    if args.dry_run:
        print("DRY RUN: no Blob or Cosmos writes will be made")

    store = SQLStore()
    azure = AzureService()
    admin_user = resolve_admin_user(store, args.admin_email)

    if not args.dry_run:
        azure.ensure_container(args.target_container)

    datasets = source_datasets(args=args, store=store, azure=azure, admin_user=admin_user)
    stats = MigrationStats(datasets_seen=len(datasets))
    seen_targets: dict[str, str] = {}

    print(f"Found {len(datasets)} source dataset(s) to inspect")
    for source_dataset in datasets:
        source_prefix = str(source_dataset.get("storage_prefix") or "").rstrip("/")
        try:
            resolved = resolve_target_prefix(
                source_dataset=source_dataset,
                requested_strategy=args.conflict_strategy,
                seen_targets=seen_targets,
            )
            if resolved is None:
                stats.datasets_skipped += 1
                continue

            task_slug, target_prefix = resolved
            copied, skipped, docs, intelligence_files = migrate_supplemental_dataset(
                args=args,
                store=store,
                azure=azure,
                admin_user=admin_user,
                source_dataset=source_dataset,
                task_slug=task_slug,
                target_prefix=target_prefix,
            )
            stats.datasets_migrated += 1
            stats.blobs_copied += copied
            stats.blobs_skipped += skipped
            stats.cosmos_docs_upserted += docs
            stats.intelligence_files_written += intelligence_files
        except Exception as exc:
            stats.failures.append((source_prefix, str(exc)))
            print(f"FAILED {source_prefix}: {exc}")

    print("")
    print("Supplemental migration summary")
    print(f"  datasets_seen={stats.datasets_seen}")
    print(f"  datasets_migrated={stats.datasets_migrated}")
    print(f"  datasets_skipped={stats.datasets_skipped}")
    print(f"  blobs_copied={stats.blobs_copied}")
    print(f"  blobs_skipped={stats.blobs_skipped}")
    print(f"  cosmos_docs_upserted={stats.cosmos_docs_upserted}")
    print(f"  intelligence_files_written={stats.intelligence_files_written}")

    if stats.failures:
        print("")
        print("Failures")
        for source_prefix, message in stats.failures:
            print(f"  {source_prefix}: {message}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
