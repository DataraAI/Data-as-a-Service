"""Build a temporary mp4 from an image folder."""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

import cv2


VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}


def image_sort_key(path: Path) -> tuple[int, int, str]:
    stem = path.stem
    match = re.search(r"_(\d+)(?:_|$)", stem)
    if match:
        return (0, int(match.group(1)), path.name.lower())
    if stem.isdigit():
        return (0, int(stem), path.name.lower())
    return (1, 0, path.name.lower())


def collect_images(input_dir: Path) -> list[Path]:
    images = [
        path
        for path in input_dir.iterdir()
        if path.is_file() and path.suffix.lower() in VALID_EXTENSIONS
    ]
    return sorted(images, key=image_sort_key)


def build_video_from_images(input_dir: str | Path, output_path: str | Path, fps: float) -> str:
    source_dir = Path(input_dir).expanduser().resolve()
    destination = Path(output_path).expanduser().resolve()
    images = collect_images(source_dir)
    if not images:
        raise ValueError(f"No supported image files found in {source_dir}")

    first_frame = cv2.imread(str(images[0]), cv2.IMREAD_UNCHANGED)
    if first_frame is None:
        raise ValueError(f"Could not read {images[0]}")

    if first_frame.ndim == 2:
        first_frame = cv2.cvtColor(first_frame, cv2.COLOR_GRAY2BGR)
    elif first_frame.shape[2] == 4:
        first_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGRA2BGR)

    height, width = first_frame.shape[:2]
    destination.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(destination),
        cv2.VideoWriter_fourcc(*"mp4v"),
        float(fps),
        (width, height),
    )
    if not writer.isOpened():
        raise RuntimeError(f"Could not open video writer for {destination}")

    try:
        for image_path in images:
            frame = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
            if frame is None:
                raise ValueError(f"Could not read {image_path}")
            if frame.ndim == 2:
                frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
            elif frame.shape[2] == 4:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)

            if frame.shape[:2] != (height, width):
                frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            writer.write(frame)
    finally:
        writer.release()

    return str(destination)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a temporary video from an image folder")
    parser.add_argument("--input_dir", required=True, help="Folder containing source images")
    parser.add_argument("--output_path", required=True, help="Destination mp4 path")
    parser.add_argument("--fps", type=float, default=30.0, help="Frames per second for the output video")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = build_video_from_images(args.input_dir, args.output_path, args.fps)
    print(output_path)


if __name__ == "__main__":
    main()
