"""Reorganize public ego/corner-case frame outputs into the current layout.

Dry-run first:

    python backend/utils/reorganize_public_ego_outputs.py --dataset-prefix dexterity/towel

Apply by copying to the new locations:

    python backend/utils/reorganize_public_ego_outputs.py --dataset-prefix dexterity/towel --apply

Optionally remove the old blobs after successful copies:

    python backend/utils/reorganize_public_ego_outputs.py --dataset-prefix dexterity/towel --apply --delete-source
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from dataclasses import dataclass
from typing import Any

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.config import settings
from datara.services.azure_service import AzureService


FRAME_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")


@dataclass(frozen=True)
class ReorganizePlan:
    source_blob: str
    target_blob: str
    kind: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Move/copy existing roboteyeview-public ego outputs from loose misc/egos paths "
            "into misc/egos/egos and misc/egos/cornerCases."
        )
    )
    parser.add_argument("--container", default=settings.azure_public_container)
    parser.add_argument(
        "--dataset-prefix",
        default="",
        help="Optional dataset prefix such as dexterity/towel. Empty scans the whole container.",
    )
    parser.add_argument("--limit", type=int, default=0, help="Optional max number of copy plans to process.")
    parser.add_argument("--apply", action="store_true", help="Write changes. Omit for dry-run.")
    parser.add_argument("--delete-source", action="store_true", help="Delete old blobs after successful copy.")
    parser.add_argument("--overwrite-existing", action="store_true", help="Overwrite target blobs if present.")
    parser.add_argument("--skip-cosmos", action="store_true", help="Do not clone Cosmos metadata to new blob paths.")
    parser.add_argument("--verbose", action="store_true", help="Print skipped non-matching blobs.")
    return parser.parse_args()


def _dataset_prefix_and_relative(blob_name: str) -> tuple[str, str] | None:
    parts = [part for part in str(blob_name or "").strip("/").split("/") if part]
    if len(parts) < 3:
        return None
    return "/".join(parts[:2]), "/".join(parts[2:])


def _is_frame(relative_path: str) -> bool:
    return relative_path.lower().endswith(FRAME_EXTENSIONS)


def plan_for_blob(blob_name: str) -> ReorganizePlan | None:
    parsed = _dataset_prefix_and_relative(blob_name)
    if not parsed:
        return None

    dataset_prefix, relative_path = parsed
    lower_relative = relative_path.lower()
    target_blob = ""
    kind = ""

    if not _is_frame(relative_path):
        return None

    if lower_relative.startswith("misc/egos/egos/") or lower_relative.startswith("misc/egos/cornercases/"):
        return None

    if lower_relative.startswith("misc/egos/corner_images_controlnet/"):
        target_blob = (
            f"{dataset_prefix}/misc/egos/cornerCases/"
            f"{relative_path[len('misc/egos/corner_images_controlnet/'):]}"
        )
        kind = "corner_case_frame"
    elif lower_relative.startswith("misc/corner_images_controlnet/"):
        target_blob = (
            f"{dataset_prefix}/misc/egos/cornerCases/"
            f"{relative_path[len('misc/corner_images_controlnet/'):]}"
        )
        kind = "corner_case_frame"
    elif lower_relative.startswith("corner_images_controlnet/"):
        target_blob = (
            f"{dataset_prefix}/misc/egos/cornerCases/"
            f"{relative_path[len('corner_images_controlnet/'):]}"
        )
        kind = "corner_case_frame"
    elif lower_relative.startswith("misc/egos/"):
        remainder = relative_path[len("misc/egos/") :]
        if not remainder:
            return None
        if "/" in remainder:
            target_blob = f"{dataset_prefix}/misc/egos/cornerCases/{remainder}"
            kind = "corner_case_frame"
        else:
            target_blob = f"{dataset_prefix}/misc/egos/egos/{remainder}"
            kind = "ego_generation_frame"
    elif lower_relative.startswith("egos/"):
        target_blob = f"{dataset_prefix}/misc/egos/egos/{relative_path[len('egos/'):]}"
        kind = "ego_generation_frame"

    if not target_blob or target_blob == blob_name:
        return None
    return ReorganizePlan(source_blob=blob_name, target_blob=target_blob, kind=kind)


def build_plans(blob_names: list[str], *, dataset_prefix: str = "") -> list[ReorganizePlan]:
    normalized_filter = dataset_prefix.strip("/")
    plans: list[ReorganizePlan] = []
    seen_targets: set[str] = set()

    for blob_name in blob_names:
        if normalized_filter and not (
            blob_name == normalized_filter or blob_name.startswith(f"{normalized_filter}/")
        ):
            continue
        plan = plan_for_blob(blob_name)
        if not plan or plan.target_blob in seen_targets:
            continue
        seen_targets.add(plan.target_blob)
        plans.append(plan)

    return plans


def _metadata_updates_for_plan(plan: ReorganizePlan) -> dict[str, Any]:
    if plan.kind == "corner_case_frame":
        return {
            "view": "corner_images_controlnet",
            "sourceType": "corner_case",
            "miscTags": ["corner_case"],
        }
    return {
        "view": "egos",
        "sourceType": "ego_generation",
        "miscTags": ["ego_view"],
    }


def clone_cosmos_doc_for_plan(
    *,
    azure: AzureService,
    container: str,
    plan: ReorganizePlan,
    dry_run: bool,
) -> int:
    if dry_run:
        return 0

    source_doc = azure.get_cosmos_doc_for_blob(container, plan.source_blob)
    if not source_doc:
        return 0

    target_doc = azure.get_cosmos_doc_for_blob(container, plan.target_blob) or {}
    dataset_prefix = "/".join(plan.target_blob.split("/")[:2])
    cloned = {
        **source_doc,
        **_metadata_updates_for_plan(plan),
        "id": target_doc.get("id") or uuid.uuid4().hex,
        "containerName": container,
        "datasetName": dataset_prefix,
        "blobPath": plan.target_blob,
        "frameName": os.path.basename(plan.target_blob),
    }
    azure.upsert_cosmos_item(cloned)
    return 1


def main() -> None:
    args = parse_args()
    azure = AzureService()
    scan_prefix = args.dataset_prefix.strip("/")
    blob_names = [
        str(getattr(blob, "name", "")).strip()
        for blob in azure.list_blobs(args.container, scan_prefix)
        if str(getattr(blob, "name", "")).strip()
    ]
    plans = build_plans(blob_names, dataset_prefix=scan_prefix)
    if args.limit > 0:
        plans = plans[: args.limit]

    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"{mode} {len(plans)} planned ego/corner-case reorganizations in {args.container}")

    copied = 0
    skipped = 0
    metadata_docs = 0
    deleted = 0
    for plan in plans:
        action = "COPY"
        if not args.apply:
            action = "WOULD COPY"
        elif azure.blob_exists(args.container, plan.target_blob) and not args.overwrite_existing:
            print(f"  SKIP existing target: {plan.target_blob}")
            skipped += 1
            continue

        print(f"  {action} {plan.kind}: {plan.source_blob} -> {plan.target_blob}")
        if args.apply:
            azure.copy_blob(
                source_container=args.container,
                source_blob=plan.source_blob,
                target_container=args.container,
                target_blob=plan.target_blob,
                overwrite=args.overwrite_existing,
            )
            copied += 1
            if not args.skip_cosmos:
                metadata_docs += clone_cosmos_doc_for_plan(
                    azure=azure,
                    container=args.container,
                    plan=plan,
                    dry_run=False,
                )
            if args.delete_source:
                azure.delete_blob(args.container, plan.source_blob)
                deleted += 1

    print(
        "Summary: "
        f"planned={len(plans)} copied={copied} skipped={skipped} "
        f"cosmos_docs={metadata_docs} deleted_sources={deleted}"
    )


if __name__ == "__main__":
    main()
