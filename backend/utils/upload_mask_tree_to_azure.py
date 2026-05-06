"""Upload prompt-scoped instance mask folders into Azure Blob Storage and Cosmos metadata."""

from __future__ import annotations

import argparse
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any

import cv2
from azure.storage.blob import ContentSettings

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from utils import azure_client


VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Upload recursive instance mask outputs to Azure")
    parser.add_argument("--container_name", required=True)
    parser.add_argument("--target_prefix", required=True, help="Destination blob prefix under the dataset root")
    parser.add_argument("--dataset_prefix", required=True, help="Root dataset storage prefix (category/brand/dataset)")
    parser.add_argument("--input_dir", required=True, help="Local directory containing prompt-level instance folders")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--dataset_id", required=True)
    parser.add_argument("--owner_user_id", required=True)
    parser.add_argument("--visibility", choices=["private", "public"], required=True)
    parser.add_argument("--source_dataset_id", default="")
    parser.add_argument("--task", default="")
    parser.add_argument("--connection_string", required=False)
    return parser.parse_args()


def laplacian_sharpness_score(image_bgr: Any) -> float:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(lap.var())


def extract_frame_id_from_filename(filename: str) -> str | None:
    stem = Path(filename).stem
    if stem.isdigit():
        return stem
    match = re.search(r"_(\d+)(?:_|$)", stem)
    return match.group(1) if match else None


def query_existing_doc(cosmos_container: Any, container_name: str, blob_path: str) -> dict[str, Any]:
    query = "SELECT * FROM c WHERE c.containerName = @cn AND c.blobPath = @bp"
    items = list(
        cosmos_container.query_items(
            query=query,
            parameters=[{"name": "@cn", "value": container_name}, {"name": "@bp", "value": blob_path}],
            enable_cross_partition_query=True,
        )
    )
    return items[0] if items else {}


def content_type_for_suffix(suffix: str) -> str:
    if suffix == ".png":
        return "image/png"
    if suffix == ".webp":
        return "image/webp"
    return "image/jpeg"


def extract_object_id(relative_path: str) -> str | None:
    parts = relative_path.split("/")
    if len(parts) < 2:
        return None
    folder_name = parts[0].strip()
    if not folder_name:
        return None
    return folder_name[len("object_") :] if folder_name.startswith("object_") else folder_name


def main() -> None:
    args = parse_args()
    input_root = Path(args.input_dir).expanduser().resolve()
    if not input_root.is_dir():
        raise FileNotFoundError(f"Directory not found: {input_root}")

    container_client = azure_client.get_blob_container(
        connection_string=args.connection_string,
        container_name=args.container_name,
    )
    azure_client.ensure_blob_container_exists(container_client)
    cosmos_container = azure_client.get_cosmos_container()

    uploaded_count = 0
    target_prefix = args.target_prefix.rstrip("/")
    dataset_prefix = args.dataset_prefix.rstrip("/")

    for local_path in sorted(input_root.rglob("*")):
        suffix = local_path.suffix.lower()
        if not local_path.is_file() or suffix not in VALID_EXTENSIONS:
            continue

        relative_path = local_path.relative_to(input_root).as_posix()
        object_id = extract_object_id(relative_path)
        if not object_id:
            continue

        blob_name = f"{target_prefix}/{relative_path}"
        image = cv2.imread(str(local_path), cv2.IMREAD_UNCHANGED)
        if image is None:
            sharpness_score = None
            is_clear = False
            height, width = 0, 0
        else:
            if image.ndim == 2:
                image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
            elif image.shape[2] == 4:
                image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
            sharpness_score = laplacian_sharpness_score(image)
            is_clear = sharpness_score >= 100.0
            height, width = image.shape[:2]

        with open(local_path, "rb") as handle:
            container_client.upload_blob(
                name=blob_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type_for_suffix(suffix)),
            )

        existing_doc = query_existing_doc(cosmos_container, args.container_name, blob_name)
        misc_tags = [
            "mask",
            "generated_mask",
            "instance_mask",
            args.prompt,
            f"object_{object_id}",
        ]

        metadata_item = {
            "id": existing_doc.get("id", uuid.uuid4().hex),
            "docType": "frame_annotation",
            "containerName": args.container_name,
            "datasetName": dataset_prefix,
            "datasetId": args.dataset_id,
            "ownerUserId": args.owner_user_id,
            "visibility": args.visibility,
            "sourceDatasetId": args.source_dataset_id or None,
            "view": "masks",
            "maskPrompt": args.prompt,
            "maskObjectId": object_id,
            "frameName": local_path.name,
            "blobPath": blob_name,
            "date": existing_doc.get("date", ""),
            "frameId": extract_frame_id_from_filename(local_path.name),
            "width": width,
            "height": height,
            "miscTags": list(dict.fromkeys(tag for tag in misc_tags if tag)),
            "task": args.task or "",
            "VLM_tags": existing_doc.get("VLM_tags", []),
            "VLM_tags_by_prompt": existing_doc.get("VLM_tags_by_prompt", {}),
            "VLM_effective_prompts": existing_doc.get("VLM_effective_prompts", {}),
            "VLM_last_prompt_label": existing_doc.get("VLM_last_prompt_label"),
            "vlm": existing_doc.get("vlm"),
            "sharpnessScore": sharpness_score,
            "clear": is_clear,
            "sourceType": existing_doc.get("sourceType"),
            "frameCount": existing_doc.get("frameCount"),
            "fps": existing_doc.get("fps"),
        }
        cosmos_container.upsert_item(metadata_item)
        uploaded_count += 1
        print(f"Uploaded ({uploaded_count}): {blob_name}")

    print(f"Upload complete - {uploaded_count} mask assets uploaded to '{target_prefix}'")


if __name__ == "__main__":
    main()
