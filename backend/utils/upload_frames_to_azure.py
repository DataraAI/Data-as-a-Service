"""Upload dataset frames to Azure Blob Storage and write Cosmos metadata."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from typing import Any

import cv2
import numpy as np
from azure.storage.blob import ContentSettings

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from utils import azure_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Upload dataset images to Azure Blob Storage")
    parser.add_argument("--container_name", required=True)
    parser.add_argument("--output_name", required=True, help="Storage prefix (category/brand/dataset)")
    parser.add_argument(
        "--input_dir",
        required=True,
        help="Local directory containing orig/egos/corner_images_controlnet and optional video/",
    )
    parser.add_argument("--view", choices=["orig", "egos", "corner_images_controlnet"], default="orig")
    parser.add_argument("--connection_string", required=False)
    parser.add_argument("--date", default="")
    parser.add_argument("--tags", default="[]")
    parser.add_argument("--task", default="")
    parser.add_argument("--dataset_id", required=True)
    parser.add_argument("--owner_user_id", required=True)
    parser.add_argument("--visibility", choices=["private", "public"], required=True)
    parser.add_argument("--source_dataset_id", default="")
    parser.add_argument("--create_video_annotation", action="store_true")
    return parser.parse_args()


def laplacian_sharpness_score(image_bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(lap.var())


def extract_frame_id_from_filename(filename: str) -> str | None:
    base = os.path.basename(filename)
    stem = os.path.splitext(base)[0]
    if stem.isdigit():
        return stem
    match = re.search(r"_(\d+)(?:_|$)", stem)
    return match.group(1) if match else None


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


def _query_existing_doc(cosmos_container, container_name: str, blob_path: str) -> dict[str, Any]:
    query = "SELECT * FROM c WHERE c.containerName = @cn AND c.blobPath = @bp"
    items = list(
        cosmos_container.query_items(
            query=query,
            parameters=[{"name": "@cn", "value": container_name}, {"name": "@bp", "value": blob_path}],
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else {}


def _query_existing_video_doc(cosmos_container, container_name: str, dataset_name: str) -> dict[str, Any]:
    query = "SELECT * FROM c WHERE c.containerName = @cn AND c.datasetName = @dn AND c.docType = @dt"
    items = list(
        cosmos_container.query_items(
            query=query,
            parameters=[
                {"name": "@cn", "value": container_name},
                {"name": "@dn", "value": dataset_name},
                {"name": "@dt", "value": "video_annotation"},
            ],
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else {}


def _video_content_type(filename: str) -> str:
    lower_name = filename.lower()
    if lower_name.endswith(".webm"):
        return "video/webm"
    if lower_name.endswith(".mov"):
        return "video/quicktime"
    return "video/mp4"


def _collect_video_metadata(local_path: str) -> dict[str, Any]:
    capture = cv2.VideoCapture(local_path)
    if not capture.isOpened():
        return {
            "width": None,
            "height": None,
            "fps": None,
            "frame_count": None,
        }

    try:
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0) or None
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0) or None
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0) or None
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0) or None
    finally:
        capture.release()

    return {
        "width": width,
        "height": height,
        "fps": fps,
        "frame_count": frame_count,
    }


def _upload_video_assets(
    *,
    args: argparse.Namespace,
    base_input_dir: str,
    dataset_prefix: str,
    container_client,
    cosmos_container,
    misc_tags: list[str],
    resolved_task: str,
) -> int:
    video_dir = os.path.join(base_input_dir, "video")
    if not os.path.isdir(video_dir):
        raise FileNotFoundError(f"Expected staged video directory at {video_dir}")

    valid_extensions = (".mp4", ".mov", ".m4v", ".webm")
    uploaded_count = 0

    for filename in sorted(os.listdir(video_dir)):
        if not filename.lower().endswith(valid_extensions):
            continue

        local_path = os.path.join(video_dir, filename)
        blob_name = f"{dataset_prefix}/video/{filename}"
        with open(local_path, "rb") as handle:
            container_client.upload_blob(
                name=blob_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(content_type=_video_content_type(filename)),
            )

        existing_doc = _query_existing_doc(cosmos_container, args.container_name, blob_name)
        video_metadata = _collect_video_metadata(local_path)
        cosmos_container.upsert_item(
            {
                "id": existing_doc.get("id", uuid.uuid4().hex),
                "docType": "video_annotation",
                "containerName": args.container_name,
                "datasetName": dataset_prefix,
                "datasetId": args.dataset_id,
                "ownerUserId": args.owner_user_id,
                "visibility": args.visibility,
                "sourceDatasetId": args.source_dataset_id or None,
                "view": "video",
                "frameName": filename,
                "blobPath": blob_name,
                "date": args.date,
                "frameId": None,
                "width": video_metadata["width"],
                "height": video_metadata["height"],
                "miscTags": list(dict.fromkeys([*misc_tags, "video"])),
                "task": resolved_task,
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
        uploaded_count += 1
        print(f"Uploaded video ({uploaded_count}): {blob_name}")

    if uploaded_count == 0:
        raise FileNotFoundError(f"No staged video files were found in {video_dir}")

    return uploaded_count


def main() -> None:
    args = parse_args()
    try:
        misc_tags = json.loads(args.tags)
        if not isinstance(misc_tags, list):
            misc_tags = []
    except Exception:
        misc_tags = []

    base_input_dir = os.path.abspath(os.path.expanduser(args.input_dir))
    view = args.view
    input_dir = os.path.join(base_input_dir, view)
    if not os.path.isdir(input_dir):
        raise FileNotFoundError(f"Directory not found: {input_dir}")

    container_client = azure_client.get_blob_container(
        connection_string=args.connection_string,
        container_name=args.container_name,
    )
    azure_client.ensure_blob_container_exists(container_client)
    cosmos_container = azure_client.get_cosmos_container()

    valid_extensions = (".jpg", ".jpeg", ".png", ".webp")
    uploaded_count = 0
    resolved_task = resolve_task(args.task, args.output_name)
    dataset_prefix = args.output_name.rstrip("/")

    for filename in sorted(os.listdir(input_dir)):
        if not filename.lower().endswith(valid_extensions):
            continue

        local_path = os.path.join(input_dir, filename)
        img = cv2.imread(local_path)
        if img is None:
            sharpness_score = None
            is_clear = False
            height, width = 0, 0
        else:
            sharpness_score = laplacian_sharpness_score(img)
            is_clear = sharpness_score >= 100.0
            height, width = img.shape[:2]

        blob_name = f"{dataset_prefix}/{view}/{filename}"
        with open(local_path, "rb") as handle:
            container_client.upload_blob(
                name=blob_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(
                    content_type="image/png" if filename.lower().endswith(".png") else "image/jpeg"
                ),
            )

        cosmos_view = "exo" if view == "orig" else view
        existing_doc = _query_existing_doc(cosmos_container, args.container_name, blob_name)
        metadata_item = {
            "id": existing_doc.get("id", uuid.uuid4().hex),
            "docType": "frame_annotation",
            "containerName": args.container_name,
            "datasetName": dataset_prefix,
            "datasetId": args.dataset_id,
            "ownerUserId": args.owner_user_id,
            "visibility": args.visibility,
            "sourceDatasetId": args.source_dataset_id or None,
            "view": cosmos_view,
            "frameName": filename,
            "blobPath": blob_name,
            "date": args.date,
            "frameId": extract_frame_id_from_filename(filename),
            "width": width,
            "height": height,
            "miscTags": misc_tags,
            "task": resolved_task,
            "VLM_tags": existing_doc.get("VLM_tags", []),
            "VLM_tags_by_prompt": existing_doc.get("VLM_tags_by_prompt", {}),
            "VLM_effective_prompts": existing_doc.get("VLM_effective_prompts", {}),
            "VLM_last_prompt_label": existing_doc.get("VLM_last_prompt_label"),
            "vlm": existing_doc.get("vlm"),
            "sharpnessScore": sharpness_score,
            "clear": is_clear,
        }

        cosmos_container.upsert_item(metadata_item)
        uploaded_count += 1
        print(f"Uploaded ({uploaded_count}): {blob_name}")

    if args.create_video_annotation:
        _upload_video_assets(
            args=args,
            base_input_dir=base_input_dir,
            dataset_prefix=dataset_prefix,
            container_client=container_client,
            cosmos_container=cosmos_container,
            misc_tags=misc_tags,
            resolved_task=resolved_task,
        )

    print(
        f"Upload complete - {uploaded_count} images uploaded "
        f"from '{dataset_prefix}/{view}' to '{args.container_name}'"
    )


if __name__ == "__main__":
    main()
