from gradio_client import Client, handle_file
import argparse
import shutil
import os


parser = argparse.ArgumentParser()
parser.add_argument("--dataset_name", type=str, help="input dataset name")
parser.add_argument("--frame_id", type=int, help="enter the frame number you want to use")


args = parser.parse_args()
dataset_name = args.dataset_name
frame_id = str(args.frame_id)


dataset_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_list", dataset_name)

if not dataset_path:
    print(f"The dataset path '{dataset_path}' does not exist.")
    exit()

orig_path = os.path.join(dataset_path, "orig")

if not orig_path:
    print(f"The original images path '{orig_path}' does not exist.")
    exit()


ego_path = os.path.join(orig_path, "egos")
os.makedirs(ego_path, exist_ok=True)


custom_cn = "Create an image in the car assembler's perspective, and remove the person."

client = Client("tori29umai/Qwen-Image-2509-MultipleAngles")
output_path, _ = client.predict(
    image=handle_file(os.path.join(orig_path, f"{dataset_name}_{frame_id}.jpg")),
    dropdown_value_cn="__custom__",
    custom_cn=custom_cn,
    extra_prompt="",
    seed=0,
    randomize_seed=True,
    true_guidance_scale=1.0,
    num_inference_steps=4,
    lang="en",
    api_name="/generate_from_dropdown"
)

# Define the source path of the file
source_file = output_path

# Define the destination path (can be a directory or a new file path)
destination_path = os.path.join(ego_path, f"{dataset_name}_{frame_id}_ego_base.jpg")

# Move the file
try:
    shutil.move(source_file, destination_path)
    # print(f"File '{source_file}' moved successfully to '{destination_path}'")
    print(f"Successfully created ego image at {destination_path}")
except FileNotFoundError:
    print(f"Error: Source file '{source_file}' not found.")
    exit()
except Exception as e:
    print(f"An error occurred: {e}")
    exit()



output_path, _ = client.predict(
    image=handle_file(destination_path),
    dropdown_value_cn="Rotate camera 45° left",
    custom_cn="",
    extra_prompt="",
    seed=0,
    randomize_seed=True,
    true_guidance_scale=1.0,
    num_inference_steps=4,
    lang="en",
    api_name="/generate_from_dropdown"
)




output_path, _ = client.predict(
    image=handle_file(destination_path),
    dropdown_value_cn="Rotate camera 45° right",
    custom_cn="",
    extra_prompt="",
    seed=0,
    randomize_seed=True,
    true_guidance_scale=1.0,
    num_inference_steps=4,
    lang="en",
    api_name="/generate_from_dropdown"
)




output_path, _ = client.predict(
    image=handle_file(destination_path),
    dropdown_value_cn="Switch to top-down view",
    custom_cn="",
    extra_prompt="",
    seed=0,
    randomize_seed=True,
    true_guidance_scale=1.0,
    num_inference_steps=4,
    lang="en",
    api_name="/generate_from_dropdown"
)




output_path, _ = client.predict(
    image=handle_file(destination_path),
    dropdown_value_cn="Switch to low-angle view",
    custom_cn="",
    extra_prompt="",
    seed=0,
    randomize_seed=True,
    true_guidance_scale=1.0,
    num_inference_steps=4,
    lang="en",
    api_name="/generate_from_dropdown"
)




