"""Copy legacy public datasets into the new roboteyeview-public layout.

The legacy layout is:

    <vertical>/<brand>/<task>/video/input.mp4
    <vertical>/<brand>/<task>/orig/*.png
    <vertical>/<brand>/<task>/egos/*.png
    <vertical>/<brand>/<task>/masks/**

The new public layout is:

    <vertical>/<task>/README.md
    <vertical>/<task>/<task>.mp4
    <vertical>/<task>/misc/orig/*.png
    <vertical>/<task>/misc/egos/egos/*.png
    <vertical>/<task>/misc/egos/cornerCases/*.png
    <vertical>/<task>/misc/masks/**

Generated assets are copied when they already exist. The script never deletes
source blobs. Run with --dry-run first.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Any

from azure.storage.blob import ContentSettings

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.config import settings
from datara.services.azure_service import AzureService
from datara.services.sql_store import SQLStore


VIDEO_EXTENSIONS = (".mp4", ".mov", ".m4v", ".webm")
FRAME_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
HAND_MESH_EXTENSIONS = (".obj",)
ROOT_DOWNLOAD_EXTENSIONS = (*VIDEO_EXTENSIONS, ".mcap", ".npz", ".json", ".zip", ".mda", ".mdf")
V2V_TRAJECTORIES = ("up", "down", "left", "right", "zoom_in", "zoom_out")


@dataclass
class MigrationStats:
    datasets_seen: int = 0
    datasets_migrated: int = 0
    datasets_skipped: int = 0
    blobs_copied: int = 0
    blobs_skipped: int = 0
    cosmos_docs_upserted: int = 0
    readmes_written: int = 0
    intelligence_files_written: int = 0
    failures: list[tuple[str, str]] = field(default_factory=list)


@dataclass(frozen=True)
class CopyPlan:
    source_blob: str
    target_blob: str
    kind: str
    doc_updates: dict[str, Any] = field(default_factory=dict)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Copy public datasets from the legacy roboteyeview layout into "
            "roboteyeview-public/<vertical>/<task>/ and register SQL catalog rows."
        )
    )
    parser.add_argument("--admin-email", required=True, help="Approved admin user that will own new catalog rows.")
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
        "--catalog-brand",
        default="",
        help="Temporary SQL brand value for new rows while code still has a non-null brand column.",
    )
    parser.add_argument(
        "--conflict-strategy",
        choices=["fail", "skip", "suffix"],
        default="fail",
        help="What to do when multiple source datasets map to the same <vertical>/<task> prefix.",
    )
    parser.add_argument("--overwrite-existing", action="store_true", help="Overwrite target blobs that already exist.")
    parser.add_argument("--skip-frames", action="store_true", help="Do not copy orig/egos/masks into misc/.")
    parser.add_argument("--skip-generated", action="store_true", help="Do not copy existing generated outputs.")
    parser.add_argument("--skip-preview", action="store_true", help="Do not copy preview/ assets.")
    parser.add_argument("--skip-cache", action="store_true", help="Do not copy misc/cache or VIPE cache files.")
    parser.add_argument("--skip-readme", action="store_true", help="Do not create README.md files.")
    parser.add_argument(
        "--skip-task-intelligence-json",
        action="store_true",
        help="Do not materialize taskIntelligence into <task>_intelligence.JSON.",
    )
    parser.add_argument(
        "--skip-cosmos",
        action="store_true",
        help="Copy Blob assets and SQL catalog rows only; do not clone or write Cosmos metadata.",
    )
    parser.add_argument(
        "--include-private",
        action="store_true",
        help="Also migrate private datasets visible to the admin user. Public-only is the default.",
    )
    parser.add_argument(
        "--discover-from-blobs",
        action="store_true",
        help="Scan Blob prefixes and migrate datasets even when SQL public catalog rows are missing.",
    )
    parser.add_argument("--verbose-copies", action="store_true", help="Print every individual blob copy plan.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned changes without writing Blob/Cosmos/SQL.")
    return parser.parse_args()


def normalize_vertical(value: Any) -> str:
    compact = re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())
    aliases = {
        "automotive": "carAutomation",
        "carautomation": "carAutomation",
        "datacenter": "serverrack",
        "datacentre": "serverrack",
        "serverrack": "serverrack",
        "humanoid": "dexterity",
        "dexterity": "dexterity",
        "warehouse": "warehouse",
    }
    return aliases.get(compact, safe_path_segment(str(value or "dataset").strip() or "dataset"))


def safe_path_segment(value: str) -> str:
    value = str(value or "").strip().replace("\\", "/").split("/")[-1]
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("._-")
    return value or "dataset"


def safe_file_stem(value: str) -> str:
    return safe_path_segment(value).rsplit(".", 1)[0] or "dataset"


def humanize_task(value: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", str(value or ""))
    text = text.replace("_", " ").replace("-", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text or value


def matches_filter(value: str, requested: str) -> bool:
    requested = requested.strip().strip("/")
    if not requested:
        return True
    value = value.strip().strip("/")
    return value == requested or value.startswith(f"{requested}/")


DATASET_CHILD_MARKERS = {
    "misc",
    "preview",
    "hand_meshes",
    "video",
    "orig",
    "egos",
    "masks",
    "corner_images_controlnet",
    "occl_del",
    "new_angle_videos",
    "hand_mesh",
}


def discovered_root_for_blob(blob: str) -> tuple[str, str, str, str] | None:
    parts = [part for part in blob.strip("/").split("/") if part]
    if len(parts) < 2:
        return None

    vertical = normalize_vertical(parts[0])
    if len(parts) >= 3:
        third = parts[2]
        third_lower = third.lower()
        third_is_file = bool(PurePosixPath(third).suffix)
        if third_lower in DATASET_CHILD_MARKERS or third_is_file:
            task = safe_path_segment(parts[1])
            return vertical, "", task, "/".join(parts[:2])

        brand = safe_path_segment(parts[1])
        task = safe_path_segment(parts[2])
        return vertical, brand, task, "/".join(parts[:3])

    task = safe_path_segment(parts[1])
    return vertical, "", task, "/".join(parts[:2])


def discovered_dataset_record(
    *,
    store: SQLStore,
    admin_user: dict[str, Any],
    source_container: str,
    category: str,
    brand: str,
    task: str,
    storage_prefix: str,
    source_blobs: list[str],
) -> dict[str, Any]:
    existing = store.get_dataset_by_storage(source_container, storage_prefix)
    if existing:
        existing["_source_blobs"] = source_blobs
        return existing

    source_id = f"blob-{uuid.uuid5(uuid.NAMESPACE_URL, f'{source_container}/{storage_prefix}').hex}"
    return {
        "id": source_id,
        "owner_user_id": admin_user["id"],
        "owner_storage_slug": admin_user["storage_slug"],
        "created_by_user_id": admin_user["id"],
        "visibility": "public",
        "category": category,
        "brand": brand,
        "dataset_name": task,
        "storage_container": source_container,
        "storage_prefix": storage_prefix,
        "source_kind": "blob-discovery",
        "source_dataset_id": None,
        "task": humanize_task(task),
        "created_at": "",
        "updated_at": "",
        "deleted_at": None,
        "_source_blobs": source_blobs,
    }


def has_migratable_content(storage_prefix: str, source_blobs: list[str]) -> bool:
    for blob in source_blobs:
        suffix = direct_child_suffix(storage_prefix, blob).lower()
        if not suffix:
            continue
        if suffix.startswith("preview/") or suffix.startswith("misc/cache/"):
            continue
        return True
    return False


def discover_datasets_from_blobs(
    *,
    store: SQLStore,
    azure: AzureService,
    admin_user: dict[str, Any],
    source_container: str,
    prefix_filter: str,
    category_filter: str,
) -> list[dict[str, Any]]:
    scan_prefix = prefix_filter.strip().strip("/")
    print(
        f"Scanning Blob container {source_container}"
        f"{f' under {scan_prefix}' if scan_prefix else ''} for dataset roots..."
    )
    grouped: dict[str, dict[str, Any]] = {}
    for blob in list_blob_names(azure, source_container, scan_prefix):
        discovered = discovered_root_for_blob(blob)
        if not discovered:
            continue
        category, brand, task, storage_prefix = discovered
        if category_filter and normalize_vertical(category) != category_filter:
            continue
        if prefix_filter and not matches_filter(storage_prefix, prefix_filter):
            continue
        record = grouped.setdefault(
            storage_prefix,
            {
                "category": category,
                "brand": brand,
                "task": task,
                "blobs": [],
            },
        )
        record["blobs"].append(blob)

    datasets: list[dict[str, Any]] = []
    for storage_prefix, record in sorted(grouped.items()):
        source_blobs = sorted(record["blobs"])
        if not has_migratable_content(storage_prefix, source_blobs):
            continue
        datasets.append(
            discovered_dataset_record(
                store=store,
                admin_user=admin_user,
                source_container=source_container,
                category=record["category"],
                brand=record["brand"],
                task=record["task"],
                storage_prefix=storage_prefix,
                source_blobs=source_blobs,
            )
        )
    print(f"Discovered {len(datasets)} dataset root(s) from Blob")
    return datasets


def blob_name(blob: Any) -> str:
    return str(getattr(blob, "name", "") or "")


def list_blob_names(azure: AzureService, container: str, prefix: str) -> list[str]:
    return sorted(blob_name(blob) for blob in azure.list_blobs(container, prefix) if blob_name(blob))


def direct_child_suffix(source_prefix: str, blob: str) -> str:
    source_prefix = source_prefix.rstrip("/")
    if blob == source_prefix:
        return ""
    if not blob.startswith(f"{source_prefix}/"):
        return blob
    return blob[len(source_prefix) + 1 :]


def is_root_child_blob(storage_prefix: str, blob: str) -> bool:
    suffix = direct_child_suffix(storage_prefix, blob)
    return bool(suffix) and "/" not in suffix


def root_child_name(storage_prefix: str, blob: str) -> str:
    if not is_root_child_blob(storage_prefix, blob):
        return ""
    return direct_child_suffix(storage_prefix, blob)


def is_generated_root_video_name(filename: str, dataset_name: str) -> bool:
    stem = safe_file_stem(filename).lower()
    dataset_stem = safe_file_stem(dataset_name).lower()
    if stem.startswith("no_"):
        return True
    if stem.endswith("_overlayed_hands"):
        return True
    for trajectory in V2V_TRAJECTORIES:
        if stem == f"{dataset_stem}_{trajectory}":
            return True
    return False


def video_sort_key(name: str, source_prefix: str, dataset_name: str) -> tuple[int, int, str]:
    suffix = direct_child_suffix(source_prefix, name).lower()
    basename = os.path.basename(name).lower()
    preferred_names = {
        f"{dataset_name.lower()}.mp4": 0,
        "input.mp4": 0,
        f"video/{dataset_name.lower()}.mp4": 1,
        "video/input.mp4": 1,
        "source.mp4": 2,
        "video/source.mp4": 2,
    }
    generated_penalty = 50 if is_generated_root_video_name(basename, dataset_name) else 0
    return (preferred_names.get(suffix, preferred_names.get(basename, 20)) + generated_penalty, suffix.count("/"), basename)


def choose_source_video(source_blobs: list[str], source_prefix: str, dataset_name: str) -> str | None:
    normalized_prefix = source_prefix.rstrip("/")
    candidates = [
        name
        for name in source_blobs
        if name.lower().endswith(VIDEO_EXTENSIONS)
        and (
            name.startswith(f"{normalized_prefix}/video/")
            or is_root_child_blob(normalized_prefix, name)
        )
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda name: video_sort_key(name, source_prefix, dataset_name))[0]


def target_video_name(task_slug: str, source_blob: str) -> str:
    ext = PurePosixPath(source_blob).suffix.lower()
    if ext == ".mp4":
        return f"{task_slug}.mp4"
    return f"{task_slug}{ext or '.mp4'}"


def clone_cosmos_doc(
    *,
    azure: AzureService,
    source_blob: str,
    target_container: str,
    target_blob: str,
    target_prefix: str,
    target_dataset: dict[str, Any],
    source_dataset: dict[str, Any],
    source_metadata: dict[str, dict[str, Any]],
    target_metadata: dict[str, dict[str, Any]],
    extra_updates: dict[str, Any] | None = None,
    dry_run: bool,
) -> int:
    if dry_run:
        return 0

    source_doc = source_metadata.get(source_blob) or {}
    target_doc = target_metadata.get(target_blob) or {}
    if not source_doc and not extra_updates:
        return 0

    new_doc = {key: value for key, value in source_doc.items() if not str(key).startswith("_")}
    new_doc["id"] = target_doc.get("id") or uuid.uuid4().hex
    new_doc["containerName"] = target_container
    new_doc["datasetName"] = target_prefix
    new_doc["datasetId"] = target_dataset["id"]
    new_doc["ownerUserId"] = target_dataset["owner_user_id"]
    new_doc["visibility"] = "public"
    new_doc["sourceDatasetId"] = source_dataset.get("source_dataset_id") or source_dataset.get("id")
    new_doc["blobPath"] = target_blob
    new_doc["frameName"] = os.path.basename(target_blob)

    if extra_updates:
        new_doc.update(extra_updates)

    azure.upsert_cosmos_item(new_doc)
    target_metadata[target_blob] = new_doc
    return 1


def copy_blob_with_metadata(
    *,
    azure: AzureService,
    source_container: str,
    target_container: str,
    plan: CopyPlan,
    target_prefix: str,
    target_dataset: dict[str, Any],
    source_dataset: dict[str, Any],
    source_metadata: dict[str, dict[str, Any]],
    target_metadata: dict[str, dict[str, Any]],
    overwrite: bool,
    verbose: bool,
    dry_run: bool,
    write_metadata: bool = True,
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

    if not write_metadata:
        return 1, 0, False

    docs = clone_cosmos_doc(
        azure=azure,
        source_blob=plan.source_blob,
        target_container=target_container,
        target_blob=plan.target_blob,
        target_prefix=target_prefix,
        target_dataset=target_dataset,
        source_dataset=source_dataset,
        source_metadata=source_metadata,
        target_metadata=target_metadata,
        extra_updates=plan.doc_updates,
        dry_run=dry_run,
    )
    return 1, docs, False


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


def make_readme(dataset: dict[str, Any], target_container: str, target_prefix: str, task_slug: str) -> str:
    task_title = humanize_task(task_slug)
    source_prefix = str(dataset["storage_prefix"]).rstrip("/")
    return f"""# {task_title}

This dataset is stored in the public DataraAI dataset layout.

## Main Files

- `{task_slug}.mp4`: original input video.
- `misc/orig/`: original frame sequence when available.
- `misc/egos/egos/`: ego-view frame outputs when available.
- `misc/egos/cornerCases/`: corner-case frame outputs when available.
- `misc/masks/`: generated masks when available.
- `hand_meshes/`: OBJ hand mesh files when available.

Generated videos, MCAPs, NPZ files, and task intelligence JSON appear at the dataset root when they have been generated.

## Storage

- Container: `{target_container}`
- Prefix: `{target_prefix}`
- Migrated from: `{dataset["storage_container"]}/{source_prefix}`
"""


def write_text_blob(
    *,
    azure: AzureService,
    container: str,
    blob: str,
    text: str,
    content_type: str,
    overwrite: bool,
    dry_run: bool,
) -> bool:
    if not dry_run and azure.blob_exists(container, blob) and not overwrite:
        print(f"  SKIP existing {container}/{blob}")
        return False

    print(f"  {'WOULD WRITE' if dry_run else 'WRITE'} {blob}")
    if dry_run:
        return True

    client = azure.get_container_client(container)
    client.upload_blob(
        name=blob,
        data=text.encode("utf-8"),
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )
    return True


def write_file_doc(
    *,
    azure: AzureService,
    target_container: str,
    target_blob: str,
    target_prefix: str,
    target_dataset: dict[str, Any],
    source_dataset: dict[str, Any],
    doc_type: str,
    source_type: str,
    dry_run: bool,
) -> int:
    if dry_run:
        return 0

    existing_doc = azure.get_cosmos_doc_for_blob(target_container, target_blob) or {}
    azure.upsert_cosmos_item(
        {
            "id": existing_doc.get("id") or uuid.uuid4().hex,
            "docType": doc_type,
            "containerName": target_container,
            "datasetName": target_prefix,
            "datasetId": target_dataset["id"],
            "ownerUserId": target_dataset["owner_user_id"],
            "visibility": "public",
            "sourceDatasetId": source_dataset.get("source_dataset_id") or source_dataset.get("id"),
            "view": source_type,
            "frameName": os.path.basename(target_blob),
            "blobPath": target_blob,
            "frameId": None,
            "miscTags": [source_type, "downloadable"],
            "task": target_dataset.get("task") or source_dataset.get("task") or "",
            "sourceType": source_type,
            "downloadable": True,
        }
    )
    return 1


def add_plan(plans: list[CopyPlan], used_targets: set[str], plan: CopyPlan) -> None:
    if plan.target_blob in used_targets:
        return
    used_targets.add(plan.target_blob)
    plans.append(plan)


def direction_from_new_angle_blob(source_blob: str, source_prefix: str, task_slug: str) -> str:
    stem = PurePosixPath(source_blob).stem
    stem = re.sub(r"_generated$", "", stem, flags=re.IGNORECASE)
    stem = re.sub(r"_vipe_output$", "", stem, flags=re.IGNORECASE)
    for prefix in (task_slug, PurePosixPath(source_prefix).name):
        if stem.lower().startswith(f"{prefix.lower()}_"):
            stem = stem[len(prefix) + 1 :]
    return safe_file_stem(stem or "new_angle")


def occlusion_target_name(source_blob: str, source_prefix: str) -> str:
    suffix = direct_child_suffix(f"{source_prefix.rstrip('/')}/occl_del", source_blob)
    parts = [part for part in suffix.split("/") if part]
    include_prompt = safe_file_stem(parts[0] if parts else "human")
    selection = parts[1] if len(parts) > 1 else ""

    subtract_prompt = ""
    match = re.search(r"-minus-([A-Za-z0-9._-]+)-", selection)
    if match:
        subtract_prompt = safe_file_stem(match.group(1))

    if subtract_prompt:
        return f"no_{include_prompt}_keep_{subtract_prompt}.mp4"
    return f"no_{include_prompt}.mp4"


def unique_target_blob(base_blob: str, used_targets: set[str]) -> str:
    if base_blob not in used_targets:
        return base_blob

    path = PurePosixPath(base_blob)
    stem = path.stem
    suffix = path.suffix
    parent = str(path.parent)
    counter = 2
    while True:
        candidate_name = f"{stem}_{counter}{suffix}"
        candidate = f"{parent}/{candidate_name}" if parent != "." else candidate_name
        if candidate not in used_targets:
            return candidate
        counter += 1


def migrated_copy_plans(
    *,
    source_blobs: list[str],
    source_prefix: str,
    target_prefix: str,
    task_slug: str,
    source_video: str | None,
    include_frames: bool,
    include_generated: bool,
    include_preview: bool,
    include_cache: bool,
    include_readme: bool,
) -> list[CopyPlan]:
    plans: list[CopyPlan] = []
    used_targets: set[str] = set()
    normalized_prefix = source_prefix.rstrip("/")
    task_lower = task_slug.lower()

    for source_blob in source_blobs:
        suffix = direct_child_suffix(normalized_prefix, source_blob)
        if not suffix:
            continue

        lower = suffix.lower()
        basename = os.path.basename(source_blob)
        lower_basename = basename.lower()
        target_blob = ""
        kind = "asset"
        doc_updates: dict[str, Any] = {}

        if source_video and source_blob == source_video:
            target_blob = f"{target_prefix}/{target_video_name(task_slug, source_blob)}"
            kind = "source_video"
            doc_updates = {"docType": "video_annotation", "view": "video", "sourceType": "video"}

        elif lower.startswith("video/") and lower.endswith(VIDEO_EXTENSIONS):
            target_blob = unique_target_blob(f"{target_prefix}/{basename}", used_targets)
            kind = "additional_source_video"
            doc_updates = {"docType": "video_annotation", "view": "video", "sourceType": "video"}

        elif include_preview and lower.startswith("preview/"):
            target_blob = f"{target_prefix}/{suffix}"
            kind = "preview"

        elif include_cache and lower.startswith("misc/cache/"):
            target_blob = f"{target_prefix}/{suffix}"
            kind = "cache"

        elif include_frames and lower.startswith("misc/orig/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/{suffix}"
            kind = "frame"

        elif include_frames and lower.startswith("misc/egos/egos/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/{suffix}"
            kind = "frame"

        elif include_frames and lower.startswith("misc/egos/cornercases/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/misc/egos/cornerCases/{suffix[len('misc/egos/cornerCases/'):]}"
            kind = "corner_case_frame"
            doc_updates = {"view": "corner_images_controlnet", "sourceType": "corner_case"}

        elif (
            include_frames
            and lower.startswith("misc/egos/corner_images_controlnet/")
            and lower.endswith(FRAME_EXTENSIONS)
        ):
            target_blob = f"{target_prefix}/misc/egos/cornerCases/{suffix[len('misc/egos/corner_images_controlnet/'):]}"
            kind = "corner_case_frame"
            doc_updates = {"view": "corner_images_controlnet", "sourceType": "corner_case"}

        elif include_frames and lower.startswith("misc/egos/") and lower.endswith(FRAME_EXTENSIONS):
            ego_suffix = suffix[len("misc/egos/") :]
            if "/" in ego_suffix:
                target_blob = f"{target_prefix}/misc/egos/cornerCases/{ego_suffix}"
                kind = "corner_case_frame"
                doc_updates = {"view": "corner_images_controlnet", "sourceType": "corner_case"}
            else:
                target_blob = f"{target_prefix}/misc/egos/egos/{ego_suffix}"
                kind = "frame"

        elif include_frames and lower.startswith("misc/masks/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/{suffix}"
            kind = "mask_frame"

        elif include_frames and lower.startswith("orig/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/misc/orig/{suffix[len('orig/'):]}"
            kind = "frame"

        elif include_frames and lower.startswith("egos/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/misc/egos/egos/{suffix[len('egos/'):]}"
            kind = "frame"

        elif include_frames and lower.startswith("masks/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/misc/masks/{suffix[len('masks/'):]}"
            kind = "mask_frame"

        elif include_frames and lower.startswith("corner_images_controlnet/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/misc/egos/cornerCases/{suffix[len('corner_images_controlnet/'):]}"
            kind = "corner_case_frame"
            doc_updates = {"view": "corner_images_controlnet", "sourceType": "corner_case"}

        elif include_frames and lower.startswith("misc/corner_images_controlnet/") and lower.endswith(FRAME_EXTENSIONS):
            target_blob = f"{target_prefix}/misc/egos/cornerCases/{suffix[len('misc/corner_images_controlnet/'):]}"
            kind = "corner_case_frame"
            doc_updates = {"view": "corner_images_controlnet", "sourceType": "corner_case"}

        elif include_generated and lower.startswith("occl_del/") and lower.endswith(VIDEO_EXTENSIONS):
            target_name = occlusion_target_name(source_blob, source_prefix)
            target_blob = unique_target_blob(f"{target_prefix}/{target_name}", used_targets)
            kind = "occlusion_video"

        elif include_generated and lower.startswith("new_angle_videos/") and lower.endswith(VIDEO_EXTENSIONS):
            direction = direction_from_new_angle_blob(source_blob, source_prefix, task_slug)
            target_blob = unique_target_blob(f"{target_prefix}/{task_slug}_{direction}.mp4", used_targets)
            kind = "new_angle_video"

        elif include_cache and lower.startswith("new_angle_videos/") and lower.endswith(".zip"):
            target_blob = f"{target_prefix}/misc/cache/{basename}"
            kind = "cache"

        elif include_generated and lower.startswith("hand_mesh/"):
            hand_suffix = direct_child_suffix(f"{normalized_prefix}/hand_mesh", source_blob)
            parts = [part for part in hand_suffix.split("/") if part]
            sequence = safe_file_stem(parts[0] if parts else "hand_mesh")

            if lower.endswith(HAND_MESH_EXTENSIONS):
                target_blob = unique_target_blob(f"{target_prefix}/hand_meshes/{sequence}_{basename}", used_targets)
                kind = "hand_mesh_obj"
            elif lower.endswith(".mcap"):
                target_blob = unique_target_blob(f"{target_prefix}/{task_slug}_hand_keypoints.mcap", used_targets)
                kind = "hand_keypoints_mcap"
            elif lower.endswith(".npz"):
                target_blob = unique_target_blob(f"{target_prefix}/{task_slug}_hand_keypoints.npz", used_targets)
                kind = "hand_keypoints_npz"
            elif lower.endswith(VIDEO_EXTENSIONS):
                target_blob = unique_target_blob(f"{target_prefix}/{task_slug}_overlayed_hands.mp4", used_targets)
                kind = "overlayed_hands_video"

        elif include_generated and lower.startswith("hand_meshes/") and lower.endswith(HAND_MESH_EXTENSIONS):
            target_blob = f"{target_prefix}/{suffix}"
            kind = "hand_mesh_obj"

        elif is_root_child_blob(normalized_prefix, source_blob):
            if include_readme and lower_basename == "readme.md":
                target_blob = f"{target_prefix}/README.md"
                kind = "readme"
            elif include_generated and lower_basename.endswith(ROOT_DOWNLOAD_EXTENSIONS):
                if lower_basename.endswith(".json") and "intelligence" in lower_basename:
                    target_blob = f"{target_prefix}/{task_slug}_intelligence.JSON"
                    kind = "task_intelligence_json"
                elif lower_basename.endswith(".mcap") and "hand" in lower_basename:
                    target_blob = f"{target_prefix}/{task_slug}_hand_keypoints.mcap"
                    kind = "hand_keypoints_mcap"
                elif lower_basename.endswith(".npz") and "hand" in lower_basename:
                    target_blob = f"{target_prefix}/{task_slug}_hand_keypoints.npz"
                    kind = "hand_keypoints_npz"
                elif lower_basename.endswith(VIDEO_EXTENSIONS) and source_blob != source_video:
                    if lower_basename.startswith("no_"):
                        target_blob = f"{target_prefix}/{basename}"
                        kind = "occlusion_video"
                    elif lower_basename == f"{task_lower}_overlayed_hands.mp4" or lower_basename.endswith("_overlayed_hands.mp4"):
                        target_blob = f"{target_prefix}/{task_slug}_overlayed_hands.mp4"
                        kind = "overlayed_hands_video"
                    elif any(lower_basename == f"{task_lower}_{trajectory}.mp4" for trajectory in V2V_TRAJECTORIES):
                        target_blob = f"{target_prefix}/{basename}"
                        kind = "new_angle_video"
                    else:
                        target_blob = f"{target_prefix}/{basename}"
                        kind = "root_video"
                elif not lower_basename.endswith(VIDEO_EXTENSIONS):
                    target_blob = f"{target_prefix}/{basename}"
                    kind = "download"

        if not target_blob:
            continue

        add_plan(
            plans,
            used_targets,
            CopyPlan(
                source_blob=source_blob,
                target_blob=target_blob,
                kind=kind,
                doc_updates=doc_updates,
            ),
        )

    return plans


def source_task_intelligence(source_metadata: dict[str, dict[str, Any]], source_video_blob: str | None) -> Any:
    source_doc = source_metadata.get(source_video_blob or "") or {}
    if source_doc.get("taskIntelligence"):
        return source_doc["taskIntelligence"]

    for doc in source_metadata.values():
        if doc.get("taskIntelligence"):
            return doc["taskIntelligence"]

    return None


def resolve_admin_user(store: SQLStore, admin_email: str) -> dict[str, Any]:
    user = store.get_user_by_email(admin_email)
    if not user:
        raise SystemExit(f"No user found for {admin_email}")
    if user.get("role") != "admin" or not user.get("approved"):
        raise SystemExit(f"{admin_email} must be an approved admin user")
    return user


def resolve_target_prefix(
    *,
    source_dataset: dict[str, Any],
    requested_strategy: str,
    seen_targets: dict[str, str],
) -> tuple[str, str] | None:
    vertical = normalize_vertical(source_dataset.get("category"))
    task_slug = safe_path_segment(str(source_dataset.get("dataset_name") or PurePosixPath(source_dataset["storage_prefix"]).name))
    target_prefix = f"{vertical}/{task_slug}"
    source_prefix = str(source_dataset["storage_prefix"]).rstrip("/")

    existing_source = seen_targets.get(target_prefix)
    if not existing_source or existing_source == source_prefix:
        seen_targets[target_prefix] = source_prefix
        return task_slug, target_prefix

    if requested_strategy == "skip":
        print(f"SKIP conflict {source_prefix}: target {target_prefix} already planned from {existing_source}")
        return None

    if requested_strategy == "fail":
        raise ValueError(
            f"Target prefix conflict: {source_prefix} and {existing_source} both map to {target_prefix}. "
            "Use --conflict-strategy suffix if this is expected."
        )

    brand = safe_path_segment(str(source_dataset.get("brand") or "source"))
    suffix_task = safe_path_segment(f"{task_slug}-{brand}")
    target_prefix = f"{vertical}/{suffix_task}"
    counter = 2
    while target_prefix in seen_targets and seen_targets[target_prefix] != source_prefix:
        target_prefix = f"{vertical}/{suffix_task}-{counter}"
        counter += 1
    seen_targets[target_prefix] = source_prefix
    return target_prefix.rsplit("/", 1)[-1], target_prefix


def register_target_dataset(
    *,
    store: SQLStore,
    admin_user: dict[str, Any],
    source_dataset: dict[str, Any],
    target_container: str,
    target_prefix: str,
    task_slug: str,
    catalog_brand: str,
    dry_run: bool,
) -> dict[str, Any]:
    vertical = target_prefix.split("/", 1)[0]
    task_text = str(source_dataset.get("task") or "").strip() or humanize_task(task_slug)

    if dry_run:
        return {
            "id": f"dry-run-{uuid.uuid4().hex[:8]}",
            "owner_user_id": admin_user["id"],
            "owner_storage_slug": admin_user["storage_slug"],
            "created_by_user_id": admin_user["id"],
            "visibility": "public",
            "category": vertical,
            "brand": catalog_brand,
            "dataset_name": task_slug,
            "storage_container": target_container,
            "storage_prefix": target_prefix,
            "source_kind": "public-layout-migration",
            "source_dataset_id": source_dataset.get("source_dataset_id") or source_dataset.get("id"),
            "task": task_text,
        }

    return store.backfill_dataset(
        owner_user=admin_user,
        created_by_user=admin_user,
        visibility="public",
        category=vertical,
        brand=catalog_brand,
        dataset_name=task_slug,
        storage_container=target_container,
        storage_prefix=target_prefix,
        source_kind="public-layout-migration",
        task=task_text,
    )


def migrate_dataset(
    *,
    args: argparse.Namespace,
    store: SQLStore,
    azure: AzureService,
    admin_user: dict[str, Any],
    source_dataset: dict[str, Any],
    task_slug: str,
    target_prefix: str,
) -> tuple[int, int, int, int, int]:
    source_container = str(source_dataset["storage_container"])
    source_prefix = str(source_dataset["storage_prefix"]).rstrip("/")
    target_container = str(args.target_container)
    source_blobs = list(source_dataset.get("_source_blobs") or list_blob_names(azure, source_container, source_prefix))
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

    source_video = choose_source_video(source_blobs, source_prefix, str(source_dataset.get("dataset_name") or task_slug))
    if not source_video:
        raise ValueError(f"No source video found under {source_prefix}/video")

    print(f"MIGRATE {source_container}/{source_prefix} -> {target_container}/{target_prefix}")
    target_dataset = register_target_dataset(
        store=store,
        admin_user=admin_user,
        source_dataset=source_dataset,
        target_container=target_container,
        target_prefix=target_prefix,
        task_slug=task_slug,
        catalog_brand=str(args.catalog_brand or ""),
        dry_run=bool(args.dry_run),
    )

    blob_copies = 0
    skipped = 0
    cosmos_docs = 0
    readme_count = 0
    intelligence_count = 0

    plans = migrated_copy_plans(
        source_blobs=source_blobs,
        source_prefix=source_prefix,
        target_prefix=target_prefix,
        task_slug=task_slug,
        source_video=source_video,
        include_frames=not args.skip_frames,
        include_generated=not args.skip_generated,
        include_preview=not args.skip_preview,
        include_cache=not args.skip_cache,
        include_readme=not args.skip_readme,
    )

    if not args.skip_readme and not any(plan.kind == "readme" for plan in plans):
        readme_blob = f"{target_prefix}/README.md"
        wrote = write_text_blob(
            azure=azure,
            container=target_container,
            blob=readme_blob,
            text=make_readme(source_dataset, target_container, target_prefix, task_slug),
            content_type="text/markdown; charset=utf-8",
            overwrite=bool(args.overwrite_existing),
            dry_run=bool(args.dry_run),
        )
        if wrote:
            readme_count += 1
            if cosmos_available:
                cosmos_docs += write_file_doc(
                    azure=azure,
                    target_container=target_container,
                    target_blob=readme_blob,
                    target_prefix=target_prefix,
                    target_dataset=target_dataset,
                    source_dataset=source_dataset,
                    doc_type="dataset_readme",
                    source_type="readme",
                    dry_run=bool(args.dry_run),
                )
        else:
            skipped += 1

    for plan in plans:
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
            write_metadata=cosmos_available,
        )
        blob_copies += copied
        cosmos_docs += docs
        if did_skip:
            skipped += 1

    has_planned_intelligence_json = any(plan.kind == "task_intelligence_json" for plan in plans)
    if not args.skip_task_intelligence_json and cosmos_available and not has_planned_intelligence_json:
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
                if cosmos_available:
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
        f"cosmos_docs={cosmos_docs} readmes={readme_count} intelligence_json={intelligence_count}"
    )

    return blob_copies, skipped, cosmos_docs, readme_count, intelligence_count


def main() -> None:
    args = parse_args()
    print(f"Using auth database: {settings.auth_database_label}")
    print(f"Source container: {args.source_container}")
    print(f"Target container: {args.target_container}")
    if args.dry_run:
        print("DRY RUN: no Blob, Cosmos, or SQL writes will be made")

    store = SQLStore()
    azure = AzureService()
    admin_user = resolve_admin_user(store, args.admin_email)
    requested_category = normalize_vertical(args.category) if args.category else ""

    if not args.dry_run:
        azure.ensure_container(args.target_container)

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
            copied, skipped, docs, readmes, intelligence_files = migrate_dataset(
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
            stats.readmes_written += readmes
            stats.intelligence_files_written += intelligence_files
        except Exception as exc:
            stats.failures.append((source_prefix, str(exc)))
            print(f"FAILED {source_prefix}: {exc}")

    print("")
    print("Migration summary")
    print(f"  datasets_seen={stats.datasets_seen}")
    print(f"  datasets_migrated={stats.datasets_migrated}")
    print(f"  datasets_skipped={stats.datasets_skipped}")
    print(f"  blobs_copied={stats.blobs_copied}")
    print(f"  blobs_skipped={stats.blobs_skipped}")
    print(f"  cosmos_docs_upserted={stats.cosmos_docs_upserted}")
    print(f"  readmes_written={stats.readmes_written}")
    print(f"  intelligence_files_written={stats.intelligence_files_written}")

    if stats.failures:
        print("")
        print("Failures")
        for source_prefix, message in stats.failures:
            print(f"  {source_prefix}: {message}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
