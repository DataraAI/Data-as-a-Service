"""Backfill missing dataset /video/ assets from existing orig/egos frame blobs."""

from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
VIDEO_EXTENSIONS = (".mp4", ".mov", ".m4v", ".webm")


def normalize_category_key(value: Any) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())
    aliases = {
        "automotive": "carautomation",
        "carautomation": "carautomation",
        "datacenter": "serverrack",
        "datacentre": "serverrack",
        "serverrack": "serverrack",
        "humanoid": "dexterity",
        "dexterity": "dexterity",
        "warehouse": "warehouse",
    }
    return aliases.get(normalized, normalized)


def frame_blob_sort_key(blob_name: str) -> tuple[int, int | str, str]:
    file_name = os.path.basename(blob_name)
    stem = os.path.splitext(file_name)[0]
    if stem.isdigit():
        return (0, int(stem), file_name.lower())
    match = re.search(r"_(\d+)(?:_|$)", stem)
    if match:
        return (0, int(match.group(1)), file_name.lower())
    return (1, file_name.lower(), file_name.lower())


def has_existing_video_blob(blob_names: list[str]) -> bool:
    return any(str(blob_name).lower().endswith(VIDEO_EXTENSIONS) for blob_name in blob_names)


def choose_frame_view(
    *,
    orig_blobs: list[str],
    ego_blobs: list[str],
    preferred_views: tuple[str, ...] = ("orig", "egos"),
) -> tuple[str, list[str]] | None:
    available = {
        "orig": sorted(orig_blobs, key=frame_blob_sort_key),
        "egos": sorted(ego_blobs, key=frame_blob_sort_key),
    }
    for view_name in preferred_views:
        selected = available.get(view_name, [])
        if selected:
            return view_name, selected
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Backfill missing Azure /video/ assets for existing datasets by rebuilding a 30fps MP4 "
            "from stored frame blobs."
        )
    )
    parser.add_argument(
        "--category",
        default="serverrack",
        help="Dataset category to backfill. Defaults to serverrack.",
    )
    parser.add_argument(
        "--user-email",
        default="",
        help="Approved user email to use when listing datasets. Defaults to the first approved admin.",
    )
    parser.add_argument(
        "--dataset-prefix",
        default="",
        help="Optional storage-prefix filter, e.g. serverrack/AnalogDevices.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max number of datasets to process after filtering.",
    )
    parser.add_argument(
        "--fps",
        type=float,
        default=30.0,
        help="Output FPS for generated videos. Defaults to 30.",
    )
    parser.add_argument(
        "--overwrite-existing",
        action="store_true",
        help="Regenerate/upload even when a dataset already has a /video/ blob.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show which datasets would be backfilled without generating or uploading videos.",
    )
    return parser.parse_args()


def _pick_operator_user(sql_store: Any, requested_email: str) -> dict[str, Any]:
    if requested_email:
        user = sql_store.get_user_by_email(requested_email)
        if not user:
            raise ValueError(f"No user found for email: {requested_email}")
        if not user.get("approved"):
            raise ValueError(f"User is not approved: {requested_email}")
        return user

    admin_user = sql_store.get_first_admin_user()
    if admin_user:
        return admin_user

    for candidate in sql_store.list_users():
        if candidate.get("approved"):
            return candidate

    raise ValueError("No approved users were found in the SQL catalog.")


def _humanise_dataset_name(output_name: str) -> str:
    dataset_name = os.path.basename(output_name.strip("/"))
    dataset_name = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", dataset_name)
    dataset_name = dataset_name.replace("_", " ").replace("-", " ")
    dataset_name = re.sub(r"\s+", " ", dataset_name).strip().lower()
    return dataset_name


def resolve_task(task: str, output_name: str) -> str:
    task_text = str(task or "").strip()
    if task_text:
        return task_text
    fallback = _humanise_dataset_name(output_name)
    if not fallback:
        return ""
    if fallback[-1] not in ".!?":
        fallback += "."
    return fallback


def _list_image_blob_names(azure_service: Any, container_name: str, prefix: str) -> list[str]:
    blobs = azure_service.list_blobs(container_name, prefix)
    return sorted(
        [
            blob.name
            for blob in blobs
            if str(getattr(blob, "name", "")).lower().endswith(IMAGE_EXTENSIONS)
        ],
        key=frame_blob_sort_key,
    )


def _list_video_blob_names(azure_service: Any, container_name: str, prefix: str) -> list[str]:
    blobs = azure_service.list_blobs(container_name, prefix)
    return sorted(
        [
            blob.name
            for blob in blobs
            if str(getattr(blob, "name", "")).lower().endswith(VIDEO_EXTENSIONS)
        ]
    )


def _render_video_from_frame_blobs(
    *,
    azure_service: Any,
    container_name: str,
    frame_blob_names: list[str],
    output_path: str,
    fps: float,
) -> dict[str, Any]:
    import cv2
    import numpy as np

    from datara.services.processing_service import ProcessingService

    writer = None
    width = None
    height = None
    frame_count = 0

    try:
        for blob_name in frame_blob_names:
            payload = azure_service.download_blob(container_name, blob_name).readall()
            frame_buffer = np.frombuffer(payload, dtype=np.uint8)
            frame = cv2.imdecode(frame_buffer, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            if writer is None:
                height, width = frame.shape[:2]
                writer = ProcessingService._open_mp4_writer(output_path, fps, width, height)

            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)

            writer.write(frame)
            frame_count += 1

        if writer is None or frame_count == 0 or width is None or height is None:
            raise ValueError("No decodable frames were available to render the backfill video.")
    finally:
        if writer is not None:
            writer.release()

    return {
        "width": width,
        "height": height,
        "fps": fps,
        "frame_count": frame_count,
    }


def _upload_backfilled_video(
    *,
    azure_service: Any,
    dataset: dict[str, Any],
    local_video_path: str,
    video_metadata: dict[str, Any],
) -> str:
    from azure.storage.blob import ContentSettings

    container_name = str(dataset["storage_container"])
    dataset_prefix = str(dataset["storage_prefix"]).rstrip("/")
    blob_name = f"{dataset_prefix}/video/{dataset['dataset_name']}.mp4"
    container_client = azure_service.get_container_client(container_name)

    with open(local_video_path, "rb") as handle:
        container_client.upload_blob(
            name=blob_name,
            data=handle,
            overwrite=True,
            content_settings=ContentSettings(content_type="video/mp4"),
        )

    existing_doc = azure_service.get_cosmos_doc_for_blob(container_name, blob_name) or {}
    azure_service.upsert_cosmos_item(
        {
            "id": existing_doc.get("id", uuid.uuid4().hex),
            "docType": "video_annotation",
            "containerName": container_name,
            "datasetName": dataset_prefix,
            "datasetId": dataset["id"],
            "ownerUserId": dataset["owner_user_id"],
            "visibility": dataset["visibility"],
            "sourceDatasetId": dataset.get("source_dataset_id") or None,
            "view": "video",
            "frameName": os.path.basename(blob_name),
            "blobPath": blob_name,
            "date": "",
            "frameId": None,
            "width": video_metadata["width"],
            "height": video_metadata["height"],
            "miscTags": list(
                dict.fromkeys([*(existing_doc.get("miscTags") or []), "video"])
            ),
            "task": resolve_task(str(dataset.get("task") or ""), dataset_prefix),
            "VLM_tags": existing_doc.get("VLM_tags", []),
            "VLM_tags_by_prompt": existing_doc.get("VLM_tags_by_prompt", {}),
            "VLM_effective_prompts": existing_doc.get("VLM_effective_prompts", {}),
            "VLM_last_prompt_label": existing_doc.get("VLM_last_prompt_label"),
            "vlm": existing_doc.get("vlm"),
            "sharpnessScore": None,
            "clear": None,
            "fps": video_metadata["fps"],
            "frameCount": video_metadata["frame_count"],
            "sourceType": "video",
        }
    )

    return blob_name


def _matches_dataset_prefix(storage_prefix: str, requested_prefix: str) -> bool:
    prefix = requested_prefix.strip().strip("/")
    if not prefix:
        return True
    normalized_storage = storage_prefix.rstrip("/")
    return normalized_storage == prefix or normalized_storage.startswith(f"{prefix}/")


def main() -> None:
    args = parse_args()

    from datara.services.azure_service import AzureService
    from datara.services.sql_store import SQLStore

    sql_store = SQLStore()
    azure_service = AzureService()
    operator_user = _pick_operator_user(sql_store, args.user_email)
    requested_category = normalize_category_key(args.category)

    datasets = [
        dataset
        for dataset in sql_store.list_accessible_datasets(operator_user)
        if normalize_category_key(dataset.get("category")) == requested_category
        and _matches_dataset_prefix(str(dataset.get("storage_prefix") or ""), args.dataset_prefix)
    ]

    if args.limit and args.limit > 0:
        datasets = datasets[: args.limit]

    created_count = 0
    skipped_existing = 0
    skipped_empty = 0
    failed_count = 0

    print(
        f"Scanning {len(datasets)} dataset(s) in category '{args.category}' "
        f"as {operator_user.get('email')}."
    )

    for dataset in datasets:
        dataset_prefix = str(dataset["storage_prefix"]).rstrip("/")
        container_name = str(dataset["storage_container"])
        existing_video_blobs = _list_video_blob_names(azure_service, container_name, f"{dataset_prefix}/video")
        if existing_video_blobs and not args.overwrite_existing:
            skipped_existing += 1
            print(f"Skip existing video: {dataset_prefix} ({len(existing_video_blobs)} video blob(s))")
            continue

        orig_blobs = _list_image_blob_names(azure_service, container_name, f"{dataset_prefix}/orig")
        ego_blobs = _list_image_blob_names(azure_service, container_name, f"{dataset_prefix}/egos")
        frame_selection = choose_frame_view(orig_blobs=orig_blobs, ego_blobs=ego_blobs)
        if frame_selection is None:
            skipped_empty += 1
            print(f"Skip empty dataset: {dataset_prefix}")
            continue

        source_view, frame_blobs = frame_selection
        if args.dry_run:
            print(
                f"[DRY RUN] Would backfill {dataset_prefix} from {source_view} "
                f"using {len(frame_blobs)} frame(s)"
            )
            created_count += 1
            continue

        try:
            with tempfile.TemporaryDirectory(prefix="backfill_video_") as temp_dir:
                local_video_path = os.path.join(temp_dir, f"{dataset['dataset_name']}.mp4")
                video_metadata = _render_video_from_frame_blobs(
                    azure_service=azure_service,
                    container_name=container_name,
                    frame_blob_names=frame_blobs,
                    output_path=local_video_path,
                    fps=float(args.fps),
                )
                blob_name = _upload_backfilled_video(
                    azure_service=azure_service,
                    dataset=dataset,
                    local_video_path=local_video_path,
                    video_metadata=video_metadata,
                )
            created_count += 1
            print(
                f"Backfilled {dataset_prefix} -> {blob_name} "
                f"({video_metadata['frame_count']} frames from {source_view})"
            )
        except Exception as exc:
            failed_count += 1
            print(f"Failed {dataset_prefix}: {exc}")

    print(
        "Done. "
        f"processed={created_count} skipped_existing={skipped_existing} "
        f"skipped_empty={skipped_empty} failed={failed_count}"
    )


if __name__ == "__main__":
    main()
