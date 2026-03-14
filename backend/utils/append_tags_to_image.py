"""
Store VLM_tags from a JSON file on the Cosmos DB document for an image (by egoURL).

Usage:
  python append_tags_to_image.py --egoURL <image_blob_url> --json_path <path_to_json>

The JSON file must have a key "VLM_tags" whose value is a list of strings.
Finds the Cosmos document for the image by matching container and blob path from the URL,
then sets the document's "VLM_tags" key to that list, keeping miscTags separate.
"""

import argparse
import json
import os
import sys
from urllib.parse import urlparse

# Allow running as python backend/utils/append_tags_to_image.py
_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
from utils import azure_client


def parse_args():
    p = argparse.ArgumentParser(description="Set VLM_tags from JSON on Cosmos DB document for image URL")
    p.add_argument("--egoURL", required=True, help="Blob URL of the image (used to find Cosmos document)")
    p.add_argument("--json_path", required=True, help="Path to JSON file with VLM_tags list")
    return p.parse_args()


def blob_path_from_url(url: str):
    """Extract container name and blob path from a blob storage URL."""
    parsed = urlparse(url)
    path = (parsed.path or "").strip("/")
    parts = path.split("/")
    if len(parts) < 2:
        raise ValueError(f"Cannot parse blob path from URL: {url}")
    container_name = parts[0]
    blob_path = "/".join(parts[1:])
    return container_name, blob_path


def main():
    args = parse_args()
    if not os.path.isfile(args.json_path):
        print(f"JSON file not found: {args.json_path}", file=sys.stderr)
        sys.exit(1)

    with open(args.json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    vlm_tags = data.get("VLM_tags")
    if not isinstance(vlm_tags, list):
        print("JSON must contain 'VLM_tags' as a list of strings", file=sys.stderr)
        sys.exit(1)
    vlm_tags = [str(t) for t in vlm_tags]

    try:
        container_name, blob_path = blob_path_from_url(args.egoURL)
    except ValueError as e:
        print(e, file=sys.stderr)
        sys.exit(1)

    cosmos_container = azure_client.get_cosmos_container()
    query = "SELECT * FROM c WHERE c.containerName = @cn AND c.blobPath = @bp"
    items = list(
        cosmos_container.query_items(
            query=query,
            parameters=[
                {"name": "@cn", "value": container_name},
                {"name": "@bp", "value": blob_path},
            ],
            enable_cross_partition_query=True,
        )
    )

    if not items:
        print(f"No Cosmos document found for container={container_name}, blobPath={blob_path}", file=sys.stderr)
        sys.exit(1)
    if len(items) > 1:
        print(f"Multiple documents matched; using first. container={container_name}, blobPath={blob_path}", file=sys.stderr)

    doc = items[0]
    doc["VLM_tags"] = vlm_tags

    cosmos_container.upsert_item(doc)
    print(f"Set VLM_tags ({len(vlm_tags)} items) on document {doc['id']}")


if __name__ == "__main__":
    main()
