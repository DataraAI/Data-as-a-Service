"""Dataset upload and derived-asset processing service."""

from __future__ import annotations

import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import cv2
import gdown
import numpy as np
from azure.storage.blob import ContentSettings

from datara.config import settings
from datara.logging import logger
from datara.services.sql_store import SQLStore


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UTILS_DIR = os.path.join(BACKEND_DIR, "utils")
DATASET_LIST_DIR = os.path.join(UTILS_DIR, "dataset_list")


class ProcessingService:
    """Service for upload ingestion, ego generation, corner cases, and VLM tags."""

    PRESET_VLM_PROMPTS = {
        "describe_image": "Describe the image.",
        "task_completed": "Has the task been completed?",
        "sensor_modalities": "What are the sensor modalities detected?",
    }

    def __init__(self, azure_service, dataset_service, sql_store: SQLStore) -> None:
        self.azure_service = azure_service
        self.dataset_service = dataset_service
        self.sql_store = sql_store
        self.upload_folder = settings.upload_folder
        os.makedirs(self.upload_folder, exist_ok=True)
        os.makedirs(DATASET_LIST_DIR, exist_ok=True)

    @staticmethod
    def _open_mp4_writer(output_path: str, fps: float, width: int, height: int) -> cv2.VideoWriter:
        effective_fps = fps if fps > 0 else 30.0
        codec_attempts = ("avc1", "H264", "mp4v")
        last_writer = None

        for codec in codec_attempts:
            writer = cv2.VideoWriter(
                output_path,
                cv2.VideoWriter_fourcc(*codec),
                effective_fps,
                (width, height),
            )
            if writer.isOpened():
                return writer
            last_writer = writer
            writer.release()

        if last_writer is not None:
            last_writer.release()
        raise ValueError(f"Failed to create MP4 video writer for {output_path}")

    @staticmethod
    def _normalize_path_segment(value: str, field_name: str) -> str:
        value = str(value or "").strip().strip("/")
        if not value:
            raise ValueError(f"Missing {field_name}")
        value = value.replace("\\", "-").replace(" ", "-")
        return value

    def _resolve_dataset_identity(self, data: dict[str, Any]) -> tuple[str, str, str]:
        output_name = str(data.get("output_name") or "").strip().strip("/")
        if output_name:
            parts = [segment for segment in output_name.split("/") if segment]
            if len(parts) != 3:
                raise ValueError("output_name must be category/brand/dataset")
            return parts[0], parts[1], parts[2]

        category = self._normalize_path_segment(data.get("category"), "category")
        brand = self._normalize_path_segment(data.get("brand"), "brand")
        dataset_name = self._normalize_path_segment(data.get("dataset_name"), "dataset_name")
        return category, brand, dataset_name

    @staticmethod
    def _resolve_visibility(requested: str | None, source_dataset: dict[str, Any] | None = None) -> str:
        requested = str(requested or "").strip().lower()
        if source_dataset and source_dataset["visibility"] == "private":
            return "private"
        if requested in {"private", "public"}:
            return requested
        if source_dataset:
            return str(source_dataset["visibility"] or "").strip() or "private"
        return "private"

    def _build_dataset_row(
        self,
        *,
        owner_user: dict[str, Any],
        created_by_user: dict[str, Any],
        visibility: str,
        category: str,
        brand: str,
        dataset_name: str,
        task: str = "",
        source_kind: str = "upload",
        source_dataset_id: str | None = None,
    ) -> dict[str, Any]:
        storage_container = (
            settings.azure_public_container
            if visibility == "public"
            else owner_user["private_container_name"]
        )
        storage_prefix = f"{category}/{brand}/{dataset_name}"
        self.azure_service.ensure_container(storage_container)
        return self.sql_store.create_dataset(
            owner_user=owner_user,
            created_by_user=created_by_user,
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            storage_container=storage_container,
            storage_prefix=storage_prefix,
            source_kind=source_kind,
            source_dataset_id=source_dataset_id,
            task=task,
        )

    def process_video(
        self,
        current_user: dict[str, Any],
        data: dict[str, Any],
        *,
        local_video_path: str | None = None,
        local_image_dir: str | None = None,
    ) -> dict[str, Any]:
        gdrive_link = data.get("gdrive_link")
        upload_type = str(data.get("upload_type", "video") or "video").strip().lower()
        view = str(data.get("view", "exo") or "exo").strip().lower()
        if view not in {"exo", "egos"}:
            raise ValueError("view must be 'exo' or 'egos'")

        has_local = bool(local_video_path or local_image_dir)
        if local_video_path and local_image_dir:
            raise ValueError("Cannot use both local video and local image folder")
        if has_local:
            if local_video_path and upload_type != "video":
                raise ValueError("Local video uploads require upload_type='video'")
            if local_image_dir and upload_type != "folder":
                raise ValueError("Local folder uploads require upload_type='folder'")
        elif not gdrive_link:
            raise ValueError("No Google Drive link provided")

        category, brand, dataset_name = self._resolve_dataset_identity(data)
        visibility = self._resolve_visibility(data.get("visibility"))
        date_val = str(data.get("date") or "")
        misc_tags = data.get("tags", [])
        task = str(data.get("task") or "").strip()
        target_view_dir = "orig" if view == "exo" else "egos"
        dataset = self._build_dataset_row(
            owner_user=current_user,
            created_by_user=current_user,
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            task=task,
        )
        local_process_dir = os.path.join(DATASET_LIST_DIR, dataset["storage_prefix"])

        try:
            if os.path.exists(local_process_dir):
                shutil.rmtree(local_process_dir)
            os.makedirs(os.path.join(local_process_dir, target_view_dir), exist_ok=True)

            if local_video_path:
                self._ingest_video_path(
                    local_video_path,
                    local_process_dir,
                    dataset_name,
                    target_view_dir=target_view_dir,
                )
            elif local_image_dir:
                self._ingest_image_directory(
                    local_image_dir,
                    local_process_dir,
                    dataset_name,
                    target_view_dir=target_view_dir,
                    recursive=False,
                )
            elif upload_type == "folder":
                self._process_folder(
                    str(gdrive_link),
                    local_process_dir,
                    dataset_name,
                    target_view_dir=target_view_dir,
                )
            else:
                self._process_video_file(
                    str(gdrive_link),
                    local_process_dir,
                    dataset_name,
                    target_view_dir=target_view_dir,
                )

            self._upload_to_azure(
                dataset=dataset,
                local_process_dir=local_process_dir,
                date_val=date_val,
                misc_tags=misc_tags if isinstance(misc_tags, list) else [],
                task=task,
                create_video_annotation=(upload_type == "video"),
                upload_view=view,
                source_dataset_id=None,
            )
            return {
                "message": "Data processed and uploaded successfully",
                "dataset": self.sql_store.build_dataset_summary(dataset, current_user),
            }
        except Exception:
            self.sql_store.mark_dataset_deleted(dataset["id"])
            raise
        finally:
            if os.path.isdir(local_process_dir):
                shutil.rmtree(local_process_dir, ignore_errors=True)

    def _ingest_image_directory(
        self,
        image_source_dir: str,
        local_process_dir: str,
        dataset_basename: str,
        *,
        target_view_dir: str = "orig",
        recursive: bool = True,
    ) -> None:
        valid_exts = (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp")
        image_files: list[str] = []

        if recursive:
            for root, _dirs, files in os.walk(image_source_dir):
                for file_name in files:
                    if file_name.lower().endswith(valid_exts):
                        image_files.append(os.path.join(root, file_name))
        else:
            with os.scandir(image_source_dir) as entries:
                for entry in entries:
                    if entry.is_file() and entry.name.lower().endswith(valid_exts):
                        image_files.append(entry.path)

        image_files.sort()
        if not image_files:
            raise ValueError("No supported image files found")

        pad_width = len(str(len(image_files)))
        for index, image_path in enumerate(image_files):
            ext = os.path.splitext(image_path)[1].lower()
            new_filename = f"{dataset_basename}_{index:0{pad_width}d}{ext}"
            destination = os.path.join(local_process_dir, target_view_dir, new_filename)
            shutil.copy2(image_path, destination)

    def _process_folder(self, gdrive_link: str, local_process_dir: str, dataset_basename: str, *, target_view_dir: str) -> None:
        temp_download_dir = os.path.join(self.upload_folder, f"temp_folder_{int(datetime.now().timestamp())}")
        os.makedirs(temp_download_dir, exist_ok=True)
        try:
            downloaded = gdown.download_folder(
                gdrive_link,
                output=temp_download_dir,
                quiet=False,
                use_cookies=False,
            )
            if not downloaded:
                raise ValueError("Folder download failed or link invalid")
            self._ingest_image_directory(
                temp_download_dir,
                local_process_dir,
                dataset_basename,
                target_view_dir=target_view_dir,
            )
        finally:
            shutil.rmtree(temp_download_dir, ignore_errors=True)

    def _process_video_file(
        self,
        gdrive_link: str,
        local_process_dir: str,
        dataset_basename: str,
        *,
        target_view_dir: str = "orig",
    ) -> None:
        ts = int(datetime.now().timestamp())
        video_path = os.path.join(self.upload_folder, f"video_{ts}.mp4")
        try:
            downloaded_path = gdown.download(gdrive_link, video_path, quiet=False, fuzzy=True)
            if not downloaded_path:
                raise ValueError("Video download failed or link invalid")
            self._ingest_video_path(
                downloaded_path,
                local_process_dir,
                dataset_basename,
                target_view_dir=target_view_dir,
            )
        finally:
            if os.path.exists(video_path):
                os.remove(video_path)

    def _stage_browser_playable_video(
        self,
        *,
        source_video_path: str,
        local_process_dir: str,
        dataset_basename: str,
        width: int,
        height: int,
        fps: float,
    ) -> None:
        video_dir = os.path.join(local_process_dir, "video")
        os.makedirs(video_dir, exist_ok=True)
        output_path = os.path.join(video_dir, f"{dataset_basename}.mp4")
        self._resize_video_to_dimensions(
            input_path=source_video_path,
            output_path=output_path,
            width=width,
            height=height,
            fps=fps,
        )

    def _stage_folder_preview_hover_video(
        self,
        *,
        source_video_path: str,
        local_process_dir: str,
        width: int,
        height: int,
        fps: float,
    ) -> None:
        preview_dir = os.path.join(local_process_dir, "preview")
        os.makedirs(preview_dir, exist_ok=True)
        output_path = os.path.join(preview_dir, "hover.mp4")
        self._resize_video_to_dimensions(
            input_path=source_video_path,
            output_path=output_path,
            width=width,
            height=height,
            fps=fps,
            max_duration_seconds=5.0,
        )

    def _ingest_video_path(
        self,
        video_path: str,
        local_process_dir: str,
        dataset_basename: str,
        *,
        target_view_dir: str = "orig",
    ) -> None:
        cap = cv2.VideoCapture(video_path)
        try:
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            target_fps = float(video_fps) if video_fps and video_fps > 0 else 30.0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
            if width <= 0 or height <= 0:
                success, frame = cap.read()
                if not success or frame is None:
                    raise ValueError(f"Failed to inspect uploaded video: {video_path}")
                height, width = frame.shape[:2]
        finally:
            cap.release()

        self._stage_browser_playable_video(
            source_video_path=video_path,
            local_process_dir=local_process_dir,
            dataset_basename=dataset_basename,
            width=width,
            height=height,
            fps=target_fps,
        )
        self._stage_folder_preview_hover_video(
            source_video_path=video_path,
            local_process_dir=local_process_dir,
            width=width,
            height=height,
            fps=target_fps,
        )

        cmd = [
            sys.executable,
            os.path.join(UTILS_DIR, "generate_orig_frames.py"),
            "--video_path",
            video_path,
            "--output_name",
            dataset_basename,
            "--target_fps",
            str(target_fps),
            "--output_dir",
            local_process_dir,
            "--view",
            target_view_dir,
        ]
        subprocess.check_call(cmd)

    def _upload_to_azure(
        self,
        *,
        dataset: dict[str, Any],
        local_process_dir: str,
        date_val: str,
        misc_tags: list[str],
        task: str,
        create_video_annotation: bool,
        upload_view: str,
        source_dataset_id: str | None,
    ) -> None:
        azure_view = "orig" if upload_view == "exo" else upload_view
        cmd = [
            sys.executable,
            os.path.join(UTILS_DIR, "upload_frames_to_azure.py"),
            "--container_name",
            str(dataset["storage_container"]),
            "--output_name",
            str(dataset["storage_prefix"]),
            "--input_dir",
            str(local_process_dir),
            "--view",
            str(azure_view),
            "--date",
            str(date_val or ""),
            "--tags",
            json.dumps(misc_tags),
            "--task",
            str(task or ""),
            "--dataset_id",
            str(dataset["id"]),
            "--owner_user_id",
            str(dataset["owner_user_id"]),
            "--visibility",
            str(dataset["visibility"]),
        ]
        if source_dataset_id:
            cmd.extend(["--source_dataset_id", str(source_dataset_id)])
        if create_video_annotation:
            cmd.append("--create_video_annotation")
        subprocess.check_call(cmd)

    @staticmethod
    def _slugify_prompt(prompt: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "-", str(prompt or "").strip().lower()).strip("-")
        return (normalized[:64].strip("-") or "mask")

    @staticmethod
    def _image_sort_key(image: dict[str, Any]) -> tuple[int, int, str]:
        frame_value = None
        metadata = image.get("metadata") if isinstance(image, dict) else None
        if isinstance(metadata, dict):
            frame_value = metadata.get("frame_id")

        if isinstance(frame_value, int):
            return (0, frame_value, str(image.get("name") or "").lower())

        if isinstance(frame_value, str) and frame_value.strip().isdigit():
            return (0, int(frame_value.strip()), str(image.get("name") or "").lower())

        name = str(image.get("name") or "")
        match = re.search(r"_(\d+)(?:_|$)", os.path.splitext(name)[0])
        if match:
            return (0, int(match.group(1)), name.lower())
        return (1, 0, name.lower())

    def _download_route_images(
        self,
        *,
        dataset: dict[str, Any],
        images: list[dict[str, Any]],
        destination_dir: str,
    ) -> None:
        os.makedirs(destination_dir, exist_ok=True)
        for image in images:
            target_path = os.path.join(destination_dir, image["name"])
            download = self.azure_service.download_blob(dataset["storage_container"], image["id"])
            with open(target_path, "wb") as handle:
                handle.write(download.readall())

    def generate_masks(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        prompt = str(data.get("prompt") or "").strip()
        route_path = str(data.get("route_path") or "").strip().strip("/")

        if not prompt:
            return {"error": "Missing prompt"}, 400
        if not route_path:
            return {"error": "Missing route_path"}, 400

        dataset, extra_segments = self.sql_store.resolve_dataset_route(route_path, current_user)
        self.sql_store.assert_user_can_access_dataset(dataset, current_user)

        if any(segment.lower() == "masks" for segment in extra_segments):
            return {"error": "Mask generation is unavailable inside existing mask folders"}, 400

        route_images = [
            image
            for image in self.dataset_service.get_dataset_images(route_path, current_user)
            if image.get("type") == "image"
        ]
        route_images.sort(key=self._image_sort_key)

        if not route_images:
            return {"error": "No images found in this folder"}, 400

        summary = self.sql_store.build_dataset_summary(dataset, current_user)
        prompt_slug = self._slugify_prompt(prompt)
        mask_route_path = f"{summary['full_path'].rstrip('/')}/masks/{prompt_slug}"
        target_storage_prefix = f"{dataset['storage_prefix'].rstrip('/')}/masks/{prompt_slug}"

        job_root = tempfile.mkdtemp(prefix="mask_job_", dir=DATASET_LIST_DIR)
        staged_image_dir = os.path.join(job_root, "source_images")
        local_output_dir = os.path.join(job_root, "mask_output")

        try:
            self._download_route_images(
                dataset=dataset,
                images=route_images,
                destination_dir=staged_image_dir,
            )

            from datara.services import call_lambda_vm

            fetched_output_dir, status_code = call_lambda_vm.generate_masks(
                prompt=prompt,
                local_input_dir=staged_image_dir,
                local_output_dir=local_output_dir,
            )
            if status_code != 200 or not fetched_output_dir:
                return {"error": "Mask generation failed"}, status_code or 500

            has_mask_files = any(file_names for _root, _dirs, file_names in os.walk(fetched_output_dir))
            if not has_mask_files:
                return {"error": "No mask files were returned"}, 500

            self.azure_service.delete_blobs_with_prefix(dataset["storage_container"], target_storage_prefix)
            self.azure_service.delete_cosmos_docs_for_prefix(dataset["storage_container"], target_storage_prefix)

            upload_cmd = [
                sys.executable,
                os.path.join(UTILS_DIR, "upload_mask_tree_to_azure.py"),
                "--container_name",
                str(dataset["storage_container"]),
                "--target_prefix",
                str(target_storage_prefix),
                "--dataset_prefix",
                str(dataset["storage_prefix"]),
                "--input_dir",
                str(fetched_output_dir),
                "--prompt",
                str(prompt),
                "--dataset_id",
                str(dataset["id"]),
                "--owner_user_id",
                str(dataset["owner_user_id"]),
                "--visibility",
                str(dataset["visibility"]),
                "--task",
                str(dataset.get("task") or ""),
                "--source_dataset_id",
                str(dataset["id"]),
            ]
            subprocess.check_call(upload_cmd, cwd=BACKEND_DIR)
        except subprocess.CalledProcessError as exc:
            logger.error("Mask generation helper failed: %s", exc, exc_info=True)
            return {"error": str(exc)}, 500
        except Exception as exc:
            logger.error("Error generating masks: %s", exc, exc_info=True)
            return {"error": str(exc)}, 500
        finally:
            shutil.rmtree(job_root, ignore_errors=True)

        return {
            "message": "Mask generation finished successfully.",
            "mask_route_path": mask_route_path,
            "mask_viewer_path": f"/viewer/{mask_route_path}",
            "prompt_slug": prompt_slug,
        }, 200

    @staticmethod
    def _frame_lookup_key(image: dict[str, Any]) -> str:
        metadata = image.get("metadata") if isinstance(image, dict) else None
        frame_value = metadata.get("frame_id") if isinstance(metadata, dict) else None

        if isinstance(frame_value, int):
            return str(frame_value)
        if isinstance(frame_value, str) and frame_value.strip().isdigit():
            return str(int(frame_value.strip()))

        name = str(image.get("name") or "")
        match = re.search(r"_(\d+)(?:_|$)", os.path.splitext(name)[0])
        if match:
            return str(int(match.group(1)))

        return name.lower()

    @staticmethod
    def _parse_instance_number(instance_name: str) -> int | None:
        normalized = instance_name.strip().lower()
        if normalized.isdigit():
            return int(normalized)

        match = re.match(r"object[_-]?(\d+)$", normalized)
        if match:
            return int(match.group(1))

        return None

    @staticmethod
    def _mask_instance_sort_key(instance_name: str) -> tuple[int, int, str]:
        instance_number = ProcessingService._parse_instance_number(instance_name)
        if instance_number is not None:
            return (0, instance_number, instance_name.lower())
        return (1, 0, instance_name.lower())

    @staticmethod
    def _instance_label(instance_name: str) -> str:
        instance_number = ProcessingService._parse_instance_number(instance_name)
        if instance_number is not None:
            return f"Object {instance_number}"
        return instance_name.replace("_", " ").strip() or instance_name

    @staticmethod
    def _selection_slug(prompt_slug: str, mode: str, instance_name: str | None) -> str:
        if mode == "combined":
            return "combined"
        instance_name = str(instance_name or "").strip()
        if not instance_name:
            raise ValueError("Missing instance selection")
        return re.sub(r"[^a-z0-9]+", "-", instance_name.lower()).strip("-") or prompt_slug

    @staticmethod
    def _build_occlusion_prompt(primary_prompt_slug: str, subtract_prompt_slug: str | None = None) -> str:
        primary_text = primary_prompt_slug.replace("-", " ").strip()
        if not primary_text:
            primary_text = "selected object"
        if subtract_prompt_slug:
            subtract_text = subtract_prompt_slug.replace("-", " ").strip() or "overlap region"
            return f"Remove the {primary_text} from the scene while preserving the {subtract_text}."
        return f"Remove the {primary_text} from the scene while preserving the background."

    @staticmethod
    def _resolve_sample_size(width: int, height: int) -> tuple[int, int]:
        max_width = 720
        max_height = 720
        scale = min(max_width / max(width, 1), max_height / max(height, 1), 1.0)
        scaled_width = max(16, int(round((width * scale) / 16.0) * 16))
        scaled_height = max(16, int(round((height * scale) / 16.0) * 16))
        return scaled_height, scaled_width

    def _validate_occlusion_route(
        self,
        *,
        current_user: dict[str, Any],
        route_path: str,
    ) -> tuple[dict[str, Any], list[str], dict[str, Any]]:
        dataset, extra_segments = self.sql_store.resolve_dataset_route(route_path, current_user)
        self.sql_store.assert_user_can_access_dataset(dataset, current_user)

        lower_segments = [segment.lower() for segment in extra_segments]
        if "masks" in lower_segments:
            raise ValueError("Occlusion removal is unavailable inside mask folders")
        if "occl_del" in lower_segments:
            raise ValueError("Occlusion removal is unavailable inside occlusion result folders")

        summary = self.sql_store.build_dataset_summary(dataset, current_user)
        return dataset, extra_segments, summary

    def _build_mask_prompt_options(
        self,
        *,
        current_user: dict[str, Any],
        dataset_summary_path: str,
    ) -> list[dict[str, Any]]:
        mask_root_path = f"{dataset_summary_path.rstrip('/')}/masks"
        prompt_folders = self.dataset_service.list_datasets(mask_root_path, current_user)
        options: list[dict[str, Any]] = []

        for prompt_folder in prompt_folders:
            if prompt_folder.get("type") != "folder":
                continue

            prompt_slug = str(prompt_folder.get("name") or "").strip()
            if not prompt_slug:
                continue

            instance_folders = self.dataset_service.list_datasets(prompt_folder["full_path"], current_user)
            instances = []
            for instance_folder in instance_folders:
                if instance_folder.get("type") != "folder":
                    continue

                instance_name = str(instance_folder.get("name") or "").strip()
                if not instance_name:
                    continue

                instance_number = self._parse_instance_number(instance_name)
                instance_id = str(instance_number) if instance_number is not None else instance_name

                instances.append(
                    {
                        "instance_name": instance_name,
                        "instance_id": instance_id,
                        "label": self._instance_label(instance_name),
                        "viewer_path": instance_folder.get("viewer_path"),
                    }
                )

            instances.sort(key=lambda item: self._mask_instance_sort_key(str(item["instance_name"])))
            options.append(
                {
                    "prompt_slug": prompt_slug,
                    "prompt_label": prompt_slug.replace("-", " "),
                    "viewer_path": prompt_folder.get("viewer_path"),
                    "instance_count": len(instances),
                    "instances": instances,
                }
            )

        options.sort(key=lambda item: str(item["prompt_slug"]).lower())
        return options

    def get_occlusion_mask_options(
        self,
        current_user: dict[str, Any],
        route_path: str,
    ) -> tuple[dict[str, Any], int]:
        route_path = str(route_path or "").strip().strip("/")
        if not route_path:
            return {"error": "Missing route_path"}, 400

        try:
            _dataset, _extra_segments, summary = self._validate_occlusion_route(
                current_user=current_user,
                route_path=route_path,
            )
            prompts = self._build_mask_prompt_options(
                current_user=current_user,
                dataset_summary_path=summary["full_path"],
            )
        except Exception as exc:
            logger.error("Error loading occlusion mask options: %s", exc, exc_info=True)
            return {"error": str(exc)}, 400

        return {
            "route_path": route_path,
            "mask_root_path": f"{summary['full_path'].rstrip('/')}/masks",
            "prompts": prompts,
        }, 200

    def _collect_prompt_mask_assets(
        self,
        *,
        current_user: dict[str, Any],
        dataset: dict[str, Any],
        dataset_summary_path: str,
        prompt_slug: str,
    ) -> dict[str, list[dict[str, Any]]]:
        prompt_route_path = f"{dataset_summary_path.rstrip('/')}/masks/{prompt_slug}"
        prompt_assets = [
            image
            for image in self.dataset_service.get_dataset_images(prompt_route_path, current_user)
            if image.get("type") == "image"
        ]
        prompt_assets.sort(key=self._image_sort_key)

        relative_prefix = f"{dataset['storage_prefix'].rstrip('/')}/masks/{prompt_slug}/"
        grouped: dict[str, list[dict[str, Any]]] = {}
        for asset in prompt_assets:
            blob_name = str(asset.get("id") or "")
            if not blob_name.startswith(relative_prefix):
                continue
            relative_path = blob_name[len(relative_prefix) :]
            parts = [part for part in relative_path.split("/") if part]
            if len(parts) < 2:
                continue
            instance_name = parts[0]
            grouped.setdefault(instance_name, []).append(asset)

        return grouped

    def _resolve_selected_instance_names(
        self,
        *,
        selection: dict[str, Any],
        prompt_options: dict[str, Any],
        prompt_assets: dict[str, list[dict[str, Any]]],
    ) -> list[str]:
        mode = str(selection.get("mode") or "").strip().lower()
        if mode not in {"instance", "combined"}:
            raise ValueError("Selection mode must be 'instance' or 'combined'")

        available_names = sorted(prompt_assets.keys(), key=self._mask_instance_sort_key)
        if not available_names:
            raise ValueError(f"No mask instances were found for '{prompt_options['prompt_slug']}'")

        if mode == "combined":
            return available_names

        instance_name = str(selection.get("instance_name") or "").strip()
        if instance_name and instance_name in prompt_assets:
            return [instance_name]

        instance_id = str(selection.get("instance_id") or "").strip()
        if instance_id:
            for available_name in available_names:
                instance_number = self._parse_instance_number(available_name)
                if instance_number is not None and str(instance_number) == instance_id:
                    return [available_name]
                if available_name == instance_id:
                    return [available_name]

        raise ValueError(f"Selected instance was not found for '{prompt_options['prompt_slug']}'")

    def _download_mask_selection(
        self,
        *,
        dataset: dict[str, Any],
        prompt_assets: dict[str, list[dict[str, Any]]],
        selected_instance_names: list[str],
        destination_dir: str,
    ) -> dict[str, list[str]]:
        frame_map: dict[str, list[str]] = {}
        for instance_name in selected_instance_names:
            instance_dir = os.path.join(destination_dir, instance_name)
            os.makedirs(instance_dir, exist_ok=True)

            for asset in prompt_assets.get(instance_name, []):
                local_path = os.path.join(instance_dir, asset["name"])
                blob_bytes = self.azure_service.download_blob(dataset["storage_container"], asset["id"]).readall()
                with open(local_path, "wb") as handle:
                    handle.write(blob_bytes)

                frame_key = self._frame_lookup_key(asset)
                frame_map.setdefault(frame_key, []).append(local_path)

        return frame_map

    @staticmethod
    def _load_binary_mask(mask_path: str, width: int, height: int) -> np.ndarray:
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise ValueError(f"Failed to read mask frame: {mask_path}")
        if mask.shape[1] != width or mask.shape[0] != height:
            mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)
        return (mask > 0).astype(np.uint8) * 255

    def _compose_occlusion_videos(
        self,
        *,
        route_images: list[dict[str, Any]],
        source_dir: str,
        include_masks: dict[str, list[str]],
        subtract_masks: dict[str, list[str]],
        source_video_path: str,
        mask_video_path: str,
    ) -> dict[str, Any]:
        if not route_images:
            raise ValueError("No source images were found in this folder")

        first_source_path = os.path.join(source_dir, route_images[0]["name"])
        first_frame = cv2.imread(first_source_path, cv2.IMREAD_COLOR)
        if first_frame is None:
            raise ValueError(f"Failed to read source frame: {route_images[0]['name']}")

        height, width = first_frame.shape[:2]
        fps = 30.0
        for image in route_images:
            metadata = image.get("metadata") if isinstance(image, dict) else None
            candidate = metadata.get("fps") if isinstance(metadata, dict) else None
            try:
                numeric_fps = float(candidate)
            except (TypeError, ValueError):
                numeric_fps = 0.0
            if numeric_fps > 0:
                fps = numeric_fps
                break

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        source_writer = cv2.VideoWriter(source_video_path, fourcc, fps, (width, height))
        mask_writer = cv2.VideoWriter(mask_video_path, fourcc, fps, (width, height))
        if not source_writer.isOpened() or not mask_writer.isOpened():
            source_writer.release()
            mask_writer.release()
            raise ValueError("Failed to create temporary source or mask videos")

        total_primary_pixels = 0
        total_overlap_pixels = 0
        total_final_pixels = 0

        try:
            for image in route_images:
                source_path = os.path.join(source_dir, image["name"])
                frame = cv2.imread(source_path, cv2.IMREAD_COLOR)
                if frame is None:
                    raise ValueError(f"Failed to read source frame: {image['name']}")
                if frame.shape[1] != width or frame.shape[0] != height:
                    frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
                source_writer.write(frame)

                frame_key = self._frame_lookup_key(image)
                primary_mask = np.zeros((height, width), dtype=np.uint8)
                subtract_mask = np.zeros((height, width), dtype=np.uint8)

                for mask_path in include_masks.get(frame_key, []):
                    primary_mask = cv2.bitwise_or(primary_mask, self._load_binary_mask(mask_path, width, height))

                for mask_path in subtract_masks.get(frame_key, []):
                    subtract_mask = cv2.bitwise_or(subtract_mask, self._load_binary_mask(mask_path, width, height))

                total_primary_pixels += int(np.count_nonzero(primary_mask))
                if subtract_masks:
                    overlap_mask = cv2.bitwise_and(primary_mask, subtract_mask)
                    total_overlap_pixels += int(np.count_nonzero(overlap_mask))
                    final_mask = cv2.bitwise_and(primary_mask, cv2.bitwise_not(subtract_mask))
                else:
                    final_mask = primary_mask

                total_final_pixels += int(np.count_nonzero(final_mask))
                mask_writer.write(cv2.cvtColor(final_mask, cv2.COLOR_GRAY2BGR))
        finally:
            source_writer.release()
            mask_writer.release()

        if total_primary_pixels == 0:
            raise ValueError("No mask pixels were found for the selected object")
        if subtract_masks and total_overlap_pixels == 0:
            raise ValueError("The selected subtraction mask does not overlap the primary mask")
        if total_final_pixels == 0:
            raise ValueError("The selected masks produced an empty occlusion-removal region")

        return {
            "fps": fps,
            "frame_count": len(route_images),
            "width": width,
            "height": height,
        }

    @staticmethod
    def _resize_video_to_dimensions(
        *,
        input_path: str,
        output_path: str,
        width: int,
        height: int,
        fps: float,
        max_duration_seconds: float | None = None,
    ) -> None:
        capture = cv2.VideoCapture(input_path)
        if not capture.isOpened():
            raise ValueError("Failed to open generated ROSE output video")

        current_width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        current_height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        current_fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        capture.release()

        effective_fps = fps if fps > 0 else current_fps if current_fps > 0 else 30.0
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path:
            filter_parts = []
            if width > 0 and height > 0:
                filter_parts.append(f"scale={width}:{height}:flags=lanczos")
            if effective_fps > 0:
                filter_parts.append(f"fps={effective_fps:.6f}")

            command = [
                ffmpeg_path,
                "-y",
                "-i",
                input_path,
            ]
            if max_duration_seconds and max_duration_seconds > 0:
                command.extend(["-t", f"{max_duration_seconds:.3f}"])
            command.extend([
                "-an",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
            ])
            if filter_parts:
                command.extend(["-vf", ",".join(filter_parts)])
            command.append(output_path)

            completed = subprocess.run(
                command,
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            if completed.returncode == 0 and os.path.isfile(output_path):
                return

            logger.warning(
                "ffmpeg transcode failed for occlusion output; falling back to OpenCV writer. stderr=%s",
                (completed.stderr or completed.stdout or "").strip(),
            )
        else:
            logger.warning(
                "ffmpeg was not found in the backend runtime; falling back to OpenCV writer for occlusion output"
            )

        capture = cv2.VideoCapture(input_path)
        if not capture.isOpened():
            raise ValueError("Failed to reopen generated ROSE output video")
        try:
            writer = ProcessingService._open_mp4_writer(output_path, effective_fps, width, height)
        except ValueError as exc:
            capture.release()
            raise ValueError("Failed to create resized output video") from exc

        try:
            source_fps = current_fps if current_fps > 0 else effective_fps
            max_frames = None
            if max_duration_seconds and max_duration_seconds > 0 and source_fps > 0:
                max_frames = max(1, int(round(source_fps * max_duration_seconds)))
            frames_written = 0
            while True:
                if max_frames is not None and frames_written >= max_frames:
                    break
                success, frame = capture.read()
                if not success:
                    break
                if frame.shape[1] != width or frame.shape[0] != height:
                    frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
                writer.write(frame)
                frames_written += 1
        finally:
            capture.release()
            writer.release()

    def _upload_occlusion_video(
        self,
        *,
        dataset: dict[str, Any],
        output_prefix: str,
        local_video_path: str,
        source_task: str,
        prompt_slug: str,
        selection_slug: str,
        subtract_prompt_slug: str | None,
        fps: float,
        frame_count: int,
        width: int,
        height: int,
    ) -> str:
        blob_name = f"{output_prefix.rstrip('/')}/rose_removed.mp4"
        container_client = self.azure_service.get_container_client(dataset["storage_container"])

        with open(local_video_path, "rb") as handle:
            container_client.upload_blob(
                name=blob_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(content_type="video/mp4"),
            )

        existing_doc = self.azure_service.get_cosmos_doc_for_blob(dataset["storage_container"], blob_name) or {}
        misc_tags = [
            "video",
            "occlusion_removed",
            prompt_slug,
            selection_slug,
        ]
        if subtract_prompt_slug:
            misc_tags.append(f"minus_{subtract_prompt_slug}")

        self.azure_service.upsert_cosmos_item(
            {
                "id": existing_doc.get("id", os.urandom(16).hex()),
                "docType": "video_annotation",
                "containerName": dataset["storage_container"],
                "datasetName": output_prefix.rstrip("/"),
                "datasetId": dataset["id"],
                "ownerUserId": dataset["owner_user_id"],
                "visibility": dataset["visibility"],
                "sourceDatasetId": dataset["id"],
                "view": "occl_del",
                "frameName": "rose_removed.mp4",
                "blobPath": blob_name,
                "date": existing_doc.get("date", ""),
                "frameId": None,
                "width": width,
                "height": height,
                "miscTags": list(dict.fromkeys(tag for tag in misc_tags if tag)),
                "task": source_task,
                "maskPrompt": prompt_slug,
                "occlusionSelection": selection_slug,
                "subtractMaskPrompt": subtract_prompt_slug,
                "VLM_tags": existing_doc.get("VLM_tags", []),
                "VLM_tags_by_prompt": existing_doc.get("VLM_tags_by_prompt", {}),
                "VLM_effective_prompts": existing_doc.get("VLM_effective_prompts", {}),
                "VLM_last_prompt_label": existing_doc.get("VLM_last_prompt_label"),
                "vlm": existing_doc.get("vlm"),
                "sharpnessScore": None,
                "clear": None,
                "sourceType": "occlusion_removed_video",
                "frameCount": frame_count,
                "fps": fps,
            }
        )

        return blob_name

    def remove_occlusion(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        route_path = str(data.get("route_path") or "").strip().strip("/")
        include = data.get("include")
        subtract = data.get("subtract")

        if not route_path:
            return {"error": "Missing route_path"}, 400
        if not isinstance(include, dict):
            return {"error": "Missing include selection"}, 400
        if subtract is not None and not isinstance(subtract, dict):
            return {"error": "subtract must be an object when provided"}, 400

        try:
            dataset, _extra_segments, summary = self._validate_occlusion_route(
                current_user=current_user,
                route_path=route_path,
            )
            prompt_options = {
                option["prompt_slug"]: option
                for option in self._build_mask_prompt_options(
                    current_user=current_user,
                    dataset_summary_path=summary["full_path"],
                )
            }

            include_prompt_slug = str(include.get("prompt_slug") or "").strip()
            if not include_prompt_slug:
                raise ValueError("Missing primary prompt selection")
            if include_prompt_slug not in prompt_options:
                raise ValueError(f"Mask prompt '{include_prompt_slug}' was not found")

            route_images = [
                image
                for image in self.dataset_service.get_dataset_images(route_path, current_user)
                if image.get("type") == "image"
            ]
            route_images.sort(key=self._image_sort_key)
            if not route_images:
                raise ValueError("No source images were found in this folder")

            include_prompt_assets = self._collect_prompt_mask_assets(
                current_user=current_user,
                dataset=dataset,
                dataset_summary_path=summary["full_path"],
                prompt_slug=include_prompt_slug,
            )
            include_instance_names = self._resolve_selected_instance_names(
                selection=include,
                prompt_options=prompt_options[include_prompt_slug],
                prompt_assets=include_prompt_assets,
            )
            include_mode = str(include.get("mode") or "").strip().lower()
            include_selection_slug = self._selection_slug(
                include_prompt_slug,
                include_mode,
                include_instance_names[0] if include_mode == "instance" else None,
            )

            subtract_prompt_slug = None
            subtract_instance_names: list[str] = []
            subtract_prompt_assets: dict[str, list[dict[str, Any]]] = {}
            subtract_selection_slug = ""
            if subtract:
                subtract_prompt_slug = str(subtract.get("prompt_slug") or "").strip()
                if not subtract_prompt_slug:
                    raise ValueError("Missing subtraction prompt selection")
                if subtract_prompt_slug not in prompt_options:
                    raise ValueError(f"Subtract prompt '{subtract_prompt_slug}' was not found")

                subtract_prompt_assets = self._collect_prompt_mask_assets(
                    current_user=current_user,
                    dataset=dataset,
                    dataset_summary_path=summary["full_path"],
                    prompt_slug=subtract_prompt_slug,
                )
                subtract_instance_names = self._resolve_selected_instance_names(
                    selection=subtract,
                    prompt_options=prompt_options[subtract_prompt_slug],
                    prompt_assets=subtract_prompt_assets,
                )
                subtract_mode = str(subtract.get("mode") or "").strip().lower()
                subtract_selection_slug = self._selection_slug(
                    subtract_prompt_slug,
                    subtract_mode,
                    subtract_instance_names[0] if subtract_mode == "instance" else None,
                )

            output_selection_slug = include_selection_slug
            if subtract_prompt_slug:
                output_selection_slug = (
                    f"{include_selection_slug}-minus-{subtract_prompt_slug}-{subtract_selection_slug}"
                )

            output_route_path = (
                f"{summary['full_path'].rstrip('/')}/occl_del/{include_prompt_slug}/{output_selection_slug}"
            )
            output_storage_prefix = (
                f"{dataset['storage_prefix'].rstrip('/')}/occl_del/{include_prompt_slug}/{output_selection_slug}"
            )

            source_task = ""
            for image in route_images:
                metadata = image.get("metadata") if isinstance(image, dict) else None
                candidate_task = str((metadata or {}).get("task") or "").strip()
                if candidate_task:
                    source_task = candidate_task
                    break
            source_task = source_task or str(dataset.get("task") or "")

            job_root = tempfile.mkdtemp(prefix="occlusion_job_", dir=DATASET_LIST_DIR)
            source_dir = os.path.join(job_root, "source_frames")
            include_dir = os.path.join(job_root, "include_masks")
            subtract_dir = os.path.join(job_root, "subtract_masks")
            source_video_path = os.path.join(job_root, "source.mp4")
            mask_video_path = os.path.join(job_root, "mask.mp4")
            fetched_output_path = os.path.join(job_root, "rose_removed_raw.mp4")
            final_output_path = os.path.join(job_root, "rose_removed.mp4")

            try:
                self._download_route_images(
                    dataset=dataset,
                    images=route_images,
                    destination_dir=source_dir,
                )
                include_masks = self._download_mask_selection(
                    dataset=dataset,
                    prompt_assets=include_prompt_assets,
                    selected_instance_names=include_instance_names,
                    destination_dir=include_dir,
                )
                subtract_masks = {}
                if subtract_prompt_slug:
                    subtract_masks = self._download_mask_selection(
                        dataset=dataset,
                        prompt_assets=subtract_prompt_assets,
                        selected_instance_names=subtract_instance_names,
                        destination_dir=subtract_dir,
                    )

                video_metadata = self._compose_occlusion_videos(
                    route_images=route_images,
                    source_dir=source_dir,
                    include_masks=include_masks,
                    subtract_masks=subtract_masks,
                    source_video_path=source_video_path,
                    mask_video_path=mask_video_path,
                )
                sample_height, sample_width = self._resolve_sample_size(
                    video_metadata["width"],
                    video_metadata["height"],
                )

                from datara.services import call_lambda_vm

                _remote_output, status_code, error_message = call_lambda_vm.remove_occlusion(
                    local_input_video=source_video_path,
                    local_mask_video=mask_video_path,
                    local_output_video=fetched_output_path,
                    prompt=self._build_occlusion_prompt(include_prompt_slug, subtract_prompt_slug),
                    sample_height=sample_height,
                    sample_width=sample_width,
                )
                if status_code != 200:
                    return {"error": error_message or "Occlusion removal failed"}, status_code

                self._resize_video_to_dimensions(
                    input_path=fetched_output_path,
                    output_path=final_output_path,
                    width=video_metadata["width"],
                    height=video_metadata["height"],
                    fps=video_metadata["fps"],
                )

                self.azure_service.delete_blobs_with_prefix(dataset["storage_container"], output_storage_prefix)
                self.azure_service.delete_cosmos_docs_for_prefix(dataset["storage_container"], output_storage_prefix)
                self._upload_occlusion_video(
                    dataset=dataset,
                    output_prefix=output_storage_prefix,
                    local_video_path=final_output_path,
                    source_task=source_task,
                    prompt_slug=include_prompt_slug,
                    selection_slug=output_selection_slug,
                    subtract_prompt_slug=subtract_prompt_slug,
                    fps=video_metadata["fps"],
                    frame_count=video_metadata["frame_count"],
                    width=video_metadata["width"],
                    height=video_metadata["height"],
                )
            finally:
                shutil.rmtree(job_root, ignore_errors=True)
        except Exception as exc:
            logger.error("Error removing occlusion: %s", exc, exc_info=True)
            return {"error": str(exc)}, 400 if isinstance(exc, ValueError) else 500

        return {
            "message": "Occlusion removal finished successfully.",
            "output_route_path": output_route_path,
            "output_viewer_path": f"/viewer/{output_route_path}",
            "video_name": "rose_removed.mp4",
        }, 200

    def generate_task_intelligence(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        """
        Generates sub-task annotations for a video asset.
        Checks for cached results in Cosmos DB before invoking the remote model.
        """
        source = self._resolve_source_asset(current_user, str(data.get("asset_id") or ""))

        # 1. Check for cache in existing Cosmos doc
        # if source["metadata"].get("taskIntelligence"):
        #     logger.info("Found cached task intelligence for asset %s", data.get("asset_id"))
        #     return {
        #         "message": "Task intelligence retrieved from cache.",
        #         "data": source["metadata"]["taskIntelligence"],
        #         "cached": True,
        #     }, 200

        # 2. If not cached, generate it
        source_dataset = source["dataset"]
        source_blob = source["blob_name"]

        if not any(source_blob.lower().endswith(ext) for ext in (".mp4", ".mov", ".m4v", ".webm")):
            return {"error": "Task intelligence can only be generated for video assets."}, 400

        video_url = self.azure_service.generate_sas_url(
            source_dataset["storage_container"],
            source_blob,
            expiry_hours=2,
        )

        local_json_path = None
        try:
            from datara.services import call_lambda_vm

            logger.info("Running subtask annotator on Lambda VM for: %s", video_url)
            local_json_path, status_code = call_lambda_vm.generate_task_intelligence(video_url)

            if status_code != 200 or not local_json_path:
                return {"error": "Failed to generate task intelligence on the Lambda VM."}, status_code or 500

            with open(local_json_path, "r") as f:
                raw_subtasks = json.load(f)

            # Format the output
            formatted_subtasks = []
            for st in raw_subtasks:
                formatted_subtasks.append({
                    "subtask_name": str(st.get("sub_task", "unknown")).title(),
                    "start_time": f"Frame {st.get('start_frame', 0)}",
                    "end_time": f"Frame {st.get('end_frame', 0)}",
                    "description": f"Model detected: {st.get('sub_task', 'unknown')}",
                })

            task_name = str(source["metadata"].get("task") or "Automated Video Breakdown").strip()
            dataset_summary = self.sql_store.build_dataset_summary(source_dataset, current_user)

            generated_json = {
                "tasks": [
                    {
                        "task_name": task_name,
                        "description": f"Extracted from {dataset_summary['full_path']}",
                        "start_time": f"Frame {raw_subtasks[0].get('start_frame', 0)}" if raw_subtasks else "Start",
                        "end_time": f"Frame {raw_subtasks[-1].get('end_frame', 0)}" if raw_subtasks else "End",
                        "subtasks": formatted_subtasks,
                    }
                ]
            }

            # 3. Store in Cosmos DB
            cosmos_doc = source["metadata"]
            cosmos_doc["taskIntelligence"] = generated_json
            self.azure_service.upsert_cosmos_item(cosmos_doc)

            return {
                "message": "Task intelligence generated and stored successfully.",
                "data": generated_json,
                "cached": False,
            }, 200

        except Exception as e:
            logger.error("generate_task_intelligence error: %s", e, exc_info=True)
            return {"error": str(e)}, 500
        finally:
            if local_json_path and os.path.exists(local_json_path):
                try:
                    os.remove(local_json_path)
                except OSError:
                    pass

    def generate_video_to_video_views(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        """
        Generates a new video view for a video asset using Lyra Gen3C on the Lambda VM.
        Checks for cached results in Cosmos DB before invoking the remote model.
        """
        source = self._resolve_source_asset(current_user, str(data.get("asset_id") or ""))

        # Check Cache in Cosmos DB <- Remove, we have a database
        # if source["metadata"].get("videoToVideoViews"):
        #     logger.info("Found cached video-to-video views for asset %s", data.get("asset_id"))
        #     cached = source["metadata"]["videoToVideoViews"]
        #     # Rebuild proxy_url in case it was stored before this field existed
        #     if "proxy_url" not in cached and "blob_name" in cached:
        #         source_dataset_cached = source["dataset"]
        #         cached["proxy_url"] = f"/api/proxy/{self.dataset_service.encode_asset_id(source_dataset_cached['id'], cached['blob_name'])}"
        #     return {
        #         "message": "Video-to-video views retrieved from cache.",
        #         "data": cached,
        #         "cached": True,
        #     }, 200

        source_dataset = source["dataset"]
        source_blob = source["blob_name"]

        if not any(source_blob.lower().endswith(ext) for ext in (".mp4", ".mov", ".m4v", ".webm")):
            return {"error": "Video-to-Video views can only be generated for video assets."}, 400

        # Generate a SAS URL so the Lambda VM can download the video directly from Azure.
        # Expiry is set generously to cover the full VIPE + Gen3C runtime.
        video_url = self.azure_service.generate_sas_url(
            source_dataset["storage_container"],
            source_blob,
            expiry_hours=3,
        )
        video_name = os.path.splitext(os.path.basename(source_blob))[0]
        trajectory = str(data.get("trajectory") or "left").strip()
        if trajectory not in ("up", "down", "left", "right", "zoom_in", "zoom_out"):
            return {"error": f"Invalid trajectory '{trajectory}'. Must be one of: up, down, left, right, zoom_in, zoom_out."}, 400

        # Check whether a cached VIPE zip already exists in blob storage for this asset.
        # If found, pass its SAS URL to the lambda so VIPE can be skipped.
        vipe_zip_blob = f"{source_dataset['storage_prefix'].rstrip('/')}/new_angle_videos/{video_name}_vipe_output.zip"
        vipe_zip_url = None
        try:
            self.azure_service.get_container_client(
                source_dataset["storage_container"]
            ).get_blob_client(vipe_zip_blob).get_blob_properties()
            vipe_zip_url = self.azure_service.generate_sas_url(
                source_dataset["storage_container"],
                vipe_zip_blob,
                expiry_hours=3,
            )
            logger.info("Found cached VIPE zip for asset: %s", source_blob)
        except Exception:
            logger.info("No cached VIPE zip found for asset: %s — will run VIPE fresh", source_blob)

        job_root = tempfile.mkdtemp(prefix="lyra_v2v_job_", dir=DATASET_LIST_DIR)
        local_output_video = os.path.join(job_root, f"{video_name}_{trajectory}_generated.mp4")

        try:
            from datara.services import call_lambda_vm

            logger.info("Running Lyra v2v on Lambda VM for asset: %s", source_blob)
            result_path, status_code = call_lambda_vm.generate_video_to_video(
                video_url=video_url,
                local_output_video=local_output_video,
                vipe_zip_url=vipe_zip_url,
                trajectory=trajectory,
            )

            if status_code != 200 or not result_path:
                return {"error": "Failed to generate video-to-video views on the Lambda VM."}, status_code or 500

            output_blob_name = f"{source_dataset['storage_prefix'].rstrip('/')}/new_angle_videos/{video_name}_{trajectory}_generated.mp4"
            container_client = self.azure_service.get_container_client(source_dataset["storage_container"])
            with open(local_output_video, "rb") as fh:
                container_client.upload_blob(
                    name=output_blob_name,
                    data=fh,
                    overwrite=True,
                    content_settings=ContentSettings(content_type="video/mp4"),
                )

            # Upload the VIPE zip so it can be reused on future runs.
            local_vipe_zip = os.path.join(job_root, "vipe_output.zip")
            if os.path.isfile(local_vipe_zip):
                with open(local_vipe_zip, "rb") as fh:
                    container_client.upload_blob(
                        name=vipe_zip_blob,
                        data=fh,
                        overwrite=True,
                        content_settings=ContentSettings(content_type="application/zip"),
                    )
                logger.info("Uploaded VIPE zip to blob: %s", vipe_zip_blob)

            generated_at = datetime.now(timezone.utc).isoformat()
            source_meta  = source["metadata"]

            # Cosmos annotation for the Gen3C output video (metadata-only, not browseable)
            gen3c_existing = self.azure_service.get_cosmos_doc_for_blob(
                source_dataset["storage_container"], output_blob_name
            ) or {}
            self.azure_service.upsert_cosmos_item({
                "id":              gen3c_existing.get("id", os.urandom(16).hex()),
                "docType":         "gen3c_v2v_output",
                "containerName":   source_dataset["storage_container"],
                "datasetName":     source_dataset["storage_prefix"],
                "datasetId":       source_dataset["id"],
                "ownerUserId":     source_dataset["owner_user_id"],
                "visibility":      source_dataset["visibility"],
                "sourceDatasetId": source_dataset["id"],
                "sourceBlobPath":  source_blob,
                "view":            "gen3c",
                "frameName":       os.path.basename(output_blob_name),
                "blobPath":        output_blob_name,
                "date":            source_meta.get("date", ""),
                "frameId":         None,
                "width":           source_meta.get("width"),
                "height":          source_meta.get("height"),
                "fps":             source_meta.get("fps"),
                "frameCount":      source_meta.get("frameCount"),
                "miscTags":        ["gen3c", "new_angle_video"],
                "task":            source_meta.get("task", ""),
                "sourceType":      "gen3c_output",
                "generatedAt":     generated_at,
            })

            # Cosmos annotation for the VIPE zip (cache tracking)
            vipe_existing = self.azure_service.get_cosmos_doc_for_blob(
                source_dataset["storage_container"], vipe_zip_blob
            ) or {}
            self.azure_service.upsert_cosmos_item({
                "id":              vipe_existing.get("id", os.urandom(16).hex()),
                "docType":         "vipe",
                "containerName":   source_dataset["storage_container"],
                "datasetName":     source_dataset["storage_prefix"],
                "datasetId":       source_dataset["id"],
                "ownerUserId":     source_dataset["owner_user_id"],
                "visibility":      source_dataset["visibility"],
                "sourceDatasetId": source_dataset["id"],
                "sourceBlobPath":  source_blob,
                "view":            "vipe",
                "frameName":       os.path.basename(vipe_zip_blob),
                "blobPath":        vipe_zip_blob,
                "date":            source_meta.get("date", ""),
                "frameId":         None,
                "miscTags":        ["gen3c", "vipe", "new_angle_video"],
                "task":            source_meta.get("task", ""),
                "sourceType":      "vipe_output",
                "generatedAt":     generated_at,
            })

            output_asset_id = self.dataset_service.encode_asset_id(source_dataset["id"], output_blob_name)
            v2v_result = {
                "blob_name": output_blob_name,
                "container": source_dataset["storage_container"],
                "generated_at": generated_at,
                "proxy_url": f"/api/proxy/{output_asset_id}",
            }

            cosmos_doc = source["metadata"]
            cosmos_doc["NewAngleViews"] = v2v_result
            self.azure_service.upsert_cosmos_item(cosmos_doc)

            return {
                "message": "Video-to-video generation completed successfully.",
                "data": v2v_result,
                "cached": False,
            }, 200

        except Exception as e:
            logger.error("generate_video_to_video_views error: %s", e, exc_info=True)
            return {"error": str(e)}, 500
        finally:
            shutil.rmtree(job_root, ignore_errors=True)


    def _resolve_source_asset(self, current_user: dict[str, Any], asset_id: str) -> dict[str, Any]:
        if not asset_id:
            raise ValueError("Missing asset_id")
        return self.dataset_service.resolve_asset(asset_id, current_user)

    @staticmethod
    def _slugify_sequence_name(value: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9]+", "_", str(value or "").strip())
        slug = slug.strip("_")
        return slug or "sequence"

    @staticmethod
    def _probe_video_file(video_path: str) -> dict[str, Any]:
        capture = cv2.VideoCapture(video_path)
        try:
            fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
            width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
            height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            if width <= 0 or height <= 0:
                success, frame = capture.read()
                if success and frame is not None:
                    height, width = frame.shape[:2]
                    frame_count = max(frame_count, 1)
        finally:
            capture.release()

        return {
            "fps": fps if fps > 0 else 30.0,
            "width": width if width > 0 else 1280,
            "height": height if height > 0 else 720,
            "frame_count": frame_count if frame_count > 0 else 1,
        }

    def _upload_hand_mesh_video(
        self,
        *,
        dataset: dict[str, Any],
        output_prefix: str,
        local_video_path: str,
        source_task: str,
        seq_slug: str,
        source_asset_id: str,
    ) -> str:
        filename = os.path.basename(local_video_path)
        blob_name = f"{output_prefix.rstrip('/')}/{filename}"
        video_metadata = self._probe_video_file(local_video_path)
        container_client = self.azure_service.get_container_client(dataset["storage_container"])

        with open(local_video_path, "rb") as handle:
            container_client.upload_blob(
                name=blob_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(content_type="video/mp4"),
            )

        existing_doc = self.azure_service.get_cosmos_doc_for_blob(dataset["storage_container"], blob_name) or {}
        self.azure_service.upsert_cosmos_item(
            {
                "id": existing_doc.get("id", os.urandom(16).hex()),
                "docType": "video_annotation",
                "containerName": dataset["storage_container"],
                "datasetName": output_prefix.rstrip("/"),
                "datasetId": dataset["id"],
                "ownerUserId": dataset["owner_user_id"],
                "visibility": dataset["visibility"],
                "sourceDatasetId": dataset["id"],
                "view": "hand_mesh",
                "frameName": filename,
                "blobPath": blob_name,
                "date": existing_doc.get("date", ""),
                "frameId": None,
                "width": video_metadata["width"],
                "height": video_metadata["height"],
                "miscTags": ["video", "hand_mesh", seq_slug],
                "task": source_task,
                "handMeshSequence": seq_slug,
                "sourceAssetId": source_asset_id,
                "VLM_tags": existing_doc.get("VLM_tags", []),
                "VLM_tags_by_prompt": existing_doc.get("VLM_tags_by_prompt", {}),
                "VLM_effective_prompts": existing_doc.get("VLM_effective_prompts", {}),
                "VLM_last_prompt_label": existing_doc.get("VLM_last_prompt_label"),
                "vlm": existing_doc.get("vlm"),
                "sharpnessScore": None,
                "clear": None,
                "sourceType": "hand_mesh_video",
                "frameCount": video_metadata["frame_count"],
                "fps": video_metadata["fps"],
            }
        )
        return blob_name

    def _upload_hand_mesh_artifact(
        self,
        *,
        dataset: dict[str, Any],
        output_prefix: str,
        local_file_path: str,
        source_task: str,
        seq_slug: str,
        source_asset_id: str,
    ) -> str:
        filename = os.path.basename(local_file_path)
        blob_name = f"{output_prefix.rstrip('/')}/{filename}"
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        container_client = self.azure_service.get_container_client(dataset["storage_container"])

        with open(local_file_path, "rb") as handle:
            container_client.upload_blob(
                name=blob_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type),
            )

        existing_doc = self.azure_service.get_cosmos_doc_for_blob(dataset["storage_container"], blob_name) or {}
        self.azure_service.upsert_cosmos_item(
            {
                "id": existing_doc.get("id", os.urandom(16).hex()),
                "docType": "hand_mesh_artifact",
                "containerName": dataset["storage_container"],
                "datasetName": output_prefix.rstrip("/"),
                "datasetId": dataset["id"],
                "ownerUserId": dataset["owner_user_id"],
                "visibility": dataset["visibility"],
                "sourceDatasetId": dataset["id"],
                "view": "hand_mesh",
                "frameName": filename,
                "blobPath": blob_name,
                "date": existing_doc.get("date", ""),
                "frameId": None,
                "miscTags": ["hand_mesh", "hand_mesh_artifact", seq_slug],
                "task": source_task,
                "handMeshSequence": seq_slug,
                "sourceAssetId": source_asset_id,
                "sourceType": "hand_mesh_artifact",
            }
        )
        return blob_name

    def _upload_hand_mesh_mcap(
    self,
    *,
    dataset: dict[str, Any],
    output_prefix: str,
    local_file_path: str,
    source_task: str,
    seq_slug: str,
    source_asset_id: str,
    ) -> str:
        filename = os.path.basename(local_file_path)
        blob_name = f"{output_prefix.rstrip('/')}/{filename}"
        container_client = self.azure_service.get_container_client(dataset["storage_container"])

        with open(local_file_path, "rb") as handle:
            container_client.upload_blob(
                name=blob_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(
                    content_type="application/octet-stream",
                    content_disposition=f'attachment; filename="{filename}"',
                ),
            )

        existing_doc = self.azure_service.get_cosmos_doc_for_blob(dataset["storage_container"], blob_name) or {}
        self.azure_service.upsert_cosmos_item(
            {
                "id": existing_doc.get("id", os.urandom(16).hex()),
                "docType": "hand_mesh_mcap",
                "containerName": dataset["storage_container"],
                "datasetName": output_prefix.rstrip("/"),
                "datasetId": dataset["id"],
                "ownerUserId": dataset["owner_user_id"],
                "visibility": dataset["visibility"],
                "sourceDatasetId": dataset["id"],
                "view": "hand_mesh",
                "frameName": filename,
                "blobPath": blob_name,
                "date": existing_doc.get("date", ""),
                "frameId": None,
                "miscTags": ["hand_mesh", "hand_mesh_mcap", seq_slug],
                "task": source_task,
                "handMeshSequence": seq_slug,
                "sourceAssetId": source_asset_id,
                "sourceType": "hand_mesh_mcap",
                "downloadable": True,
                "foxgloveCompatible": True,
            }
        )
        return blob_name

    def _resolve_hand_mesh_video_url(self, video_url: str, current_user: dict[str, Any]) -> str:
        video_url = str(video_url or "").strip()
        if not video_url:
            raise ValueError("Missing video_url")

        if video_url.startswith("/api/proxy/"):
            asset_id = video_url.split("/api/proxy/", 1)[1].split("?", 1)[0].strip()
            source = self._resolve_source_asset(current_user, asset_id)
            return self.azure_service.generate_sas_url(
                source["dataset"]["storage_container"],
                source["blob_name"],
                expiry_hours=2,
            )

        if video_url.startswith("/"):
            raise ValueError("video_url must be an absolute URL")

        parsed = urlparse(video_url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("video_url must use http or https")
        return video_url

    def _viewer_route_path_for_blob(
        self,
        dataset: dict[str, Any],
        blob_name: str,
        current_user: dict[str, Any],
    ) -> str:
        summary = self.sql_store.build_dataset_summary(dataset, current_user)
        base_path = summary["full_path"].rstrip("/")
        prefix = dataset["storage_prefix"].rstrip("/")
        normalised_blob = blob_name.strip("/")
        if not normalised_blob.startswith(f"{prefix}/") and normalised_blob != prefix:
            return base_path

        relative = normalised_blob[len(prefix) :].lstrip("/")
        parent = os.path.dirname(relative)
        if not parent:
            return base_path
        return f"{base_path}/{parent}".replace("\\", "/")

    def generate_hand_mesh(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        pipeline = str(data.get("pipeline") or "default").strip() or "default"
        video_url = str(data.get("video_url") or "").strip()
        route_path = str(data.get("route_path") or "").strip().strip("/")
        asset_id = str(data.get("asset_id") or "").strip()
        source_asset_id = asset_id

        if not video_url and not asset_id:
            return {"error": "Missing video_url or asset_id"}, 400

        try:
            if asset_id and not video_url:
                source = self._resolve_source_asset(current_user, asset_id)
                source_dataset = source["dataset"]
                source_blob = source["blob_name"]
                if not any(source_blob.lower().endswith(ext) for ext in (".mp4", ".mov", ".m4v", ".webm")):
                    return {"error": "Hand mesh generation can only be run on video assets."}, 400

                effective_video_url = self.azure_service.generate_sas_url(
                    source_dataset["storage_container"],
                    source_blob,
                    expiry_hours=2,
                )
                dataset = source_dataset
                if not route_path:
                    route_path = self._viewer_route_path_for_blob(dataset, source_blob, current_user)
                video_basename = os.path.basename(source_blob)
            else:
                effective_video_url = self._resolve_hand_mesh_video_url(video_url, current_user)
                if video_url.startswith("/api/proxy/"):
                    proxy_asset_id = video_url.split("/api/proxy/", 1)[1].split("?", 1)[0].strip()
                    if proxy_asset_id:
                        source_asset_id = proxy_asset_id
                dataset, _extra_segments = self.sql_store.resolve_dataset_route(route_path, current_user)
                parsed_video_path = urlparse(effective_video_url).path
                video_basename = os.path.basename(parsed_video_path)

            self.sql_store.assert_user_can_access_dataset(dataset, current_user)
        except (ValueError, PermissionError, FileNotFoundError) as exc:
            return {"error": str(exc)}, 400 if isinstance(exc, ValueError) else 403

        if not route_path:
            return {"error": "Missing route_path"}, 400

        if not any(video_basename.lower().endswith(ext) for ext in (".mp4", ".mov", ".m4v", ".webm")):
            return {"error": "Hand mesh generation requires a direct video URL"}, 400
        seq_slug = self._slugify_sequence_name(
            str(data.get("seq") or os.path.splitext(video_basename)[0])
        )
        dataset_summary = self.sql_store.build_dataset_summary(dataset, current_user)
        output_route_path = f"{dataset_summary['full_path'].rstrip('/')}/hand_mesh/{seq_slug}"
        output_storage_prefix = f"{dataset['storage_prefix'].rstrip('/')}/hand_mesh/{seq_slug}"
        output_video_prefix = f"{output_storage_prefix}/videos"
        output_artifact_prefix = f"{output_storage_prefix}/artifacts"
        output_mcap_prefix = f"{output_storage_prefix}/mcaps"
        source_task = str(dataset.get("task") or "").strip()

        job_root = tempfile.mkdtemp(prefix="hand_mesh_job_", dir=DATASET_LIST_DIR)
        local_output_dir = os.path.join(job_root, "outputs")

        try:
            from datara.services import call_lambda_vm

            local_video_paths, local_artifact_paths, local_mcap_paths, status_code, error_message = call_lambda_vm.generate_hand_mesh(
                video_url=effective_video_url,
                seq_name=seq_slug,
                pipeline=pipeline,
                local_output_dir=local_output_dir,
            )
            if status_code != 200 or (not local_video_paths and not local_artifact_paths and not local_mcap_paths):
                return {"error": error_message or "Hand mesh generation failed"}, status_code or 500

            self.azure_service.delete_blobs_with_prefix(
                dataset["storage_container"],
                output_storage_prefix,
            )
            self.azure_service.delete_cosmos_docs_for_prefix(
                dataset["storage_container"],
                output_storage_prefix,
            )

            uploaded_videos: list[str] = []
            uploaded_artifacts: list[str] = []
            uploaded_mcaps: list[str] = []
            for local_video_path in local_video_paths:
                blob_name = self._upload_hand_mesh_video(
                    dataset=dataset,
                    output_prefix=output_video_prefix,
                    local_video_path=local_video_path,
                    source_task=source_task,
                    seq_slug=seq_slug,
                    source_asset_id=source_asset_id,
                )
                uploaded_videos.append(os.path.basename(blob_name))

            for local_artifact_path in local_artifact_paths:
                blob_name = self._upload_hand_mesh_artifact(
                    dataset=dataset,
                    output_prefix=output_artifact_prefix,
                    local_file_path=local_artifact_path,
                    source_task=source_task,
                    seq_slug=seq_slug,
                    source_asset_id=source_asset_id,
                )
                uploaded_artifacts.append(os.path.basename(blob_name))

            for local_mcap_path in local_mcap_paths:
                blob_name = self._upload_hand_mesh_mcap(
                    dataset=dataset,
                    output_prefix=output_mcap_prefix,
                    local_file_path=local_mcap_path,
                    source_task=source_task,
                    seq_slug=seq_slug,
                    source_asset_id=source_asset_id,
                )
                uploaded_mcaps.append(blob_name)
            
            mcap_download_urls: list[str] = []
            for blob_name_full in [f"{output_mcap_prefix}/{os.path.basename(p)}" for p in local_mcap_paths]:
                sas_url = self.azure_service.generate_sas_url(
                    dataset["storage_container"],
                    blob_name_full,
                    expiry_hours=24,
                )
                mcap_download_urls.append(sas_url)
        except Exception as exc:
            logger.error("generate_hand_mesh error: %s", exc, exc_info=True)
            return {"error": str(exc)}, 400 if isinstance(exc, ValueError) else 500
        finally:
            shutil.rmtree(job_root, ignore_errors=True)

        return {
            "message": "Hand mesh outputs generated and uploaded successfully.",
            "output_route_path": output_route_path,
            "output_viewer_path": f"/viewer/{output_route_path}",
            "output_videos": uploaded_videos,
            "output_artifacts": uploaded_artifacts,
            "output_mcaps" : uploaded_mcaps,
            "output_mcap_download_urls": mcap_download_urls,
            "seq": seq_slug,
        }, 200

    @staticmethod
    def _normalise_sentence(text: str) -> str:
        text = str(text or "").strip()
        if not text:
            return ""
        if text[-1] not in ".!?":
            text += "."
        return text

    def _resolve_vlm_prompt(self, data: dict[str, Any], cosmos_doc: dict[str, Any] | None) -> tuple[str, str]:
        prompt_mode = str(data.get("prompt_mode", "") or "").strip().lower()
        prompt_preset = str(data.get("prompt_preset", "") or "").strip()
        custom_prompt = str(data.get("custom_prompt", "") or "").strip()
        legacy_prompt = str(data.get("prompt", "") or "").strip()
        task = str((cosmos_doc or {}).get("task", "") or "").strip()

        if prompt_mode == "custom" or (not prompt_preset and (custom_prompt or legacy_prompt)):
            prompt_label = custom_prompt or legacy_prompt
            if not prompt_label:
                raise ValueError("Missing custom prompt")
            return prompt_label, prompt_label

        if not prompt_preset:
            prompt_preset = "describe_image"
        if prompt_preset not in self.PRESET_VLM_PROMPTS:
            raise ValueError(f"Unsupported VLM preset: {prompt_preset}")

        prompt_label = self.PRESET_VLM_PROMPTS[prompt_preset]
        effective_prompt = prompt_label
        if prompt_preset == "task_completed" and task:
            effective_prompt = f"The task is the following: {self._normalise_sentence(task)} {prompt_label}"
        return prompt_label, effective_prompt

    def generate_ego(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        prompt = str(data.get("prompt") or "").strip()
        if not prompt:
            return {"error": "Missing prompt"}, 400

        source = self._resolve_source_asset(current_user, str(data.get("asset_id") or ""))
        source_dataset = source["dataset"]
        source_blob = source["blob_name"]
        source_image_url = self.azure_service.generate_sas_url(source_dataset["storage_container"], source_blob, expiry_hours=2)
        source_task = str(source["metadata"].get("task") or source_dataset.get("task") or "")
        target_dataset = source_dataset
        local_root = ""
        try:
            local_root = os.path.join(DATASET_LIST_DIR, target_dataset["storage_prefix"])

            from datara.services import call_lambda_vm

            _local_path, status_code = call_lambda_vm.generate_ego_image(
                prompt,
                source_image_url,
                target_dataset["storage_container"],
                target_dataset["storage_prefix"],
            )
            if status_code != 200:
                return {"error": "Ego generation failed"}, status_code

            self._upload_to_azure(
                dataset=target_dataset,
                local_process_dir=local_root,
                date_val=str(data.get("date") or ""),
                misc_tags=list(data.get("tags", [])) if isinstance(data.get("tags"), list) else [],
                task=source_task,
                create_video_annotation=False,
                upload_view="egos",
                source_dataset_id=source_dataset["id"],
            )
        except Exception as exc:
            logger.error("Error generating ego image: %s", exc, exc_info=True)
            return {"error": str(exc)}, 500
        finally:
            if local_root:
                shutil.rmtree(local_root, ignore_errors=True)

        return {
            "message": "Ego view processed and uploaded successfully",
            "dataset": self.sql_store.build_dataset_summary(target_dataset, current_user),
        }, 200

    def generate_corner_case(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        prompt = str(data.get("prompt") or "").strip()
        if not prompt:
            return {"error": "Missing prompt"}, 400

        source = self._resolve_source_asset(current_user, str(data.get("asset_id") or ""))
        source_dataset = source["dataset"]
        source_blob = source["blob_name"]
        source_image_url = self.azure_service.generate_sas_url(source_dataset["storage_container"], source_blob, expiry_hours=2)
        source_task = str(source["metadata"].get("task") or source_dataset.get("task") or "")
        target_dataset = source_dataset
        local_root = ""
        try:
            local_root = os.path.join(DATASET_LIST_DIR, target_dataset["storage_prefix"])

            from datara.services import call_lambda_vm

            _local_path, status_code = call_lambda_vm.invoke_corner_case(
                prompt,
                source_image_url,
                target_dataset["storage_container"],
                target_dataset["storage_prefix"],
            )
            if status_code != 200:
                return {"error": "Corner case generation failed"}, status_code

            requested_tags = list(data.get("tags", [])) if isinstance(data.get("tags"), list) else []
            misc_tags = []
            for tag in requested_tags + ["corner_case", "addit", "sam2", "attention_points_sam"]:
                tag_text = str(tag or "").strip()
                if tag_text and tag_text not in misc_tags:
                    misc_tags.append(tag_text)

            self._upload_to_azure(
                dataset=target_dataset,
                local_process_dir=local_root,
                date_val=str(data.get("date") or ""),
                misc_tags=misc_tags,
                task=source_task,
                create_video_annotation=False,
                upload_view="corner_images_controlnet",
                source_dataset_id=source_dataset["id"],
            )
        except Exception as exc:
            logger.error("Error generating corner case: %s", exc, exc_info=True)
            return {"error": str(exc)}, 500
        finally:
            if local_root:
                shutil.rmtree(local_root, ignore_errors=True)

        return {
            "message": "Corner case generation completed successfully",
            "dataset": self.sql_store.build_dataset_summary(target_dataset, current_user),
        }, 200

    def create_vlm_tags(self, current_user: dict[str, Any], data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        source = self._resolve_source_asset(current_user, str(data.get("asset_id") or ""))
        prompt_label, effective_prompt = self._resolve_vlm_prompt(data, source["metadata"])
        source_image_url = self.azure_service.generate_sas_url(
            source["dataset"]["storage_container"],
            source["blob_name"],
            expiry_hours=2,
        )
        local_json_path = None
        try:
            from datara.services import call_lambda_vm

            local_json_path, status_code = call_lambda_vm.run_vlm_tags(effective_prompt, source_image_url)
            if status_code != 200 or not local_json_path:
                return {"error": "VLM tags invocation failed"}, status_code or 500

            append_script = os.path.join(UTILS_DIR, "append_tags_to_image.py")
            subprocess.check_call(
                [
                    sys.executable,
                    append_script,
                    "--container_name",
                    source["dataset"]["storage_container"],
                    "--blob_path",
                    source["blob_name"],
                    "--json_path",
                    local_json_path,
                    "--prompt_label",
                    prompt_label,
                    "--effective_prompt",
                    effective_prompt,
                ],
                cwd=BACKEND_DIR,
            )
        except subprocess.CalledProcessError as exc:
            logger.error("append_tags_to_image failed: %s", exc)
            return {"error": str(exc)}, 500
        except Exception as exc:
            logger.error("Error creating VLM tags: %s", exc, exc_info=True)
            return {"error": str(exc)}, 500
        finally:
            if local_json_path and os.path.exists(local_json_path):
                try:
                    os.remove(local_json_path)
                except OSError:
                    pass

        return {"message": "VLM tags created and appended successfully"}, 200
