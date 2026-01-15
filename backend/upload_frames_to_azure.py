"""
Upload image datasets to Azure Blob Storage and Cosmos DB.

Usage example:

python backend/upload_frames_to_azure.py \
  --container_name test-container \
  --output_name test-output \
  --input_dir backend/dataset_list/bmw_front_bumper \
  --view egos \
  --connection_string "<AZURE_CONNECTION_STRING>" \
  --date "20251231" \
  --tags '["tag1", "tag2"]'

Notes:
- Only .jpg/.jpeg/.png files are uploaded
- orig and egos are treated as independent views
- Fully compatible with Windows, macOS, and Linux
- Each frame also gets a document in Cosmos DB
"""

import cv2 
import numpy as np
import os
import json
import argparse 
from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.core.exceptions import ResourceExistsError
from azure.cosmos import CosmosClient
import sys
import uuid


# ----------------------------
# Cosmos DB Configuration
# ----------------------------
COSMOS_ENDPOINT = "https://roboteyeview.documents.azure.com:443/"
COSMOS_DATABASE = "RobotEyeView"
COSMOS_CONTAINER = "imageTags"
COSMOS_KEY = os.getenv("COSMOS_DB_KEY")


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
    required=False,
    help="Azure Blob Storage connection string (optional if BLOB_CONNECTION_STRING env var is set)"
)

parser.add_argument(
    "--date",
    type=str,
    default="",
    help="Upload date (YYYYMMDD)"
)

parser.add_argument(
    "--tags",
    type=str,
    default="[]",
    help="JSON array of tags"
)

args = parser.parse_args()

# Parse tags
try:
    misc_tags = json.loads(args.tags)
except:
    misc_tags = []

# ----------------------------
# Image clarity helper
# ----------------------------
def laplacian_sharpness_score(image_bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(lap.var())
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
# Azure Blob client setup
# ----------------------------
from dotenv import load_dotenv
load_dotenv()

connection_string = args.connection_string or os.getenv("BLOB_CONNECTION_STRING")

if not connection_string:
    raise ValueError("Azure connection string must be provided via --connection_string or BLOB_CONNECTION_STRING environment variable.")

blob_service_client = BlobServiceClient.from_connection_string(connection_string)

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
# Cosmos DB client setup
# ----------------------------
cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
cosmos_database = cosmos_client.get_database_client(COSMOS_DATABASE)
cosmos_container = cosmos_database.get_container_client(COSMOS_CONTAINER)


# ----------------------------
# Check if dataset view already exists
# ----------------------------
dataset_prefix = f"{args.output_name}/{view}/"

existing_blobs = list(
    container_client.list_blobs(name_starts_with=dataset_prefix)
)

if existing_blobs:
    error_msg = f"⚠️ Dataset view '{dataset_name}/{view}' already exists in container '{args.container_name}'. No files were uploaded."
    
    # 1. Print directly to standard error (so the parent process sees it as an error)
    print(error_msg, file=sys.stderr)
    
    # 2. Exit with a non-zero code to tell the backend "I failed"
    sys.exit(1)

# ----------------------------
# Upload images
# ----------------------------
valid_extensions = (".jpg", ".jpeg", ".png")
uploaded_count = 0

for filename in os.listdir(input_dir):
    if not filename.lower().endswith(valid_extensions):
        continue

    local_path = os.path.join(input_dir, filename)
    
    # Clarity check 
    clarity_threshold = 100.0 
    img = cv2.imread(local_path)
    if img is None: 
        sharpness_score = None
        is_clear = False
        height, width = 0, 0
    else: 
        sharpness_score = laplacian_sharpness_score(img)
        is_clear = sharpness_score >= clarity_threshold
        height, width = img.shape[:2]
    
    # Azure blob paths always use forward slashes
    blob_name = f"{args.output_name}/{view}/{filename}"
    
    with open(local_path, "rb") as f:
        container_client.upload_blob(
            name=blob_name,
            data=f,
            overwrite=True,
            content_settings=ContentSettings(content_type="image/png")
        )

    cosmos_view = "exo" if view == "orig" else view
    # frame_id = f"{args.container_name}_{args.output_name}_{view}_{filename}"
    frame_id = uuid.uuid4().hex
    
    # Extract frameId (last part of filename after underscore, before extension)
    # e.g., bmwGrille_001.png -> 001
    try:
        frame_id_val = os.path.splitext(filename)[0].split('_')[-1]
    except:
        frame_id_val = "0"

    metadata_item = {
        "id": frame_id,
        "containerName": args.container_name,
        "datasetName": args.output_name,
        "view": cosmos_view,
        "frameName": filename,
        "blobPath": blob_name,
        "date": args.date,
        "frameId": frame_id_val,
        "width": width,
        "height": height,
        "miscTags": misc_tags,
        "sharpnessScore": sharpness_score,
        "clear": is_clear
    }
    
    try:
        cosmos_container.upsert_item(metadata_item)
    except Exception as e:
        print(f"Failed to upload {filename} metadata to Cosmos: {e}")

    uploaded_count += 1
    print(f"Uploaded ({uploaded_count}): {blob_name}")


print(
    f"✅ Upload complete — {uploaded_count} images uploaded "
    f"from '{dataset_name}/{view}' "
    f"to '{args.container_name}' "
)
print(f"{uploaded_count} documents created in Cosmos DB")
