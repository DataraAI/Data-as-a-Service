import os
import threading
# import random
from flask import Flask #, request, jsonify, send_from_directory
from flask_cors import CORS
import fiftyone as fo
from fiftyone import Sample #, Classification
# from PIL import Image
from dotenv import load_dotenv


load_dotenv()
db_password = os.getenv("MONGODB_PASSWORD")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# DATASET_NAME = "BMW"
DATASET_LIST = ["bmw_grill", "bmw_rear_bumper", "BMW_Rear_Seat", "BMW_Front_Bumper"]

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
datasets_3d = []


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
    for file_path in os.listdir(orig_dir):
        basename, ext = os.path.splitext(file_path)
        if ext in [".jpg", ".jpeg", ".png"]:
            sample = Sample(
                filepath=os.path.join(orig_dir, file_path),
                tags=["exocentric"],
                frameID=int(basename[basename.index(base_path) + len(base_path) + 1 :])
            )
            dataset.add_sample(sample)
    egos_dir = os.path.join(base_dir, "egos")
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
    mask_dir = os.path.join(base_dir, "mask")
    if os.path.exists(mask_dir):
        for file_path in os.listdir(mask_dir):
            basename, ext = os.path.splitext(file_path)
            if ext in [".jpg", ".jpeg", ".png"]:
                egoInd = basename.index("_ego_")
                maskInd = basename.index("_seg")
                tagName = "ego_" + basename[egoInd + 5 : maskInd] + "_seg"
                sample = Sample(
                    filepath=os.path.join(mask_dir, file_path),
                    tags=[tagName],
                    frameID=int(basename[basename.index(base_path) + len(base_path) + 1 : egoInd])
                )
                dataset.add_sample(sample)
    threeDGen_dir = os.path.join(base_dir, "3d_gen")
    if os.path.exists(threeDGen_dir):
        datasets_3d.append(fo.Dataset(dataset.name + "_3d"))
        for file_path in os.listdir(threeDGen_dir):
            basename, ext = os.path.splitext(file_path)
            if ext in [".glb", ".olb"]:
                egoInd = basename.index("_ego_")
                maskInd = basename.index("_seg_")
                tagName = "ego_" + basename[egoInd + 5 : maskInd] + "_glb"
                mesh = fo.GltfMesh(
                    tagName + "_" + basename[basename.index(base_path) + len(base_path) + 1 : egoInd],
                    os.path.join(file_path)
                )
                mesh.position = [0, 0, 0]
                scene = fo.Scene()
                scene.add(mesh)
                scene.write(os.path.join(threeDGen_dir, "test.fo3d"))
                sample = Sample(
                    filepath=os.path.join(threeDGen_dir, "test.fo3d"),
                    tags=[tagName],
                    frameID=int(basename[basename.index(base_path) + len(base_path) + 1 : egoInd])#,
                )
                datasets_3d[-1].add_sample(sample)

for i in range(len(DATASET_LIST)):
    add_folder_images(i)

print(f"✅ {DATASET_LIST[0]} has {len([s for s in datasets[0]])} samples")
print(f"✅ {DATASET_LIST[1]} has {len([s for s in datasets[1]])} samples")



# ----------------------------
# Launch FiftyOne
# ----------------------------
def start_fiftyone():
    fo.launch_app(datasets[0], port=5151, remote=True, address="127.0.0.1")
    fo.launch_app(datasets[1], port=5151, remote=True, address="127.0.0.1")

thread = threading.Thread(target=start_fiftyone, daemon=True)
thread.start()
thread.join()
print("✅ FiftyOne launching on http://127.0.0.1:5151")

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
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True, use_reloader=False)
