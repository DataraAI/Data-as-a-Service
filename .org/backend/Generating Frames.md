# Generating frames

## Original (exocentric) frames

Below is an example script for generating exocentric frames for an input video file.

```bash
python generate_orig_frames.py \
    --video_path ../../BMW\ Grill.mp4 \
    --output_name bmw_grill
```

## Egocentric frames

Below is an example script for generating egocentric frames, which is done after calling the previous script.

```bash
python generate_egos_frames.py \
    --dataset_name bmw_grill \
    --frame_id 288
```

You can also add a view option, which requires an ego base image to have been generated already:

```bash
python generate_egos_frames.py \
    --dataset_name bmw_grill \
    --frame_id 288 \
    --view_option top_down
```
