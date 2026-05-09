"""One-time backfill utility for dataset-level playable source videos."""

from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile

import cv2
import numpy as np
from azure.core.exceptions import ResourceNotFoundError
from azure.storage.blob import ContentSettings

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.logging import logger
from datara.services.azure_service import AzureService
from datara.services.processing_service import ProcessingService
from datara.services.sql_store import SQLStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill playable dataset videos from existing orig frame folders."
    )
    parser.add_argument(
        "--route_prefix",
        default="",
        help="Optional category/brand/dataset prefix filter (matches storage_prefix or viewer path).",
    )
    parser.add_argument(
        "--fps",
        type=float,
        default=30.0,
        help="FPS to encode for backfilled videos (default: 30).",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Regenerate even when a video already exists under the dataset's video/ folder.",
    )
    return parser.parse_args()


def _frame_sort_key(blob_name: str) -> tuple[int, int, str]:
    base = os.path.basename(blob_name)
    stem = os.path.splitext(base)[0]
    if stem.isdigit():
        return (0, int(stem), base.lower())
    match = re.search(r"_(\d+)(?:_|$)", stem)
    if match:
        return (0, int(match.group(1)), base.lower())
    return (1, 0, base.lower())


def _is_video_blob(blob_name: str) -> bool:
    return blob_name.lower().endswith((".mp4", ".mov", ".m4v", ".webm"))


def _is_frame_blob(blob_name: str) -> bool:
    return blob_name.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))


def _first_matching_video_blob(azure_service: AzureService, container: str, storage_prefix: str) -> str | None:
    try:
        blobs = azure_service.list_blobs(container, f"{storage_prefix.rstrip('/')}/video")
    except Exception:
        return None

    for blob in sorted(blobs, key=lambda item: getattr(item, "name", "").lower()):
        blob_name = getattr(blob, "name", "")
        if _is_video_blob(blob_name):
            return blob_name
    return None


def _load_frame_from_blob(azure_service: AzureService, container: str, blob_name: str) -> np.ndarray:
    payload = azure_service.download_blob(container, blob_name).readall()
    frame = cv2.imdecode(np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError(f"Failed to decode frame blob: {blob_name}")
    return frame


def _existing_video_doc(azure_service: AzureService, container: str, storage_prefix: str) -> dict | None:
    docs = azure_service.list_cosmos_docs_for_prefix(container, storage_prefix)
    for doc in docs:
        if doc.get("docType") == "video_annotation" and str(doc.get("view") or "").strip().lower() == "video":
            return doc
    return None


def main() -> None:
    args = parse_args()
    fps = float(args.fps) if args.fps and args.fps > 0 else 30.0
    route_prefix = str(args.route_prefix or "").strip().strip("/")
    current_user = {"role": "admin", "id": 0}

    sql_store = SQLStore()
    azure_service = AzureService()
    datasets = sql_store.list_accessible_datasets(current_user)

    processed = 0
    skipped_existing = 0
    skipped_missing_frames = 0
    skipped_missing_container = 0

    for dataset in datasets:
        summary = sql_store.build_dataset_summary(dataset, current_user)
        route_path = summary["full_path"]
        storage_prefix = str(dataset["storage_prefix"]).rstrip("/")

        if route_prefix and not (
            storage_prefix.startswith(route_prefix) or route_path.startswith(route_prefix)
        ):
            continue

        container_name = str(dataset["storage_container"])
        existing_video_blob = _first_matching_video_blob(azure_service, container_name, storage_prefix)
        if existing_video_blob and not args.overwrite:
            skipped_existing += 1
            logger.info("Skipping %s because %s already exists", route_path, existing_video_blob)
            continue

        try:
            frame_blobs = [
                getattr(blob, "name", "")
                for blob in azure_service.list_blobs(container_name, f"{storage_prefix}/orig")
                if _is_frame_blob(getattr(blob, "name", ""))
            ]
        except ResourceNotFoundError:
            skipped_missing_container += 1
            logger.warning(
                "Skipping %s because container %s does not exist",
                route_path,
                container_name,
            )
            continue
        frame_blobs.sort(key=_frame_sort_key)

        if not frame_blobs:
            skipped_missing_frames += 1
            logger.warning("Skipping %s because no orig frames were found", route_path)
            continue

        temp_dir = tempfile.mkdtemp(prefix="dataset_video_backfill_")
        raw_video_path = os.path.join(temp_dir, "raw.mp4")
        final_video_path = os.path.join(temp_dir, f"{dataset['dataset_name']}.mp4")
        output_blob_name = f"{storage_prefix}/video/{dataset['dataset_name']}.mp4"

        try:
            first_frame = _load_frame_from_blob(azure_service, container_name, frame_blobs[0])
            height, width = first_frame.shape[:2]
            writer = ProcessingService._open_mp4_writer(raw_video_path, fps, width, height)
            try:
                for blob_name in frame_blobs:
                    frame = _load_frame_from_blob(azure_service, container_name, blob_name)
                    if frame.shape[1] != width or frame.shape[0] != height:
                        frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
                    writer.write(frame)
            finally:
                writer.release()

            ProcessingService._resize_video_to_dimensions(
                input_path=raw_video_path,
                output_path=final_video_path,
                width=width,
                height=height,
                fps=fps,
            )

            with open(final_video_path, "rb") as handle:
                azure_service.get_container_client(container_name).upload_blob(
                    name=output_blob_name,
                    data=handle,
                    overwrite=True,
                    content_settings=ContentSettings(content_type="video/mp4"),
                )

            first_frame_doc = azure_service.get_cosmos_doc_for_blob(container_name, frame_blobs[0]) or {}
            existing_doc = azure_service.get_cosmos_doc_for_blob(container_name, output_blob_name) or {}
            if not existing_doc:
                existing_doc = _existing_video_doc(azure_service, container_name, storage_prefix) or {}

            misc_tags = list(existing_doc.get("miscTags", []))
            if "video" not in misc_tags:
                misc_tags.append("video")

            azure_service.upsert_cosmos_item(
                {
                    "id": existing_doc.get("id", os.urandom(16).hex()),
                    "docType": "video_annotation",
                    "containerName": container_name,
                    "datasetName": storage_prefix,
                    "datasetId": dataset["id"],
                    "ownerUserId": dataset["owner_user_id"],
                    "visibility": dataset["visibility"],
                    "sourceDatasetId": dataset.get("source_dataset_id"),
                    "view": "video",
                    "frameName": os.path.basename(output_blob_name),
                    "blobPath": output_blob_name,
                    "date": first_frame_doc.get("date", ""),
                    "frameId": None,
                    "width": width,
                    "height": height,
                    "miscTags": misc_tags,
                    "task": str(first_frame_doc.get("task") or dataset.get("task") or ""),
                    "VLM_tags": existing_doc.get("VLM_tags", []),
                    "VLM_tags_by_prompt": existing_doc.get("VLM_tags_by_prompt", {}),
                    "VLM_effective_prompts": existing_doc.get("VLM_effective_prompts", {}),
                    "VLM_last_prompt_label": existing_doc.get("VLM_last_prompt_label"),
                    "vlm": existing_doc.get("vlm"),
                    "sharpnessScore": None,
                    "clear": None,
                    "fps": fps,
                    "frameCount": len(frame_blobs),
                    "sourceType": "video_backfill",
                }
            )

            processed += 1
            logger.info("Backfilled playable video for %s -> %s", route_path, output_blob_name)
        finally:
            try:
                if os.path.exists(raw_video_path):
                    os.remove(raw_video_path)
            except OSError:
                pass
            try:
                if os.path.exists(final_video_path):
                    os.remove(final_video_path)
            except OSError:
                pass
            try:
                os.rmdir(temp_dir)
            except OSError:
                pass

    print(
        f"Backfill complete. processed={processed} skipped_existing={skipped_existing} "
        f"skipped_missing_frames={skipped_missing_frames} "
        f"skipped_missing_container={skipped_missing_container}"
    )


if __name__ == "__main__":
    main()
