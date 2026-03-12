import argparse
import cv2
import os
import math

parser = argparse.ArgumentParser()
parser.add_argument("--video_path", type=str, required=True, help="input mp4 path")
parser.add_argument("--output_name", type=str, required=True, help="output name for the directory")
parser.add_argument("--target_fps", type=float, default=1.0, help="how many frames to save per second of video")
parser.add_argument("--output_dir", type=str, default="", help="optional: directory to write frames (must contain orig/); if not set, uses utils/dataset_list/<output_name>")

args = parser.parse_args()
video_path = args.video_path
output_name = args.output_name
target_fps = args.target_fps
output_dir_arg = args.output_dir.strip()

if '~' in video_path:
    video_path = video_path.replace("~", os.path.expanduser("~"))

if not os.path.exists(video_path):
    print(f"File '{video_path}' does not exist.")
    exit()

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"Error: Could not open video at {video_path}")
    exit()

# --- FPS LOGIC START ---
# Get the original video's frame rate
video_fps = cap.get(cv2.CAP_PROP_FPS)
total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

# Calculate how many frames to skip. 
hop_interval = video_fps / target_fps

# Calculate expected number of output frames to determine padding width
# We assume the max frames we can extract is the total video frames
if hop_interval <= 1:
    expected_output_count = total_video_frames
else:
    expected_output_count = math.ceil(total_video_frames / hop_interval)

# Determine the number of zeros needed (e.g., if 1000 frames, width is 4)
pad_width = len(str(expected_output_count))
# --- FPS LOGIC END ---

if output_dir_arg:
    output_dir = os.path.abspath(os.path.expanduser(output_dir_arg))
else:
    directory_name = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(directory_name, "dataset_list", f"{output_name}")

os.makedirs(os.path.join(output_dir, "orig"), exist_ok=True)

frame_id = 0
saved_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Only save the frame if it matches our calculated interval
    if frame_id >= (saved_count * hop_interval):
        # Use :0{pad_width}d to pad the number with zeros
        filename_prefix = os.path.basename(output_name)
        frame_filename = os.path.join(output_dir, "orig", f"{filename_prefix}_{saved_count:0{pad_width}d}.png")
        cv2.imwrite(frame_filename, frame)
        saved_count += 1

    frame_id += 1

print(f"Original Video FPS: {video_fps:.2f}")
print(f"Target FPS: {target_fps}")
print(f"Successfully extracted {saved_count} frames to {output_dir}")

cap.release()
cv2.destroyAllWindows()