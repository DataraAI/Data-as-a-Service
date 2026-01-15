import os
import threading
import json
from flask import Flask, jsonify, Response, stream_with_context, request
from flask_cors import CORS
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, BlobClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta, timezone
import subprocess
import shutil
import sys
import gdown

load_dotenv()

account_name = "datara04749"
account_url = f"https://{account_name}.blob.core.windows.net/"
container_name = "test"

# Parse Account Key from Connection String
conn_str = os.getenv("BLOB_CONNECTION_STRING")
account_key = None
if conn_str:
    try:
        data = dict(item.split('=', 1) for item in conn_str.split(';') if item)
        account_key = data.get('AccountKey')
    except:
        print("Could not parse AccountKey from connection string")

credential = DefaultAzureCredential()
blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
container_client = blob_service_client.get_container_client(container_name)

app = Flask(__name__)
CORS(app)

blob_iter = container_client.walk_blobs(name_starts_with="", delimiter="/")
DATASET_LIST = [item.name.rstrip("/") for item in blob_iter if item.name.endswith("/")]

# Cosmos DB Configuration for the Backend Service (Reader)
COSMOS_ENDPOINT = "https://roboteyeview.documents.azure.com:443/"
COSMOS_DATABASE = "RobotEyeView"
COSMOS_CONTAINER = "imageTags"
COSMOS_KEY = os.getenv("COSMOS_DB_KEY")

from azure.cosmos import CosmosClient 

def get_cosmos_metadata_map(dataset_name):
    """
    Fetches all metadata documents for the given dataset_name from Cosmos DB.
    Returns a dictionary mapping BlobPath -> document.
    """
    metadata_map = {}
    
    try:
        client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
        database = client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client(COSMOS_CONTAINER)
        
        # Select relevant fields using BlobPath as key if possible, or frameName if BlobPath isn't reliable match
        # Upload script sets 'BlobPath' = f"{output_name}/{view}/{filename}" which matches blob.name exactly.
        query = f"SELECT * FROM c WHERE c.datasetName = '{dataset_name}'"
        items = list(container.query_items(query=query, enable_cross_partition_query=True))
        
        print(f"Found {len(items)} Cosmos documents for {dataset_name}")
        
        for item in items:
            # Normalize key
            blob_path = item.get("blobPath")
            if blob_path:
                metadata_map[blob_path] = item
                
        return metadata_map
            
    except Exception as e:
        print(f"Failed to fetch metadata for {dataset_name} from Cosmos: {e}")
        return metadata_map

@app.route("/api/proxy/<path:blob_name>")
def proxy_blob(blob_name):
    try:
        blob_client = container_client.get_blob_client(blob_name)
        stream = blob_client.download_blob()
        
        def generate():
            for chunk in stream.chunks():
                yield chunk

        return Response(stream_with_context(generate()), mimetype="application/octet-stream")
    except Exception as e:
        print(f"Proxy error: {e}")
        return jsonify({"error": str(e)}), 404

@app.route("/api/datasets", methods=["GET"])
def get_datasets():
    try:
        # 1. Try fetching from Cosmos DB to get metadata (timestamps)
        datasets_metadata = []
        try:
            client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
            database = client.get_database_client(COSMOS_DATABASE)
            container = database.get_container_client(COSMOS_CONTAINER)
            
            # Group by DatasetName to get the latest upload timestamp
            # NOTE: "GROUP BY" acts weird on cross-partition queries in some Cosmos configs.
            # We will fetch all (DatasetName, _ts) and aggregate in Python.
            query = "SELECT c.datasetName, c._ts FROM c"
            items = list(container.query_items(query=query, enable_cross_partition_query=True))
            
            # Aggregate max _ts per dataset
            temp_map = {}
            for item in items:
                name = item.get("datasetName")
                ts = item.get("_ts", 0)
                if name:
                    if name not in temp_map or ts > temp_map[name]:
                        temp_map[name] = ts

            for name, ts in temp_map.items():
                datasets_metadata.append({
                    "name": name,
                    "uploaded_at": ts
                })
                    
        except Exception as e:
             print(f"⚠️ Cosmos DB dataset fetch failed: {e}")
        
        # 2. Fallback / Merge with Blob Storage (Source of Truth for existence)
        blob_iter = container_client.walk_blobs(name_starts_with="", delimiter="/")
        blob_datasets = [item.name.rstrip("/") for item in blob_iter if item.name.endswith("/")]
        
        # Merge logic: Create a map of cosmos data
        cosmos_map = {d["name"]: d["uploaded_at"] for d in datasets_metadata}
        
        final_list = []
        for ds_name in blob_datasets:
            final_list.append({
                "name": ds_name,
                "uploaded_at": cosmos_map.get(ds_name, 0) # Default to 0 if not in Cosmos
            })
            
        # Update global list
        global DATASET_LIST
        DATASET_LIST = blob_datasets # Keep string list for simple validation if needed elsewhere? 
        # Actually validation might break if we rely on this. 
        # But get_datasets now returns OBJECTS. Frontend must handle this.
        
        # Sort by uploaded_at desc
        final_list.sort(key=lambda x: x["uploaded_at"], reverse=True)
        
        return jsonify(final_list)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/dataset/<name>", methods=["GET"])
def get_dataset_images(name):
    # Get metadata map from Cosmos
    metadata_map = get_cosmos_metadata_map(name)

    image_list = []
    base_prefix = f"{name}/"
    
    try:
        # List blobs directly from Azure
        blobs = container_client.list_blobs(name_starts_with=base_prefix)
        for blob in blobs:
             is_image = blob.name.lower().endswith(('.png', '.jpg', '.jpeg'))
             is_3d = blob.name.lower().endswith(('.stl', '.obj', ".glb", ".gltf"))

             if is_image or is_3d:
                 # Generate SAS Token
                 sas_token = ""
                 if account_key:
                     sas_token = generate_blob_sas(
                         account_name=account_name,
                         container_name=container_name,
                         blob_name=blob.name,
                         account_key=account_key,
                         permission=BlobSasPermissions(read=True),
                         expiry=datetime.now(timezone.utc) + timedelta(hours=1)
                     )
                 
                 # Get specific metadata for this blob
                 cosmos_doc = metadata_map.get(blob.name, {})
                 
                 # Base tags from Cosmos
                 current_tags = list(cosmos_doc.get("miscTags", []))
                 
                 # ... (Tag logic remains same, mostly applicable to images but fine for 3d) ...
                 if "/orig/" in blob.name:
                     current_tags.append("exocentric")
                 elif "/egos/" in blob.name:
                     current_tags.append("ego_view")
                     try:
                         if "_ego_" in blob.name:
                             fname = os.path.basename(blob.name)
                             parts = fname.split("_ego_")
                             if len(parts) > 1:
                                 ego_name = os.path.splitext(parts[1])[0]
                                 current_tags.append(f"ego_{ego_name}")
                     except:
                         pass

                 if cosmos_doc.get("clear") is True:
                     current_tags.append("clear")
                 elif cosmos_doc.get("clear") is False:
                     current_tags.append("blurry")
                     
                 # Construct full object
                 final_url = f"{account_url}{container_name}/{blob.name}"
                 if sas_token:
                     final_url += f"?{sas_token}"

                 media_type = "3d" if is_3d else "image"

                 if media_type == "3d":
                     print(f"DEBUG 3D URL: {final_url}")

                 image_data = {
                     "id": blob.name,
                     "url": final_url,
                     "proxy_url": f"/api/proxy/{blob.name}",
                     "name": os.path.basename(blob.name),
                     "type": media_type,
                     "tags": list(set(current_tags)), 
                     "metadata": {
                         "uuid": cosmos_doc.get("id"),
                         "date": cosmos_doc.get("date"),
                         "uploaded_at": cosmos_doc.get("_ts"),
                         "frame_id": cosmos_doc.get("frameId"),
                         "width": cosmos_doc.get("width"),
                         "height": cosmos_doc.get("height"),
                         "sharpness": cosmos_doc.get("sharpnessScore"),
                         "view": cosmos_doc.get("view")
                     }
                 }
                 image_list.append(image_data)
                 
                 
    except Exception as e:
         print(f"Error fetching dataset {name}: {e}")
         return jsonify({"error": str(e)}), 500
         
    return jsonify(image_list)




# thread = threading.Thread(target=start_fiftyone, daemon=True)
# thread.start()


@app.route("/api/process_video", methods=["POST"])
def process_video():

    data = request.get_json()
    if not data:
         return {"error": "Invalid JSON body"}, 400

    gdrive_link = data.get("gdrive_link")
    output_name = data.get("output_name")
    
    if not gdrive_link:
        return {"error": "No Google Drive link provided"}, 400
        
    # Check if dataset already exists
    if output_name:
        existing_blobs = list(container_client.list_blobs(name_starts_with=f"{output_name}/", results_per_page=1))
        if existing_blobs:
            return {"error": f"Dataset '{output_name}' already exists."}, 409
        
    # Retrieve Metadata (Date & Tags)
    date_val = data.get("date")
    misc_tags = data.get("tags", [])

    UPLOAD_FOLDER = "uploads"
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Generate temporary filename
    ts = int(datetime.now().timestamp())
    video_filename = f"video_{ts}.mp4"
    video_path = os.path.join(UPLOAD_FOLDER, video_filename)

    try:
        print(f"⬇️ Downloading from GDrive: {gdrive_link}")
        # fuzzy=True allows extracting ID from view links
        downloaded_path = gdown.download(gdrive_link, video_path, quiet=False, fuzzy=True)
        
        if not downloaded_path:
             return {"error": "Download failed or link invalid"}, 400

        # Update path in case gdown changed it (unlikely with output arg but good to be safe)
        video_path = downloaded_path
        
        # Logic to align directory naming
        if output_name:
             video_basename = output_name
        else:
             video_basename = os.path.splitext(os.path.basename(video_path))[0]

        output_dir = os.path.join("dataset_list", video_basename)

        print(f"🔄 Processing video: {video_basename}")
        
        # 1. Process Video (Generate Frames)
        cmd_gen = [
            sys.executable, "generate_orig_frames.py",
            "--video_path", video_path,
            "--output_name", video_basename,
            "--target_fps", "15"
        ]
        print(f"Running gen: {cmd_gen}")
        subprocess.check_call(cmd_gen)
        
        # 2. Upload Frames to Azure and Cosmos DB
        # Matching container name 'test'
        cmd_upload = [
            sys.executable, "upload_frames_to_azure.py",
            "--container_name", "test",
            "--output_name", video_basename,
            "--input_dir", os.path.join("dataset_list", video_basename),
            "--view", "orig",
            "--date", date_val or "",
            "--tags", json.dumps(misc_tags)
        ]
        print(f"Running upload: {cmd_upload}")
        subprocess.check_call(cmd_upload)
        
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        
        if os.path.exists(video_path):
            os.remove(video_path)
            
        return {"message": "Video processed and uploaded successfully"}

    except subprocess.CalledProcessError as e:
        print(f"❌ Script failed: {e}")
        return {"error": f"Script execution failed: {str(e)}"}, 500
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": f"An error occurred: {str(e)}"}, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5151, debug=True, use_reloader=False)
