"""Dataset upload and derived-asset processing service."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any

import cv2
import gdown

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
        return "private"

    @staticmethod
    def _auto_named_variant(source_name: str, prompt: str, suffix: str) -> str:
        stem = "".join(ch.lower() if ch.isalnum() else "-" for ch in prompt.strip())[:24].strip("-")
        stem = stem or suffix
        stem = stem[:24]
        return f"{source_name}-{suffix}-{stem}".strip("-")

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
        finally:
            cap.release()

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
            dataset["storage_container"],
            "--output_name",
            dataset["storage_prefix"],
            "--input_dir",
            local_process_dir,
            "--view",
            azure_view,
            "--date",
            date_val or "",
            "--tags",
            json.dumps(misc_tags),
            "--task",
            task or "",
            "--dataset_id",
            dataset["id"],
            "--owner_user_id",
            dataset["owner_user_id"],
            "--visibility",
            dataset["visibility"],
        ]
        if source_dataset_id:
            cmd.extend(["--source_dataset_id", source_dataset_id])
        if create_video_annotation:
            cmd.append("--create_video_annotation")
        subprocess.check_call(cmd)

    def _resolve_source_asset(self, current_user: dict[str, Any], asset_id: str) -> dict[str, Any]:
        if not asset_id:
            raise ValueError("Missing asset_id")
        return self.dataset_service.resolve_asset(asset_id, current_user)

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
        visibility = self._resolve_visibility(data.get("visibility"), source_dataset)
        category = str(data.get("category") or source_dataset["category"]).strip()
        brand = str(data.get("brand") or source_dataset["brand"]).strip()
        requested_name = str(data.get("dataset_name") or "").strip()
        owner_user = (
            self.sql_store.get_user_by_id(source_dataset["owner_user_id"])
            if visibility == "private" and source_dataset["visibility"] == "private"
            else current_user
        )
        owner_user = owner_user or current_user
        if visibility == "public":
            preferred_name = requested_name or self._auto_named_variant(source_dataset["dataset_name"], prompt, "ego")
            dataset_name = self.sql_store.reserve_unique_dataset_name(
                owner_user=owner_user,
                visibility=visibility,
                category=category,
                brand=brand,
                preferred_name=preferred_name,
            )
        else:
            dataset_name = requested_name or self._auto_named_variant(source_dataset["dataset_name"], prompt, "ego")

        target_dataset = self._build_dataset_row(
            owner_user=owner_user,
            created_by_user=current_user,
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            task=str(source["metadata"].get("task") or ""),
            source_kind="derived_ego",
            source_dataset_id=source_dataset["id"],
        )

        local_root = os.path.join(DATASET_LIST_DIR, target_dataset["storage_prefix"])
        try:
            from datara.services import call_lambda_vm

            _local_path, status_code = call_lambda_vm.generate_ego_image(
                prompt,
                source_image_url,
                target_dataset["storage_container"],
                target_dataset["storage_prefix"],
            )
            if status_code != 200:
                self.sql_store.mark_dataset_deleted(target_dataset["id"])
                return {"error": "Ego generation failed"}, status_code

            self._upload_to_azure(
                dataset=target_dataset,
                local_process_dir=local_root,
                date_val=str(data.get("date") or ""),
                misc_tags=list(data.get("tags", [])) if isinstance(data.get("tags"), list) else [],
                task=str(source["metadata"].get("task") or ""),
                create_video_annotation=False,
                upload_view="egos",
                source_dataset_id=source_dataset["id"],
            )
        except Exception as exc:
            self.sql_store.mark_dataset_deleted(target_dataset["id"])
            logger.error("Error generating ego image: %s", exc, exc_info=True)
            return {"error": str(exc)}, 500
        finally:
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
        visibility = self._resolve_visibility(data.get("visibility"), source_dataset)
        category = str(data.get("category") or source_dataset["category"]).strip()
        brand = str(data.get("brand") or source_dataset["brand"]).strip()
        requested_name = str(data.get("dataset_name") or "").strip()
        owner_user = (
            self.sql_store.get_user_by_id(source_dataset["owner_user_id"])
            if visibility == "private" and source_dataset["visibility"] == "private"
            else current_user
        )
        owner_user = owner_user or current_user
        if visibility == "public":
            preferred_name = requested_name or self._auto_named_variant(source_dataset["dataset_name"], prompt, "corner")
            dataset_name = self.sql_store.reserve_unique_dataset_name(
                owner_user=owner_user,
                visibility=visibility,
                category=category,
                brand=brand,
                preferred_name=preferred_name,
            )
        else:
            dataset_name = requested_name or self._auto_named_variant(source_dataset["dataset_name"], prompt, "corner")

        target_dataset = self._build_dataset_row(
            owner_user=owner_user,
            created_by_user=current_user,
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            task=str(source["metadata"].get("task") or ""),
            source_kind="derived_corner_case",
            source_dataset_id=source_dataset["id"],
        )

        local_root = os.path.join(DATASET_LIST_DIR, target_dataset["storage_prefix"])
        try:
            from datara.services import call_lambda_vm

            _local_path, status_code = call_lambda_vm.invoke_corner_case(
                prompt,
                source_image_url,
                target_dataset["storage_container"],
                target_dataset["storage_prefix"],
            )
            if status_code != 200:
                self.sql_store.mark_dataset_deleted(target_dataset["id"])
                return {"error": "Corner case generation failed"}, status_code

            self._upload_to_azure(
                dataset=target_dataset,
                local_process_dir=local_root,
                date_val=str(data.get("date") or ""),
                misc_tags=list(data.get("tags", [])) if isinstance(data.get("tags"), list) else [],
                task=str(source["metadata"].get("task") or ""),
                create_video_annotation=False,
                upload_view="corner_images_controlnet",
                source_dataset_id=source_dataset["id"],
            )
        except Exception as exc:
            self.sql_store.mark_dataset_deleted(target_dataset["id"])
            logger.error("Error generating corner case: %s", exc, exc_info=True)
            return {"error": str(exc)}, 500
        finally:
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
