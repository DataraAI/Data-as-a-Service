import os
# import threading
import json
from flask import Flask, jsonify, Response, stream_with_context, request
from flask_cors import CORS
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta, timezone
import subprocess
import shutil
import sys
import gdown

from azure.cosmos import CosmosClient

import call_lambda_vm

load_dotenv()

account_name = "datara04749"
account_url = f"https://{account_name}.blob.core.windows.net/"
container_name = "roboteyeview"

# 1. Get the connection string
conn_str = os.getenv("BLOB_CONNECTION_STRING")

# 2. Setup the Client
if conn_str:
    print("✅ Found connection string. Using Key-based authentication.")
    # PARSE KEY (Required for your SAS Token logic later)
    try:
        data = dict(item.split('=', 1) for item in conn_str.split(';') if item)
        account_key = data.get('AccountKey')
    except Exception as e:
        print(f"⚠️ Could not parse AccountKey: {e}")
        account_key = None

    # INITIALIZE CLIENT WITH CONNECTION STRING
    blob_service_client = BlobServiceClient.from_connection_string(conn_str)

else:
    # Fallback only if no string is provided
    print("⚠️ No connection string found. Falling back to DefaultAzureCredential.")
    account_key = None
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
    path = request.args.get('path', '')
    if path and not path.endswith('/'):
        path += '/'
        
    try:
        blob_iter = container_client.walk_blobs(name_starts_with=path, delimiter="/")
        
        items = []
        for item in blob_iter:
            # handle prefix (directories)
            if hasattr(item, 'name') and item.name.endswith('/'):
                full_path = item.name.rstrip('/')
                # Calculate relative name
                # item.name is full path with trailing slash e.g. "automotive/bmw/"
                # path is "automotive/"
                relative_name = item.name[len(path):].rstrip('/')
                
                items.append({
                    "name": relative_name,
                    "full_path": full_path,
                    "type": "folder"
                })
        
        return jsonify(items)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/dataset/<path:name>", methods=["GET"])
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
                    except Exception:
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
    upload_type = data.get("upload_type", "video") # video | folder

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
    
    # Generate temporary filename/dirname
    ts = int(datetime.now().timestamp())
    
    # OUTPUT NAME LOGIC
    # Ideally output_name matches the hierarchical path e.g. automotive/bmw/frontGrille
    # For local processing, we use the basename of that (frontGrille) to avoid deep nesting in 'dataset_list'
    # BUT wait, the upload script uses the input directory structure IF it's recursive?
    # No, upload script takes --input_dir.
    # We should stick to:
    # Local: dataset_list/<basename>/orig/... files
    # Remote: <output_name>/orig/... files
    
    if output_name:
        dataset_basename = os.path.basename(output_name) # frontGrille
    else:
        dataset_basename = f"dataset_{ts}"

    # Prepare local processing dir
    local_process_dir = os.path.join("dataset_list", dataset_basename) # dataset_list/frontGrille
    if os.path.exists(local_process_dir):
        shutil.rmtree(local_process_dir)
    os.makedirs(os.path.join(local_process_dir, "orig"), exist_ok=True)

    try:
        print(f"⬇️ Downloading from GDrive ({upload_type}): {gdrive_link}")
        
        if upload_type == "folder":
            # DOWNLOAD FOLDER
            # Create a temp download dir
            temp_download_dir = os.path.join(UPLOAD_FOLDER, f"temp_folder_{ts}")
            os.makedirs(temp_download_dir, exist_ok=True)
            
            downloaded = gdown.download_folder(gdrive_link, output=temp_download_dir, quiet=False, use_cookies=False)
            
            if not downloaded:
                 return {"error": "Folder download failed or link invalid"}, 400

            print("📂 Processing images from folder...")
            
            # Find and rename images to local_process_dir/orig
            # Support common image formats
            valid_exts = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp')
            
            image_files = []
            for root, dirs, files in os.walk(temp_download_dir):
                for file in files:
                    if file.lower().endswith(valid_exts):
                        image_files.append(os.path.join(root, file))
            
            image_files.sort() # Ensure deterministic order
            
            count = 0
            pad_width = len(str(len(image_files)))
            
            for img_path in image_files:
                ext = os.path.splitext(img_path)[1].lower()
                new_filename = f"{dataset_basename}_{count:0{pad_width}d}{ext}"
                dest_path = os.path.join(local_process_dir, "orig", new_filename)
                
                shutil.copy2(img_path, dest_path)
                count += 1
                
            print(f"✅ Prepared {count} images in {local_process_dir}/orig")
            
            # Cleanup temp download
            shutil.rmtree(temp_download_dir)

        else:
            # VIDEO FLOW
            video_filename = f"video_{ts}.mp4"
            video_path = os.path.join(UPLOAD_FOLDER, video_filename)
            
            # fuzzy=True allows extracting ID from view links
            downloaded_path = gdown.download(gdrive_link, video_path, quiet=False, fuzzy=True)
            
            if not downloaded_path:
                 return {"error": "Download failed or link invalid"}, 400
                 
            # 1. Process Video (Generate Frames)
            # generate_orig_frames writes to dataset_list/<dataset_basename>/orig
            # note: generate_orig_frames expects just the name, it builds path relative to its location
            # We already created the dir, but the script might expect to create it.
            
            print(f"🔄 Processing video: {dataset_basename}")
            cmd_gen = [
                sys.executable, "generate_orig_frames.py",
                "--video_path", downloaded_path,
                "--output_name", dataset_basename, 
                "--target_fps", "30"
            ]
            print(f"Running gen: {cmd_gen}")
            subprocess.check_call(cmd_gen)
            
            # Cleanup video
            if os.path.exists(downloaded_path):
                os.remove(downloaded_path)


        # 2. Upload Frames to Azure and Cosmos DB (Common for both flows)
        # dataset_list/<dataset_basename>/orig should now contain the images
        
        cmd_upload = [
            sys.executable, "upload_frames_to_azure.py",
            "--container_name", container_name,
            # The script uses output_name as the blob prefix: automotive/bmw/frontGrille
            "--output_name", output_name if output_name else dataset_basename,
            # The script looks in input_dir/view (e.g. dataset_list/frontGrille/orig)
            "--input_dir", local_process_dir,
            "--view", "orig",
            "--date", date_val or "",
            "--tags", json.dumps(misc_tags)
        ]
        print(f"Running upload: {cmd_upload}")
        subprocess.check_call(cmd_upload)
        
        # Cleanup
        if os.path.exists(local_process_dir):
            shutil.rmtree(local_process_dir)
            
        return {"message": "Data processed and uploaded successfully"}

    except subprocess.CalledProcessError as e:
        print(f"❌ Script failed: {e}")
        return {"error": f"Script execution failed: {str(e)}"}, 500
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": f"An error occurred: {str(e)}"}, 500


@app.route("/api/generate_ego", methods=["POST"])
def generate_ego():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    prompt = data.get("prompt")
    imageURL = data.get("imageURL")
    # Retrieve Metadata (Date & Tags)
    date_val = data.get("date")
    misc_tags = data.get("tags", [])

    blobPath = imageURL[imageURL.index(container_name) : imageURL.index("/orig") + 5]
    blobPathComponents = blobPath.split("/")
    # [roboteyeview, automotive, bmw, frontGrille, orig]
    blobPathComponents[-1] = "egos"
    # [roboteyeview, automotive, bmw, frontGrille, egos]

    try:
        print("Getting localImagePath:\n")
        localImagePath = call_lambda_vm.generate_ego_image(prompt, imageURL, container_name)
        print(f"Retrieved localImagePath: {localImagePath}\n")
        if localImagePath is not None:
            cmd_upload = [
                sys.executable, "upload_frames_to_azure.py",
                "--container_name", container_name,
                # The script uses output_name as the blob prefix: automotive/bmw/frontGrille
                "--output_name", "/".join(blobPathComponents[1:4]),
                # (e.g. 'ego_images/container_name/automotive/bmw/frontGrille/')
                "--input_dir", os.path.dirname(os.path.dirname(localImagePath)),
                "--view", "egos",
                "--date", date_val or "",
                "--tags", json.dumps(misc_tags)
            ]
            print(f"Running ego upload: {cmd_upload}")
            subprocess.check_call(cmd_upload)

            # Cleanup
            shutil.rmtree("ego_images/" + container_name)

        return {"message": "Ego view processed and uploaded successfully"}
    except subprocess.CalledProcessError as e:
        print(f"❌ Script failed: {e}")
        return {"error": f"Generate ego execution failed: {str(e)}"}, 500
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": f"An error occurred: {str(e)}"}, 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5151, debug=True, use_reloader=False)
