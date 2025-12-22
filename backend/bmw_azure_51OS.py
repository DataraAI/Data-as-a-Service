import os
import threading
from flask import Flask
from flask_cors import CORS
import fiftyone as fo
from fiftyone import Sample
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, BlobClient

load_dotenv()

account_name = "datara04749"
account_url = f"https://{account_name}.blob.core.windows.net/"
container_name = "bmw"

credential = DefaultAzureCredential()
blob_service_client = BlobServiceClient(account_url=account_url, credential=credential)
container_client = blob_service_client.get_container_client(container_name)

blob_iter = container_client.walk_blobs(name_starts_with="", delimiter="/")
DATASET_LIST = [item.name.rstrip("/") for item in blob_iter if item.name.endswith("/")]

app = Flask(__name__)
CORS(app)

print(f"Clearing existing datasets: {fo.list_datasets()}")
for d_name in fo.list_datasets():
    fo.delete_dataset(d_name)

datasets = [fo.Dataset(name) for name in DATASET_LIST]

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

def add_folder_images(base_path_id):
    base_path = DATASET_LIST[base_path_id]
    dataset = datasets[base_path_id]
    print(f"Indexing Azure Blobs for: {base_path}")

    orig_prefix = f"{base_path}/orig/"
    egos_prefix = f"{base_path}/egos/"

    for blob in container_client.list_blobs(name_starts_with=orig_prefix):
        filename = os.path.basename(blob.name)
        _, ext = os.path.splitext(filename)
        if ext.lower() in [".jpg", ".jpeg", ".png"]:
            local_path = download_blob(blob.name, base_path)
            start_idx = blob.name.index(base_path) + len(base_path) + 1
            fid = int("".join(filter(str.isdigit, blob.name[start_idx:])))
            tagName = "original" 
            sample = Sample(
                filepath=local_path,
                tags=[tagName],
                frameID=fid
            )
            dataset.add_sample(sample)

    for blob in container_client.list_blobs(name_starts_with=egos_prefix):
        filename = os.path.basename(blob.name)
        _, ext = os.path.splitext(filename)
        if ext.lower() in [".jpg", ".jpeg", ".png"]:
            local_path = download_blob(blob.name, base_path)
            egoInd = blob.name.index("_ego_")
            tagName = "ego_" + filename[filename.index("_ego_") + 5 :]
            start_idx = blob.name.index(base_path) + len(base_path) + 1
            fid = int("".join(filter(str.isdigit, blob.name[start_idx:egoInd])))
            sample = Sample(
                filepath=local_path,
                tags=[tagName],
                frameID=fid
            )
            dataset.add_sample(sample)

for i in range(len(DATASET_LIST)):
    add_folder_images(i)

print(f"✅ {DATASET_LIST[0]} has {len(datasets[0])} samples")
print(f"✅ {DATASET_LIST[1]} has {len(datasets[1])} samples")
print(f"✅ {DATASET_LIST[2]} has {len(datasets[2])} samples")
print(f"✅ {DATASET_LIST[3]} has {len(datasets[3])} samples")

def start_fiftyone():
    if datasets:
        session = fo.launch_app(datasets[0], port=5151, remote=True, address="127.0.0.1")
        session.wait()

thread = threading.Thread(target=start_fiftyone, daemon=True)
thread.start()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True, use_reloader=False)
