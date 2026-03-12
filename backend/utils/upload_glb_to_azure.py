"""
Upload image datasets to Azure Blob Storage and Cosmos DB.

Usage example:

python backend/upload_glb_to_azure.py \
    --container_name "bmw" \
    --output_name "bmw_grill" \
    --input_dir "~/Downloads/GLB" \
    --view "3D_gen" \
    --connection_string <AZURE CONNECTION STRING>

Notes:
- Only .glb/.ply files are uploaded
- orig and egos are treated as independent views
- Fully compatible with Windows, macOS, and Linux
- Each frame also gets a document in Cosmos DB
"""

import argparse
import os
import sys

from azure.storage.blob import ContentSettings

# Allow running as python backend/utils/upload_glb_to_azure.py
_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
from utils import azure_client


# ----------------------------
# Argument parsing
# ----------------------------
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Upload 3D datasets to Azure Blob Storage")
    parser.add_argument("--container_name", type=str, required=True, help="Azure container name")
    parser.add_argument("--output_name", type=str, required=True, help="Azure prefix name (can differ from dataset name)")
    parser.add_argument("--input_dir", type=str, required=True, help="Base dataset directory (contains 3D_gen/)")
    parser.add_argument("--view", type=str, choices=["3D_gen"], default="3D_gen", help="Dataset view to upload (default: 3D_gen)")
    parser.add_argument("--connection_string", type=str, default=None, help="Azure Blob Storage connection string (optional if BLOB_CONNECTION_STRING env is set)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_input_dir = os.path.abspath(os.path.expanduser(args.input_dir))
    dataset_name = os.path.basename(os.path.normpath(base_input_dir))
    view = args.view
    input_dir = os.path.join(base_input_dir, view)

    if not os.path.isdir(input_dir):
        raise FileNotFoundError(f"Directory not found: {input_dir}")

    container_client = azure_client.get_blob_container(
        connection_string=args.connection_string,
        container_name=args.container_name,
    )
    azure_client.ensure_blob_container_exists(container_client)

    dataset_prefix = f"{args.output_name}/{view}/"
    existing_blobs = list(container_client.list_blobs(name_starts_with=dataset_prefix))
    if existing_blobs:
        print(
            f"⚠️ Dataset view '{dataset_name}/{view}' already exists in container "
            f"'{args.container_name}'. No files were uploaded."
        )
        return

    valid_extensions = (".glb", ".ply", ".stl")
    uploaded_count = 0

    for filename in os.listdir(input_dir):
        if not filename.lower().endswith(valid_extensions):
            continue

        local_path = os.path.join(input_dir, filename)
        blob_name = f"{args.output_name}/{view}/{filename}".lower()
        _, ext = os.path.splitext(filename)
        if ext and ext[0] == ".":
            ext = ext[1:]

        with open(local_path, "rb") as f:
            container_client.upload_blob(
                name=blob_name,
                data=f,
                overwrite=True,
                content_settings=ContentSettings(content_type="model/" + ext),
            )

        uploaded_count += 1
        print(f"Uploaded ({uploaded_count}): {blob_name}")

    print(
        f"✅ Upload complete — {uploaded_count} 3D files uploaded "
        f"from '{dataset_name}/{view}' to '{args.container_name}'"
    )


if __name__ == "__main__":
    main()
