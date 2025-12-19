import os
import threading
# import random
from flask import Flask #, request, jsonify, send_from_directory
from flask_cors import CORS
import fiftyone as fo
from fiftyone import Sample #, Classification
# from PIL import Image
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

account_url = "https://datara04749.blob.core.windows.net/"
credential = DefaultAzureCredential()
blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
container_client = blob_service_client.get_container_client("bmw")
load_dotenv()
db_password = os.getenv("MONGODB_PASSWORD")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# DATASET_NAME = "BMW"
# DATASET_LIST = ["bmw_grill", "bmw_rear_bumper", "BMW_Rear_Seat", "BMW_Front_Bumper"]
blob_iter = container_client.walk_blobs(name_starts_with="", delimiter='/')
DATASET_LIST = []
for item in blob_iter:
    # Items that represent folders are of type 'BlobPrefix'
    if item.name.endswith('/'):
        DATASET_LIST.append(item.name.rstrip('/'))

app = Flask(__name__)
CORS(app)

print(f"📂 Existing datasets: {fo.list_datasets()}")
for dataset_name in fo.list_datasets():
    fo.delete_dataset(dataset_name)


# is_loaded = False
# if DATASET_NAME in fo.list_datasets():
#     dataset = fo.load_dataset(DATASET_NAME)
#     print(f"📂 Loaded existing dataset: {DATASET_NAME}")
#     is_loaded = True
# else:
#     dataset = fo.Dataset(DATASET_NAME)
#     print(f"✨ Created new dataset: {DATASET_NAME}")


datasets = [fo.Dataset(dataset_name) for dataset_name in DATASET_LIST]


# def assign_demo_labels(ds):
#     weld_shapes = ["round", "square", "irregular"]
#     noise_types = ["low_noise", "medium_noise", "high_noise"]
#     colors = ["red", "blue", "green"]

#     for sample in ds:
#         if not sample.tags:  # Only assign if tags empty
#             chosen_labels = [
#                 random.choice(weld_shapes),
#                 random.choice(noise_types),
#                 random.choice(colors),
#             ]
#             sample.tags.extend(chosen_labels)
#             sample.save()

# # assign_demo_labels(dataset)
# print("✅ Demo labels ensured!")


def add_folder_images(base_path_id):
    base_path = DATASET_LIST[base_path_id]
    dataset = datasets[base_path_id]
    print(f"base_path: {base_path}")

    base_dir = os.path.join("dataset_list", base_path)
    if not os.path.exists(base_dir):
        return
    orig_dir = os.path.join(base_dir, "orig")
    if not os.path.exists(orig_dir):
        return
    egos_dir = os.path.join(base_dir, "egos")
    for file_path in os.listdir(orig_dir):
        basename, ext = os.path.splitext(file_path)
        if ext in [".jpg", ".jpeg", ".png"]:
            sample = Sample(
                filepath=os.path.join(orig_dir, file_path),
                tags=["exocentric"],
                frameID=int(basename[basename.index(base_path) + len(base_path) + 1 :])
            )
            dataset.add_sample(sample)
    for file_path in os.listdir(egos_dir):
        basename, ext = os.path.splitext(file_path)
        if ext in [".jpg", ".jpeg", ".png"]:
            egoInd = basename.index("_ego_")
            tagName = "ego_" + basename[egoInd + 5 : ]
            sample = Sample(
                filepath=os.path.join(egos_dir, file_path),
                tags=[tagName],
                frameID=int(basename[basename.index(base_path) + len(base_path) + 1 : egoInd])
            )
            dataset.add_sample(sample)

# for i in range(len(DATASET_LIST)):
#     add_folder_images(i)

# print(f"✅ {DATASET_LIST[0]} has {len([s for s in datasets[0]])} samples")
# print(f"✅ {DATASET_LIST[1]} has {len([s for s in datasets[1]])} samples")



# ----------------------------
# Launch FiftyOne
# ----------------------------
# def start_fiftyone():
#     fo.launch_app(datasets[0], port=5151, remote=True, address="127.0.0.1")
#     fo.launch_app(datasets[1], port=5151, remote=True, address="127.0.0.1")

# thread = threading.Thread(target=start_fiftyone, daemon=True)
# thread.start()
# thread.join()
# print("✅ FiftyOne launching on http://127.0.0.1:5151")

# # ----------------------------
# # Serve images for React
# # ----------------------------
# @app.route("/datasets/<path:filename>")
# def serve_dataset_image(filename):
#     return send_from_directory(os.path.join("dataset_list", "bmw_grill"), filename)

# @app.route("/list_images")
# def list_images():
#     folder = request.args.get("folder")  # e.g., "train/images/good"
#     folder_path = os.path.join("dataset_list", "bmw_grill", folder)
#     if not os.path.exists(folder_path):
#         return jsonify([])
#     files = [f for f in os.listdir(folder_path) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
#     return jsonify(files)

# # ----------------------------
# # Upload route
# # ----------------------------
# @app.route("/upload", methods=["POST"])
# def upload_file():
#     if "file" not in request.files:
#         return {"error": "No file part"}, 400
#     file = request.files["file"]
#     if file.filename == "":
#         return {"error": "No selected file"}, 400

#     filepath = os.path.join(UPLOAD_FOLDER, file.filename)
#     file.save(filepath)

#     if not any(s.filepath == filepath for s in dataset):
#         sample = Sample(filepath=filepath, ground_truth=Classification(label="unlabeled"))
#         dataset.add_sample(sample)
#         # assign_demo_labels(dataset)

#     return {"message": "File uploaded", "filename": file.filename, "label": "unlabeled"}

# # ----------------------------
# # Stats route
# # ----------------------------
# @app.route("/stats", methods=["GET"])
# def get_stats():
#     total_size = sum(os.path.getsize(s.filepath) for s in dataset) / 1e6
#     return jsonify({
#         "active_users": 1,
#         "total_datasets": 10,
#         "api_calls_today": 120,
#         "storage_used": f"{total_size:.2f} MB"
#     })

# ----------------------------
# Run Flask
# ----------------------------

def access_blobs():
    container_name = "bmw"  # Replace with your container name
    container_client = blob_service_client.get_container_client(container_name)

    print(f"Listing blobs in container '{container_name}':")
    for blob in container_client.list_blobs():
        print(f"- {blob.name}")

if __name__ == "__main__":
    # app.run(host="127.0.0.1", port=5050, debug=True, use_reloader=False)
    access_blobs()
