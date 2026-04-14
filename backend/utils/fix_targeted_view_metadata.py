#!/usr/bin/env python3
import os
import sys
import uuid

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from utils import azure_client

DATASETS = [
    "serverrack/AnalogDevices/ethernetCable",
    "serverrack/Dell/dataRackInstall",
    "serverrack/Dell/datacenterRack",
    "serverrack/Gigabyte/datacenterRack",
    "serverrack/Gigabyte/datacenterRack2",
    "serverrack/Gigabyte/datacenterRack3",
    "serverrack/NVIDIA/switchTray",
]

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")


def main(write=False):
    blob_container = azure_client.get_blob_container()
    cosmos_container = azure_client.get_cosmos_container()

    total_creates = 0

    for dataset in DATASETS:
        print(f"\nProcessing {dataset}")

        # existing Cosmos docs
        query = """
        SELECT c.blobPath
        FROM c
        WHERE c.docType = "frame_annotation"
          AND c.datasetName = @dataset
        """
        existing = list(
            cosmos_container.query_items(
                query=query,
                parameters=[{"name": "@dataset", "value": dataset}],
                enable_cross_partition_query=True,
            )
        )

        existing_paths = {doc["blobPath"] for doc in existing if doc.get("blobPath")}

        # list blobs
        blobs = list(blob_container.list_blobs(name_starts_with=f"{dataset}/"))

        creates = []

        for blob in blobs:
            name = blob.name

            if not name.lower().endswith(IMAGE_EXTS):
                continue

            if name in existing_paths:
                continue

            frame_name = os.path.basename(name)

            doc = {
                "id": uuid.uuid4().hex,
                "docType": "frame_annotation",
                "containerName": blob_container.container_name,
                "datasetName": dataset,
                "view": "exo",
                "frameName": frame_name,
                "blobPath": name,
                "date": "",
                "frameId": None,
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

            creates.append(doc)

        print(f"  Missing metadata: {len(creates)}")

        for doc in creates[:20]:
            print(f"  CREATE {doc['blobPath']}")

        if write:
            for doc in creates:
                cosmos_container.upsert_item(doc)

        total_creates += len(creates)

    print("\nSummary")
    print(f"Total new metadata docs: {total_creates}")
    print("Dry run" if not write else "WRITE COMPLETE")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    main(write=args.write)