"""
Upload image datasets to Azure Blob Storage.

Usage example:

python backend/upload_frames_to_azure.py \
  --container_name test-container \
  --output_name test-output \
  --input_dir backend/dataset_list/bmw_front_bumper \
  --view egos \
  --connection_string "<AZURE_CONNECTION_STRING>"

Notes:
- Only .jpg/.jpeg/.png files are uploaded
- orig and egos are treated as independent views
- Fully compatible with Windows, macOS, and Linux
"""

import os
import argparse
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceExistsError


# ----------------------------
# Argument parsing
# ----------------------------
parser = argparse.ArgumentParser(description="Upload dataset images to Azure Blob Storage")

parser.add_argument(
    "--container_name",
    type=str,
    required=True,
    help="Azure container name"
)

parser.add_argument(
    "--output_name",
    type=str,
    required=True,
    help="Azure prefix name (can differ from dataset name)"
)

parser.add_argument(
    "--input_dir",
    type=str,
    required=True,
    help="Base dataset directory (contains orig/ and egos/)"
)

parser.add_argument(
    "--view",
    type=str,
    choices=["orig", "egos"],
    default="orig",
    help="Dataset view to upload (default: orig)"
)

parser.add_argument(
    "--connection_string",
    type=str,
    required=True,
    help="Azure Blob Storage connection string"
)

args = parser.parse_args()


# ----------------------------
# Resolve paths
# ----------------------------
base_input_dir = os.path.abspath(os.path.expanduser(args.input_dir))
dataset_name = os.path.basename(os.path.normpath(base_input_dir))
view = args.view

input_dir = os.path.join(base_input_dir, view)

if not os.path.isdir(input_dir):
    raise FileNotFoundError(f"Directory not found: {input_dir}")


# ----------------------------
# Azure client setup
# ----------------------------
blob_service_client = BlobServiceClient.from_connection_string(
    args.connection_string
)

container_client = blob_service_client.get_container_client(args.container_name)

try:
    if not container_client.exists():
        print(f"Container '{args.container_name}' does not exist. Creating it...")
        container_client.create_container()
    else:
        print(f"Using existing container '{args.container_name}'")
except ResourceExistsError as e:
    if "being deleted" in str(e):
        raise RuntimeError(
            "Container is currently being deleted by Azure. "
            "Wait 1–2 minutes and retry."
        )


# ----------------------------
# Check if dataset view already exists
# ----------------------------
dataset_prefix = f"{args.output_name}/{view}/"

existing_blobs = list(
    container_client.list_blobs(name_starts_with=dataset_prefix)
)

if existing_blobs:
    print(
        f"⚠️ Dataset view '{dataset_name}/{view}' already exists in container "
        f"'{args.container_name}'. No files were uploaded."
    )
    exit(0)


# ----------------------------
# Upload images
# ----------------------------
valid_extensions = (".jpg", ".jpeg", ".png")
uploaded_count = 0

for filename in os.listdir(input_dir):
    if not filename.lower().endswith(valid_extensions):
        continue

    local_path = os.path.join(input_dir, filename)

    # Azure blob paths always use forward slashes
    blob_name = f"{args.output_name}/{view}/{filename}"

    with open(local_path, "rb") as f:
        container_client.upload_blob(
            name=blob_name,
            data=f,
            overwrite=True
        )

    uploaded_count += 1
    print(f"Uploaded ({uploaded_count}): {blob_name}")


print(
    f"✅ Upload complete — {uploaded_count} images uploaded "
    f"from '{dataset_name}/{view}' "
    f"to '{args.container_name}' "
)



