#!/usr/bin/env python3
import argparse
import os
import sys
import uuid

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")

# Default matches the path already used elsewhere in the DaaS repo.
# If your real blob path is spelled differently, pass --dataset.
DEFAULT_DATASET = "warehouse/Symbotic/AVnavigation"
DEFAULT_VIEW = "exo"


def resolve_backend_dir(explicit_backend_dir: str | None) -> str:
    if explicit_backend_dir:
        return os.path.abspath(explicit_backend_dir)

    # Mirror the placement assumption from the existing script:
    # <backend>/scripts/this_script.py -> parent-parent is <backend>
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build_metadata_doc(*, blob_container_name: str, dataset: str, blob_path: str, view: str) -> dict:
    frame_name = os.path.basename(blob_path)
    return {
        "id": uuid.uuid4().hex,
        "docType": "frame_annotation",
        "containerName": blob_container_name,
        "datasetName": dataset,
        "view": view,
        "frameName": frame_name,
        "blobPath": blob_path,
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


def main(*, dataset: str, view: str, write: bool, update_existing: bool, backend_dir: str | None) -> None:
    resolved_backend_dir = resolve_backend_dir(backend_dir)
    if resolved_backend_dir not in sys.path:
        sys.path.insert(0, resolved_backend_dir)

    from utils import azure_client

    blob_container = azure_client.get_blob_container()
    cosmos_container = azure_client.get_cosmos_container()

    print(f"Dataset: {dataset}")
    print(f"View to apply: {view}")
    print(f"Backend dir: {resolved_backend_dir}")

    query = """
    SELECT *
    FROM c
    WHERE c.docType = "frame_annotation"
      AND c.datasetName = @dataset
    """
    existing_docs = list(
        cosmos_container.query_items(
            query=query,
            parameters=[{"name": "@dataset", "value": dataset}],
            enable_cross_partition_query=True,
        )
    )
    existing_by_blob_path = {
        doc["blobPath"]: doc for doc in existing_docs if isinstance(doc, dict) and doc.get("blobPath")
    }

    blobs = list(blob_container.list_blobs(name_starts_with=f"{dataset}/"))

    creates: list[dict] = []
    updates: list[dict] = []
    skipped = 0

    for blob in blobs:
        blob_path = blob.name

        if not blob_path.lower().endswith(IMAGE_EXTS):
            continue

        existing_doc = existing_by_blob_path.get(blob_path)
        if existing_doc is None:
            creates.append(
                build_metadata_doc(
                    blob_container_name=blob_container.container_name,
                    dataset=dataset,
                    blob_path=blob_path,
                    view=view,
                )
            )
            continue

        if not update_existing:
            skipped += 1
            continue

        current_view = existing_doc.get("view")
        if current_view == view:
            skipped += 1
            continue

        updated_doc = dict(existing_doc)
        updated_doc["containerName"] = updated_doc.get("containerName") or blob_container.container_name
        updated_doc["datasetName"] = updated_doc.get("datasetName") or dataset
        updated_doc["frameName"] = updated_doc.get("frameName") or os.path.basename(blob_path)
        updated_doc["view"] = view
        updates.append(updated_doc)

    print("\nSummary")
    print(f"Image blobs found: {sum(1 for blob in blobs if blob.name.lower().endswith(IMAGE_EXTS))}")
    print(f"Create new metadata docs: {len(creates)}")
    print(f"Update existing metadata docs: {len(updates)}")
    print(f"Already fine / skipped: {skipped}")

    if creates:
        print("\nCreate preview")
        for doc in creates[:20]:
            print(f"  CREATE {doc['blobPath']}")

    if updates:
        print("\nUpdate preview")
        for doc in updates[:20]:
            print(f"  UPDATE {doc['blobPath']} -> view={view}")

    if not write:
        print("\nDry run complete. Re-run with --write to apply changes.")
        return

    for doc in creates:
        cosmos_container.upsert_item(doc)

    for doc in updates:
        cosmos_container.upsert_item(doc)

    print("\nWRITE COMPLETE")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create or repair frame metadata so all images in a dataset have view='exo'."
    )
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--view", default=DEFAULT_VIEW)
    parser.add_argument("--backend-dir")
    parser.add_argument("--write", action="store_true")
    parser.add_argument(
        "--skip-existing-updates",
        action="store_true",
        help="Only create missing docs; do not update existing docs that have no view or a different view.",
    )
    args = parser.parse_args()

    main(
        dataset=args.dataset,
        view=args.view,
        write=args.write,
        update_existing=not args.skip_existing_updates,
        backend_dir=args.backend_dir,
    )
