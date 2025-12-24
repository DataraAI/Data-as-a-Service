"""
Upload image datasets to Azure Blob Storage.

Usage example:

python backend/upload_frames_to_azure.py \
  --container_name test \
  --output_name bmw_front_bumper \
  --input_dir backend/dataset_list/bmw_front_bumper/orig \
  --connection_string "<AZURE_CONNECTION_STRING>"

Notes:
- The script will NOT overwrite an existing dataset.
- Only .jpg/.jpeg/.png files are uploaded.
- Change --container_name to upload to a different Azure container.
- Container names can only contain lower case letters, numbers, and hyphens.
"""

import os
import argparse
from azure.storage.blob import BlobServiceClient

# ----------------------------
# Argument parsing
# ----------------------------
parser = argparse.ArgumentParser()
parser.add_argument(
    "--output_name",
    type=str,
    required=True,
    help="Dataset folder name under backend/dataset_list"
)
parser.add_argument(
    "--container_name",
    type=str,
    required=True,
    help="Container name in Azure account"
)
parser.add_argument(
    "--input_dir",
    type=str,
    required=True,
    help="Path to local directory containing images to upload"
)
parser.add_argument(
    "--connection_string",
    type=str,
    required=True,
    help="Microsoft Azure connection string"
)
args = parser.parse_args()

output_name = args.output_name
container_name = args.container_name
input_dir = args.input_dir
connection_string = args.connection_string

blob_service_client = BlobServiceClient.from_connection_string(
    connection_string
)
# ---------------------------
# Create a client object for the specified container
# ---------------------------
container_client = blob_service_client.get_container_client(container_name)

# ---------------------------
# If the container does not exist, create it
# If it does exist, use it as is
# ---------------------------
if not container_client.exists():
    print(f"Container '{container_name}' does not exist. Creating it...")
    container_client.create_container()
else:
    print(f"Using existing container '{container_name}'")

# ----------------------------
# Check if dataset already exists in container
# ----------------------------
dataset_prefix = f"{output_name}/orig/"

existing_blobs = list(
    container_client.list_blobs(name_starts_with=dataset_prefix)
)

if existing_blobs:
    print(
        f"⚠️ Dataset '{output_name}' already exists in container "
        f"'{container_name}'. No files were uploaded."
    )
    exit(0)



if not os.path.isdir(input_dir):
    raise FileNotFoundError(f"Directory not found: {input_dir}")

# ----------------------------
# Upload all images in dataset
# ----------------------------
image_count = 0

for filename in os.listdir(input_dir):
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        continue

    file_path = os.path.join(input_dir, filename)
    blob_name = f"{args.output_name}/orig/{filename}"

    with open(file_path, "rb") as f:
        container_client.upload_blob(
            name=blob_name,
            data=f,
            overwrite=True
        )

    image_count += 1
    print(f"Uploaded ({image_count}): {blob_name}")

print(f"✅ Upload complete — {image_count} images uploaded")

