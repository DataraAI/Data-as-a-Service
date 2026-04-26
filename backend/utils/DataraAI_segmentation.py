import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from packages.sam3.sam3.model_builder import build_sam3_video_predictor

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}
DEFAULT_FPS = 30.0


def image_sort_key(path: Path) -> tuple[int, int, str]:
    stem = path.stem
    match = re.search(r"_(\d+)(?:_|$)", stem)
    if match:
        return (0, int(match.group(1)), path.name.lower())
    if stem.isdigit():
        return (0, int(stem), path.name.lower())
    return (1, 0, path.name.lower())


def collect_images(image_dir: Path) -> list[Path]:
    images = [
        path
        for path in image_dir.iterdir()
        if path.is_file() and path.suffix.lower() in VALID_EXTENSIONS
    ]
    return sorted(images, key=image_sort_key)


def normalize_frame(frame: np.ndarray) -> np.ndarray:
    if frame.ndim == 2:
        return cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    if frame.shape[2] == 4:
        return cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
    return frame


def build_temp_video(image_paths: list[Path], output_path: Path, fps: float = DEFAULT_FPS) -> tuple[Path, tuple[int, int]]:
    if not image_paths:
        raise ValueError("No source images were provided")

    first_frame = cv2.imread(str(image_paths[0]), cv2.IMREAD_UNCHANGED)
    if first_frame is None:
        raise ValueError(f"Could not read {image_paths[0]}")
    first_frame = normalize_frame(first_frame)
    height, width = first_frame.shape[:2]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(output_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        float(fps),
        (width, height),
    )
    if not writer.isOpened():
        raise RuntimeError(f"Could not open video writer for {output_path}")

    try:
        for image_path in image_paths:
            frame = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
            if frame is None:
                raise ValueError(f"Could not read {image_path}")
            frame = normalize_frame(frame)
            if frame.shape[:2] != (height, width):
                frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            writer.write(frame)
    finally:
        writer.release()

    return output_path, (height, width)


def load_frame_names(frame_names_json: Path | None) -> list[str]:
    if frame_names_json is None:
        return []
    payload = json.loads(frame_names_json.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("frame_names_json must contain a JSON list")
    names: list[str] = []
    for value in payload:
        name = Path(str(value)).stem.strip()
        if not name:
            continue
        names.append(f"{name}.png")
    return names


def video_frame_size(video_path: Path) -> tuple[int, int]:
    cap = cv2.VideoCapture(str(video_path))
    try:
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    finally:
        cap.release()
    if width <= 0 or height <= 0:
        raise ValueError(f"Could not determine frame size for {video_path}")
    return height, width


def propagate_in_video(predictor, session_id):
    outputs_per_frame = {}
    for response in predictor.handle_stream_request(
        request=dict(
            type="propagate_in_video",
            session_id=session_id,
        )
    ):
        outputs_per_frame[response["frame_index"]] = response["outputs"]
    return outputs_per_frame


def mask_generation(video_path: Path, segment: str = "humans"):
    video_predictor = build_sam3_video_predictor()
    response = video_predictor.handle_request(
        request=dict(
            type="start_session",
            resource_path=str(video_path),
        )
    )
    session_id = response["session_id"]
    video_predictor.handle_request(
        request=dict(
            type="add_prompt",
            session_id=session_id,
            frame_index=0,
            text=segment,
        )
    )

    outputs_per_frame = propagate_in_video(video_predictor, session_id)

    video_predictor.handle_request(
        request=dict(
            type="close_session",
            session_id=session_id,
        )
    )
    video_predictor.shutdown()
    return outputs_per_frame


def infer_mask_arrays(output: dict) -> list[np.ndarray]:
    masks = []
    for raw_mask in output.get("out_binary_masks", []):
        mask = np.asarray(raw_mask).squeeze()
        if mask.size == 0:
            continue
        masks.append(mask.astype(bool))
    return masks


def fallback_frame_name(frame_index: int) -> str:
    return f"frame_{frame_index:04d}.png"


def mask_frame_to_bgr(mask_frame: np.ndarray) -> np.ndarray:
    frame = mask_frame.astype(np.uint8)
    if frame.ndim == 2:
        return cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    return frame


def convert_video_for_browser(raw_path: Path, output_stem: Path) -> Path:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        attempts = [
            (
                output_stem.with_suffix(".mp4"),
                ["-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
            ),
            (
                output_stem.with_suffix(".webm"),
                ["-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p"],
            ),
        ]

        for destination, codec_args in attempts:
            try:
                subprocess.check_call(
                    [
                        ffmpeg,
                        "-y",
                        "-i",
                        str(raw_path),
                        *codec_args,
                        str(destination),
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                raw_path.unlink(missing_ok=True)
                return destination
            except Exception:
                destination.unlink(missing_ok=True)

    fallback_destination = output_stem.with_suffix(".mp4")
    if raw_path != fallback_destination:
        raw_path.replace(fallback_destination)
    return fallback_destination


def write_mask_videos(
    outputs_per_frame: dict[int, dict],
    out_dir: Path,
    frame_size: tuple[int, int],
    fps: float = DEFAULT_FPS,
) -> None:
    combined_dir = out_dir / "combined"
    instances_root = out_dir / "instances"
    combined_dir.mkdir(parents=True, exist_ok=True)
    instances_root.mkdir(parents=True, exist_ok=True)

    height, width = frame_size
    frame_indexes = sorted(outputs_per_frame)
    video_size = (width, height)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    combined_raw_path = combined_dir / "_combined_mask_raw.mp4"

    combined_writer = cv2.VideoWriter(
        str(combined_raw_path),
        fourcc,
        float(fps),
        video_size,
    )
    if not combined_writer.isOpened():
        raise RuntimeError("Could not open writer for combined mask video")

    instance_ids: list[str] = []
    for frame_index in frame_indexes:
        output = outputs_per_frame[frame_index]
        mask_arrays = infer_mask_arrays(output)
        obj_ids = list(output.get("out_obj_ids", []))
        for index, _mask in enumerate(mask_arrays):
            object_id = str(int(obj_ids[index])) if index < len(obj_ids) else str(index)
            if object_id not in instance_ids:
                instance_ids.append(object_id)

    instance_writers: dict[str, cv2.VideoWriter] = {}
    instance_raw_paths: dict[str, Path] = {}
    try:
        for object_id in instance_ids:
            raw_path = instances_root / f"_object_{object_id}_raw.mp4"
            writer = cv2.VideoWriter(
                str(raw_path),
                fourcc,
                float(fps),
                video_size,
            )
            if not writer.isOpened():
                raise RuntimeError(f"Could not open writer for instance video {object_id}")
            instance_writers[object_id] = writer
            instance_raw_paths[object_id] = raw_path

        blank_frame = np.zeros((height, width), dtype=np.uint8)

        for frame_index in frame_indexes:
            output = outputs_per_frame[frame_index]
            mask_arrays = infer_mask_arrays(output)
            obj_ids = list(output.get("out_obj_ids", []))

            if mask_arrays:
                combined_mask = np.any(np.stack(mask_arrays), axis=0).astype(np.uint8) * 255
            else:
                combined_mask = blank_frame
            combined_writer.write(mask_frame_to_bgr(combined_mask))

            frame_masks_by_object: dict[str, np.ndarray] = {}
            for index, mask in enumerate(mask_arrays):
                object_id = str(int(obj_ids[index])) if index < len(obj_ids) else str(index)
                frame_masks_by_object[object_id] = (mask.astype(np.uint8)) * 255

            for object_id, writer in instance_writers.items():
                frame_mask = frame_masks_by_object.get(object_id, blank_frame)
                writer.write(mask_frame_to_bgr(frame_mask))
    finally:
        combined_writer.release()
        for writer in instance_writers.values():
            writer.release()

    convert_video_for_browser(combined_raw_path, combined_dir / "combined_mask")
    for object_id, raw_path in instance_raw_paths.items():
        convert_video_for_browser(raw_path, instances_root / f"object_{object_id}")


def write_masks(
    outputs_per_frame: dict[int, dict],
    out_dir: Path,
    frame_names: list[str],
    frame_size: tuple[int, int],
) -> None:
    combined_dir = out_dir / "combined"
    instances_root = out_dir / "instances"
    combined_dir.mkdir(parents=True, exist_ok=True)
    instances_root.mkdir(parents=True, exist_ok=True)

    height, width = frame_size

    for frame_index in sorted(outputs_per_frame):
        output = outputs_per_frame[frame_index]
        mask_arrays = infer_mask_arrays(output)
        output_name = frame_names[frame_index] if frame_index < len(frame_names) else fallback_frame_name(frame_index)

        if mask_arrays:
            combined_mask = np.any(np.stack(mask_arrays), axis=0).astype(np.uint8) * 255
        else:
            combined_mask = np.zeros((height, width), dtype=np.uint8)

        Image.fromarray(combined_mask, mode="L").save(combined_dir / output_name)

        obj_ids = list(output.get("out_obj_ids", []))
        for index, mask in enumerate(mask_arrays):
            object_id = str(int(obj_ids[index])) if index < len(obj_ids) else str(index)
            object_dir = instances_root / object_id
            object_dir.mkdir(parents=True, exist_ok=True)
            instance_mask = (mask.astype(np.uint8)) * 255
            Image.fromarray(instance_mask, mode="L").save(object_dir / output_name)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_mode", choices=["video", "folder", "image"], required=True)
    parser.add_argument("--video_path", type=Path)
    parser.add_argument("--image_dir", type=Path)
    parser.add_argument("--image_path", type=Path)
    parser.add_argument("--segment", type=str, required=True)
    parser.add_argument("--output_dir", type=Path, required=True)
    parser.add_argument("--frame_names_json", type=Path)
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    temp_dir = None
    try:
        if args.input_mode == "video":
            if args.video_path is None:
                raise ValueError("video_path is required for video mode")
            video_path = args.video_path.expanduser().resolve()
            if video_path.suffix.lower() != ".mp4":
                raise ValueError("Video path must end with .mp4")
            frame_names = load_frame_names(args.frame_names_json)
            frame_size = video_frame_size(video_path)
        elif args.input_mode == "folder":
            if args.image_dir is None:
                raise ValueError("image_dir is required for folder mode")
            image_dir = args.image_dir.expanduser().resolve()
            image_paths = collect_images(image_dir)
            if not image_paths:
                raise ValueError(f"No supported image files found in {image_dir}")
            frame_names = [f"{path.stem}.png" for path in image_paths]
            temp_dir = tempfile.TemporaryDirectory(prefix="sam3_masks_")
            video_path, frame_size = build_temp_video(image_paths, Path(temp_dir.name) / "source.mp4")
        else:
            if args.image_path is None:
                raise ValueError("image_path is required for image mode")
            image_path = args.image_path.expanduser().resolve()
            if image_path.suffix.lower() not in VALID_EXTENSIONS:
                raise ValueError("Unsupported image type")
            frame_names = [f"{image_path.stem}.png"]
            temp_dir = tempfile.TemporaryDirectory(prefix="sam3_masks_")
            video_path, frame_size = build_temp_video([image_path], Path(temp_dir.name) / "source.mp4")

        outputs_per_frame = mask_generation(video_path, args.segment)
        if args.input_mode == "video":
            write_mask_videos(outputs_per_frame, output_dir, frame_size, fps=DEFAULT_FPS)
        else:
            write_masks(outputs_per_frame, output_dir, frame_names, frame_size)
        print(output_dir)
    finally:
        if temp_dir is not None:
            temp_dir.cleanup()


if __name__ == "__main__":
    main()
