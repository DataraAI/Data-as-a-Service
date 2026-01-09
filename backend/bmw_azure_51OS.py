import os
import threading
import json
from flask import Flask, jsonify
from flask_cors import CORS
# import fiftyone as fo
# from fiftyone import Sample
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, BlobClient
from azure.cosmos import CosmosClient 

load_dotenv()

account_name = "datara04749"
account_url = f"https://{account_name}.blob.core.windows.net/"
container_name = "test"

credential = DefaultAzureCredential()
blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
container_client = blob_service_client.get_container_client(container_name)

# Cosmos DB Configuration for the Backend Service (Reader)
COSMOS_ENDPOINT = "https://roboteyeview.documents.azure.com:443/"
COSMOS_DATABASE = "RobotEyeView"
COSMOS_CONTAINER = "imageTags"
COSMOS_KEY = os.getenv("COSMOS_DB_KEY")

blob_iter = container_client.walk_blobs(name_starts_with="", delimiter="/")
DATASET_LIST = [item.name.rstrip("/") for item in blob_iter if item.name.endswith("/")]

app = Flask(__name__)
CORS(app)

# print(f"Clearing existing datasets: {fo.list_datasets()}")
# for d_name in fo.list_datasets():
#     fo.delete_dataset(d_name)

# datasets = [fo.Dataset(name) for name in DATASET_LIST]

LOCAL_ROOT = "testing_data"


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
        
        # Select relevant fields using BlobPath as key if possible, or FrameName if BlobPath isn't reliable match
        # Upload script sets 'BlobPath' = f"{output_name}/{view}/{filename}" which matches blob.name exactly.
        query = f"SELECT * FROM c WHERE c.DatasetName = '{dataset_name}'"
        items = list(container.query_items(query=query, enable_cross_partition_query=True))
        
        print(f"Found {len(items)} Cosmos documents for {dataset_name}")
        
        for item in items:
            # Normalize key
            blob_path = item.get("BlobPath")
            if blob_path:
                metadata_map[blob_path] = item
                
        return metadata_map
            
    except Exception as e:
        print(f"⚠️ Failed to fetch metadata for {dataset_name} from Cosmos: {e}")
        return metadata_map


# for i in range(len(DATASET_LIST)):
#     add_folder_images(i)


def start_fiftyone():
    try:
        if datasets:
            session = fo.launch_app(datasets[0], port=5151, remote=True, address="127.0.0.1")
            session.wait()
    except Exception as e:
        print(f"FiftyOne launch failed (expected if port in use): {e}")

@app.route("/api/datasets", methods=["GET"])
def get_datasets():
    return jsonify(DATASET_LIST)

@app.route("/api/dataset/<name>", methods=["GET"])
def get_dataset_images(name):
    if name not in DATASET_LIST:
        return jsonify({"error": "Dataset not found"}), 404
        
    # Get metadata map from Cosmos
    metadata_map = get_cosmos_metadata_map(name)

    image_list = []
    base_prefix = f"{name}/"
    
    try:
        # List blobs directly from Azure
        blobs = container_client.list_blobs(name_starts_with=base_prefix)
        for blob in blobs:
             if blob.name.endswith(('.png', '.jpg', '.jpeg')):
                 # Get specific metadata for this blob
                 cosmos_doc = metadata_map.get(blob.name, {})
                 
                 # Base tags from Cosmos (MiscTags)
                 current_tags = list(cosmos_doc.get("MiscTags", []))
                 
                 # Add derived tags (View)
                 if "/orig/" in blob.name:
                     current_tags.append("exocentric")
                 elif "/egos/" in blob.name:
                     current_tags.append("ego_view")
                     # Extract specific ego name if present
                     try:
                         if "_ego_" in blob.name:
                             # .../name_ego_Left.jpg -> Left
                             # Filename parsing
                             fname = os.path.basename(blob.name)
                             parts = fname.split("_ego_")
                             if len(parts) > 1:
                                 ego_name = os.path.splitext(parts[1])[0]
                                 current_tags.append(f"ego_{ego_name}")
                     except:
                         pass

                 # Add other metadata as tags or separate fields?
                 # User wants "tags". Let's add Sharpness/Clear as tags for now or just pass them as data
                 if cosmos_doc.get("Clear") is True:
                     current_tags.append("clear")
                 elif cosmos_doc.get("Clear") is False:
                     current_tags.append("blurry")
                     
                 # Construct full object
                 image_data = {
                     "id": blob.name,
                     "url": f"{account_url}{container_name}/{blob.name}",
                     "name": os.path.basename(blob.name),
                     "tags": list(set(current_tags)), # Deduplicate
                     # Pass raw metadata for the modal to display
                     "metadata": {
                         "date": cosmos_doc.get("Date"),
                         "sharpness": cosmos_doc.get("SharpnessScore"),
                         "view": cosmos_doc.get("View")
                     }
                 }
                 image_list.append(image_data)

    except Exception as e:
         return jsonify({"error": str(e)}), 500
         
    return jsonify(image_list)




# thread = threading.Thread(target=start_fiftyone, daemon=True)
# thread.start()


@app.route("/api/process_video", methods=["POST"])
def process_video():
    import subprocess
    import shutil
    from flask import request

    if "file" not in request.files:
        return {"error": "No file part"}, 400
    
    file = request.files["file"]
    connection_string = request.form.get("connection_string")
    output_name = request.form.get("output_name")
    
    if file.filename == "":
        return {"error": "No selected file"}, 400
        
    if not connection_string:
        return {"error": "Azure connection string is required"}, 400

    # Retrieve Metadata (Date & Tags)
    date_val = request.form.get("date")
    tags_json = request.form.get("tags", "[]")

    try:
        misc_tags = json.loads(tags_json)
    except:
        misc_tags = []

    UPLOAD_FOLDER = "uploads"
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    video_filename = file.filename
    video_path = os.path.join(UPLOAD_FOLDER, video_filename)
    file.save(video_path)
    
    if output_name:
         video_basename = output_name
    else:
         video_basename = os.path.splitext(video_filename)[0]

    output_dir = os.path.join("dataset_list", video_basename)

    try:
        # 1. Process Video (Generate Frames)
        cmd_gen = [
            "python", "generate_orig_frames.py",
            "--video_path", video_path,
            "--output_name", video_basename
        ]
        subprocess.check_call(cmd_gen)
        
        # 2. Upload Frames to Azure and Cosmos DB
        cmd_upload = [
            "python", "upload_frames_to_azure.py",
            "--container_name", "test",
            "--output_name", video_basename,
            "--input_dir", os.path.join("dataset_list", video_basename),
            "--view", "orig",
            "--connection_string", connection_string,
            "--date", date_val or "",
            "--tags", json.dumps(misc_tags)
        ]
        subprocess.check_call(cmd_upload)
        
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        
        if os.path.exists(video_path):
            os.remove(video_path)
            
        return {"message": "Video processed and uploaded successfully"}

    except subprocess.CalledProcessError as e:
        return {"error": f"Script execution failed: {str(e)}"}, 500
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5151, debug=True, use_reloader=False)
