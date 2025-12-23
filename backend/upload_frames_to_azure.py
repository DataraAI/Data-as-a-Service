import os
import argparse
from azure.storage.blob import BlobServiceClient

# ----------------------------
# Configuration
# ----------------------------
CONTAINER_NAME = "bmw"

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
args = parser.parse_args()

# ----------------------------
# Azure authentication
# ----------------------------
connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
if connection_string is None:
    raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is not set")

blob_service_client = BlobServiceClient.from_connection_string(
    connection_string
)

container_client = blob_service_client.get_container_client(CONTAINER_NAME)
try:
    container_client.create_container()
except Exception:
    pass  # container already exists

# ----------------------------
# Locate dataset images
# ----------------------------
orig_dir = os.path.join(
    "backend",
    "dataset_list",
    args.output_name,
    "orig"
)

if not os.path.isdir(orig_dir):
    raise FileNotFoundError(f"Directory not found: {orig_dir}")

# ----------------------------
# Upload all images in dataset
# ----------------------------
image_count = 0

for filename in os.listdir(orig_dir):
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        continue

    file_path = os.path.join(orig_dir, filename)
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

