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

def download_blob(blob_name, base_path):
    rel_path = blob_name.replace(base_path + "/", "")
    local_path = os.path.join(LOCAL_ROOT, base_path, rel_path)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    if not os.path.exists(local_path):
        blob_client = BlobClient(
            account_url=account_url,
            container_name=container_name,
            blob_name=blob_name,
            credential=credential
        )
        with open(local_path, "wb") as f:
            f.write(blob_client.download_blob().readall())
    return local_path

def get_cosmos_metadata(dataset_name):
    """
    Attempts to fetch metadata for the given dataset_name from Cosmos DB.
    Returns a list of tags from matching documents.
    """
    default_tags = []
    
    try:
        client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
        database = client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client(COSMOS_CONTAINER)
        
        query = f"SELECT * FROM c WHERE c.DatasetName = '{dataset_name}'"
        items = list(container.query_items(query=query, enable_cross_partition_query=True))
        
        if items:
            tags = items[0].get("MiscTags", [])
            print(f"Found {len(items)} documents for {dataset_name}, tags: {tags}")
            return tags
        else:
            print(f"No Cosmos documents found for dataset: {dataset_name}")
            return default_tags
            
    except Exception as e:
        print(f"⚠️ Failed to fetch metadata for {dataset_name} from Cosmos: {e}")
        return default_tags

def add_folder_images(base_path_id):
    base_path = DATASET_LIST[base_path_id]
    dataset = datasets[base_path_id]
    print(f"Indexing Azure Blobs for: {base_path}")
    
    db_tags = get_cosmos_metadata(base_path)

    orig_prefix = f"{base_path}/orig/"
    egos_prefix = f"{base_path}/egos/"

    for blob in container_client.list_blobs(name_starts_with=orig_prefix):
        filename = os.path.basename(blob.name)
        basename, ext = os.path.splitext(filename)
        if ext.lower() in [".jpg", ".jpeg", ".png"]:
            local_path = download_blob(blob.name, base_path)
            start_idx = blob.name.index(base_path) + len(base_path) + 1
            fid = int("".join(filter(str.isdigit, blob.name[start_idx:])))
            
            tagName = "exocentric"
            sample_tags = [tagName] + db_tags
            
            sample = Sample(
                filepath=local_path,
                tags=sample_tags,
                frameID=fid
            )
            dataset.add_sample(sample)

    for blob in container_client.list_blobs(name_starts_with=egos_prefix):
        filename = os.path.basename(blob.name)
        basename, ext = os.path.splitext(filename)
        if ext.lower() in [".jpg", ".jpeg", ".png"]:
            local_path = download_blob(blob.name, base_path)
            egoInd = blob.name.index("_ego_")
            
            tagName = "ego_" + filename[filename.index("_ego_") + 5 :]
            sample_tags = [tagName] + db_tags
            
            sample = Sample(
                filepath=local_path,
                tags=sample_tags,
                frameID=fid
            ) 
            dataset.add_sample(sample)
    # dataset.compute_metadata()

# for i in range(len(DATASET_LIST)):
#     add_folder_images(i)

print(f"✅ {DATASET_LIST[0]} has {len(datasets[0])} samples" if len(DATASET_LIST) > 0 else "No datasets found")
print(f"✅ {DATASET_LIST[1]} has {len(datasets[1])} samples" if len(DATASET_LIST) > 1 else "")
print(f"✅ {DATASET_LIST[2]} has {len(datasets[2])} samples" if len(DATASET_LIST) > 2 else "")
print(f"✅ {DATASET_LIST[3]} has {len(datasets[3])} samples" if len(DATASET_LIST) > 3 else "")

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
        
    # Get metadata from Cosmos
    # Get metadata from Cosmos
    db_tags = get_cosmos_metadata(name)

    image_list = []
    base_prefix = f"{name}/"
    
    try:
        # List blobs directly from Azure
        blobs = container_client.list_blobs(name_starts_with=base_prefix)
        for blob in blobs:
             if blob.name.endswith(('.png', '.jpg', '.jpeg')):
                 # Derive tags
                 current_tags = list(db_tags)
                 
                 if "/orig/" in blob.name:
                     current_tags.append("exocentric")
                 elif "/egos/" in blob.name:
                     # try to extract ego name
                     try:
                         filename = os.path.basename(blob.name)
                         if "_ego_" in filename:
                             ego_part = filename.split("_ego_")[1]
                             # Remove extension and potential suffix
                             ego_name = os.path.splitext(ego_part)[0]
                             current_tags.append(f"ego_{ego_name}")
                         else:
                             current_tags.append("ego_view")
                     except:
                         current_tags.append("ego_view")

                 image_list.append({
                     "id": blob.name,
                     "url": f"{account_url}{container_name}/{blob.name}",
                     "name": os.path.basename(blob.name),
                     "tags": current_tags 
                 })
    except Exception as e:
         return jsonify({"error": str(e)}), 500
         
    return jsonify(image_list)




# thread = threading.Thread(target=start_fiftyone, daemon=True)
# thread.start()


@app.route("/process_video", methods=["POST"])
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
