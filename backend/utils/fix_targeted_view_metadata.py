#!/usr/bin/env python3
import argparse
import copy
import json
import os
import re
import sys
import uuid
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(BACKEND_DIR)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from utils import azure_client

HUMANOID_DATASETS = [
    "humanoid/Awign/peelingPeas",
    "humanoid/Awign/washingMachine",
]

SERVERRACK_DATASETS = [
    "serverrack/AnalogDevices/ethernetCable",
    "serverrack/Dell/dataRackInstall",
    "serverrack/Dell/datacenterRack",
    "serverrack/Gigabyte/datacenterRack",
    "serverrack/Gigabyte/datacenterRack2",
    "serverrack/Gigabyte/datacenterRack3",
    "serverrack/NVIDIA/switchTray",
]

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Fix targeted Cosmos metadata for specific humanoid and serverrack datasets."
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Actually apply changes. Omit for dry run.",
    )
    return parser.parse_args()


def extract_frame_id_from_filename(filename: str):
    base = os.path.basename(filename)
    stem = os.path.splitext(base)[0]

    if stem.isdigit():
        return stem

    match = re.search(r"_(\d+)(?:_|$)", stem)
    if match:
        return match.group(1)

    return None


def normalise_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def is_folder_thumbnail_blob(dataset_name: str, blob_name: str) -> bool:
    base_prefix = f"{dataset_name.rstrip('/')}/"
    if not blob_name.startswith(base_prefix):
        return False

    relative_path = blob_name[len(base_prefix):]
    if "/" in relative_path:
        return False

    stem, ext = os.path.splitext(os.path.basename(relative_path))
    if ext.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        return False

    folder_name = os.path.basename(dataset_name.rstrip("/"))
    stem_norm = normalise_token(stem)
    folder_norm = normalise_token(folder_name)

    return stem_norm in {folder_norm, "thumbnail", "folder", "cover"}


def query_frame_docs_for_dataset(cosmos_container, dataset_name: str):
    query = """
    SELECT * FROM c
    WHERE c.docType = @docType
      AND c.datasetName = @datasetName
    """
    return list(
        cosmos_container.query_items(
            query=query,
            parameters=[
                {"name": "@docType", "value": "frame_annotation"},
                {"name": "@datasetName", "value": dataset_name},
            ],
            enable_cross_partition_query=True,
        )
    )


def make_minimal_frame_doc(container_name: str, dataset_name: str, blob_name: str, view: str):
    frame_name = os.path.basename(blob_name)
    return {
        "id": uuid.uuid4().hex,
        "docType": "frame_annotation",
        "containerName": container_name,
        "datasetName": dataset_name,
        "view": view,
        "frameName": frame_name,
        "blobPath": blob_name,
        "date": "",
        "frameId": extract_frame_id_from_filename(frame_name),
        "width": None,
        "height": None,
        "sharpnessScore": None,
        "clear": None,
        "miscTags": [],
        "task": "",
        "VLM_tags": [],
        "VLM_tags_by_prompt": {},
        "VLM_effective_prompts": {},
        "VLM_last_prompt_label": None,
    }


def main():
    args = parse_args()

    blob_container = azure_client.get_blob_container()
    cosmos_container = azure_client.get_cosmos_container()

    humanoid_updates = []
    serverrack_updates = []
    serverrack_creates = []

    print("Collecting humanoid fixes...")
    for dataset_name in HUMANOID_DATASETS:
        docs = query_frame_docs_for_dataset(cosmos_container, dataset_name)
        print(f"  {dataset_name}: {len(docs)} existing frame docs")
        for doc in docs:
            old_view = doc.get("view")
            if old_view != "egos":
                before = copy.deepcopy(doc)
                after = copy.deepcopy(doc)
                after["view"] = "egos"
                humanoid_updates.append({
                    "dataset": dataset_name,
                    "blobPath": doc.get("blobPath"),
                    "before": before,
                    "after": after,
                })

    print("Collecting serverrack fixes...")
    for dataset_name in SERVERRACK_DATASETS:
        docs = query_frame_docs_for_dataset(cosmos_container, dataset_name)
        existing_by_blob = {doc.get("blobPath"): doc for doc in docs if doc.get("blobPath")}
        blobs = list(blob_container.list_blobs(name_starts_with=f"{dataset_name}/"))

        print(f"  {dataset_name}: {len(docs)} existing frame docs, {len(blobs)} blobs under prefix")

        for blob in blobs:
            blob_name = blob.name

            if not blob_name.lower().endswith(IMAGE_EXTS):
                continue

            if is_folder_thumbnail_blob(dataset_name, blob_name):
                continue

            existing_doc = existing_by_blob.get(blob_name)

            if existing_doc is None:
                new_doc = make_minimal_frame_doc(
                    container_name=blob_container.container_name,
                    dataset_name=dataset_name,
                    blob_name=blob_name,
                    view="exo",
                )
                serverrack_creates.append({
                    "dataset": dataset_name,
                    "blobPath": blob_name,
                    "doc": new_doc,
                })
            else:
                old_view = existing_doc.get("view")
                if old_view != "exo":
                    before = copy.deepcopy(existing_doc)
                    after = copy.deepcopy(existing_doc)
                    after["view"] = "exo"
                    serverrack_updates.append({
                        "dataset": dataset_name,
                        "blobPath": blob_name,
                        "before": before,
                        "after": after,
                    })

    print("\nSummary")
    print(f"  Humanoid docs to update to egos: {len(humanoid_updates)}")
    print(f"  Serverrack docs to update to exo: {len(serverrack_updates)}")
    print(f"  Serverrack docs to create: {len(serverrack_creates)}")

    if humanoid_updates:
        print("\nHumanoid updates")
        for item in humanoid_updates[:50]:
            print(f"  UPDATE {item['blobPath']} -> egos")

    if serverrack_updates:
        print("\nServerrack updates")
        for item in serverrack_updates[:50]:
            print(f"  UPDATE {item['blobPath']} -> exo")

    if serverrack_creates:
        print("\nServerrack creates")
        for item in serverrack_creates[:50]:
            print(f"  CREATE {item['blobPath']} -> exo")

    if not args.write:
        print("\nDry run only. Nothing has been written.")
        print("Re-run with --write once the counts and paths look correct.")
        return

    backup = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "humanoid_updates": humanoid_updates,
        "serverrack_updates": serverrack_updates,
        "serverrack_creates": serverrack_creates,
    }
    backup_path = os.path.join(
        REPO_ROOT,
        f"metadata_fix_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(backup, f, indent=2)

    for item in humanoid_updates:
        cosmos_container.upsert_item(item["after"])

    for item in serverrack_updates:
        cosmos_container.upsert_item(item["after"])

    for item in serverrack_creates:
        cosmos_container.upsert_item(item["doc"])

    print("\nWrite complete.")
    print(f"Backup written to: {backup_path}")


if __name__ == "__main__":
    main()
PY
