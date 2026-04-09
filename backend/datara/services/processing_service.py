"""Video and image processing service"""

import os
import json
import sys
import shutil
import subprocess
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from urllib.parse import urlparse

import cv2
import gdown

from datara.logging import logger

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UTILS_DIR = os.path.join(BACKEND_DIR, "utils")
DATASET_LIST_DIR = os.path.join(UTILS_DIR, "dataset_list")


class ProcessingService:
    """Service for processing videos and generating ego views"""

    PRESET_VLM_PROMPTS = {
        "describe_image": "Describe the image.",
        "task_completed": "Has the task been completed?",
        "sensor_modalities": "What are the sensor modalities detected?",
    }

    def __init__(self, azure_service, dataset_service):
        self.azure_service = azure_service
        self.dataset_service = dataset_service
        self.upload_folder = "uploads"
        os.makedirs(self.upload_folder, exist_ok=True)

    def process_video(
        self,
        data: Dict[str, Any],
        *,
        local_video_path: Optional[str] = None,
        local_image_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        gdrive_link = data.get("gdrive_link")
        output_name = data.get("output_name")
        upload_type = data.get("upload_type", "video")
        task = str(data.get("task", "") or "").strip()

        has_local = bool(local_video_path or local_image_dir)
        if local_video_path and local_image_dir:
            raise ValueError("Cannot use both a local video file and a local image folder")
        if has_local:
            if local_video_path and upload_type != "video":
                raise ValueError("Local file upload requires upload_type 'video'")
            if local_image_dir and upload_type != "folder":
                raise ValueError("Local folder upload requires upload_type 'folder'")
        if not has_local and not gdrive_link:
            raise ValueError("No Google Drive link provided")

        if output_name:
            try:
                existing_blobs = list(
                    self.azure_service.container_client.list_blobs(
                        name_starts_with=f"{output_name}/",
                        results_per_page=1,
                    )
                )
                if existing_blobs:
                    raise ValueError(f"Dataset '{output_name}' already exists")
            except Exception as e:
                logger.error(f"Error checking existing dataset: {e}")
                raise

        date_val = data.get("date")
        misc_tags = data.get("tags", [])

        ts = int(datetime.now().timestamp())
        dataset_basename = os.path.basename(output_name) if output_name else f"dataset_{ts}"
        local_process_dir = os.path.join(DATASET_LIST_DIR, dataset_basename)

        try:
            if os.path.exists(local_process_dir):
                shutil.rmtree(local_process_dir)
            os.makedirs(os.path.join(local_process_dir, "orig"), exist_ok=True)

            if local_video_path:
                self._ingest_video_path(local_video_path, local_process_dir, dataset_basename)
            elif local_image_dir:
                self._ingest_image_directory(
                    local_image_dir, local_process_dir, dataset_basename, recursive=False
                )
            elif upload_type == "folder":
                self._process_folder(gdrive_link, local_process_dir, dataset_basename)
            else:
                self._process_video_file(gdrive_link, local_process_dir, dataset_basename, ts)

            self._upload_to_azure(
                local_process_dir=local_process_dir,
                output_name=output_name or dataset_basename,
                date_val=date_val,
                misc_tags=misc_tags,
                task=task,
                create_video_annotation=(upload_type == "video"),
            )

            if os.path.exists(local_process_dir):
                shutil.rmtree(local_process_dir)

            logger.info(f"Video processing completed successfully: {output_name}")
            return {"message": "Data processed and uploaded successfully"}

        except Exception as e:
            logger.error(f"Error processing video: {e}", exc_info=True)
            if os.path.exists(local_process_dir):
                shutil.rmtree(local_process_dir)
            raise

    def _ingest_image_directory(
        self,
        image_source_dir: str,
        local_process_dir: str,
        dataset_basename: str,
        *,
        recursive: bool = True,
    ) -> None:
        valid_exts = (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp")
        image_files = []

        if recursive:
            for root, _dirs, files in os.walk(image_source_dir):
                for file in files:
                    if file.lower().endswith(valid_exts):
                        image_files.append(os.path.join(root, file))
        else:
            try:
                with os.scandir(image_source_dir) as it:
                    for entry in it:
                        if entry.is_file() and entry.name.lower().endswith(valid_exts):
                            image_files.append(entry.path)
            except FileNotFoundError:
                pass

        image_files.sort()
        if not image_files:
            raise ValueError("No supported image files found (.png, .jpg, .jpeg, .bmp, .tiff, .webp)")

        count = 0
        pad_width = len(str(len(image_files)))

        for img_path in image_files:
            ext = os.path.splitext(img_path)[1].lower()
            new_filename = f"{dataset_basename}_{count:0{pad_width}d}{ext}"
            dest_path = os.path.join(local_process_dir, "orig", new_filename)
            shutil.copy2(img_path, dest_path)
            count += 1

        logger.info(f"Processed {count} images from folder")

    def _process_folder(self, gdrive_link: str, local_process_dir: str, dataset_basename: str) -> None:
        ts = int(datetime.now().timestamp())
        temp_download_dir = os.path.join(self.upload_folder, f"temp_folder_{ts}")
        os.makedirs(temp_download_dir, exist_ok=True)

        try:
            logger.info(f"Downloading folder from GDrive: {gdrive_link}")
            downloaded = gdown.download_folder(
                gdrive_link,
                output=temp_download_dir,
                quiet=False,
                use_cookies=False,
            )

            if not downloaded:
                raise ValueError("Folder download failed or link invalid")

            self._ingest_image_directory(temp_download_dir, local_process_dir, dataset_basename)

        finally:
            if os.path.exists(temp_download_dir):
                shutil.rmtree(temp_download_dir)

    def _process_video_file(
        self,
        gdrive_link: str,
        local_process_dir: str,
        dataset_basename: str,
        ts: int,
    ) -> None:
        video_filename = f"video_{ts}.mp4"
        video_path = os.path.join(self.upload_folder, video_filename)

        try:
            logger.info(f"Downloading video from GDrive: {gdrive_link}")
            downloaded_path = gdown.download(
                gdrive_link,
                video_path,
                quiet=False,
                fuzzy=True,
            )

            if not downloaded_path:
                raise ValueError("Download failed or link invalid")

            self._ingest_video_path(downloaded_path, local_process_dir, dataset_basename)

        finally:
            if os.path.exists(video_path):
                os.remove(video_path)

    def _ingest_video_path(
        self, video_path: str, local_process_dir: str, dataset_basename: str
    ) -> None:
        cap = cv2.VideoCapture(video_path)
        try:
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            target_fps = float(video_fps) if video_fps and video_fps > 0 else 30.0
            logger.info(f"Video FPS: {target_fps:.2f}")
        finally:
            cap.release()

        logger.info(f"Generating frames from video: {dataset_basename}")
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
        ]

        subprocess.check_call(cmd)
        logger.info("Frame generation completed")

    def _upload_to_azure(
        self,
        local_process_dir: str,
        output_name: str,
        date_val: str,
        misc_tags: list,
        task: str = "",
        create_video_annotation: bool = False,
    ) -> None:
        logger.info(f"Uploading to Azure: {output_name}")

        cmd = [
            sys.executable,
            os.path.join(UTILS_DIR, "upload_frames_to_azure.py"),
            "--container_name",
            self.azure_service.container_name,
            "--output_name",
            output_name,
            "--input_dir",
            local_process_dir,
            "--view",
            "orig",
            "--date",
            date_val or "",
            "--tags",
            json.dumps(misc_tags),
            "--task",
            task or "",
        ]

        if create_video_annotation:
            cmd.append("--create_video_annotation")

        subprocess.check_call(cmd)
        logger.info("Upload to Azure completed")

    @staticmethod
    def _blob_path_from_url(url: str) -> Tuple[str, str]:
        parsed = urlparse(url)
        path = (parsed.path or "").strip("/")
        parts = path.split("/", 1)
        if len(parts) != 2:
            raise ValueError(f"Cannot parse blob path from URL: {url}")
        return parts[0], parts[1]

    def _get_cosmos_doc_for_image(self, image_url: str) -> Optional[Dict[str, Any]]:
        if not self.azure_service.cosmos_client:
            logger.warning("Cosmos DB not configured, cannot fetch image metadata")
            return None

        container_name, blob_path = self._blob_path_from_url(image_url)
        database = self.azure_service.cosmos_client.get_database_client(self.azure_service.cosmos_database)
        container = database.get_container_client(self.azure_service.cosmos_container)

        query = "SELECT * FROM c WHERE c.containerName = @cn AND c.blobPath = @bp"
        items = list(
            container.query_items(
                query=query,
                parameters=[
                    {"name": "@cn", "value": container_name},
                    {"name": "@bp", "value": blob_path},
                ],
                enable_cross_partition_query=True,
            )
        )
        return items[0] if items else None

    @staticmethod
    def _normalise_sentence(text: str) -> str:
        text = str(text or "").strip()
        if not text:
            return ""
        if text[-1] not in ".!?":
            text += "."
        return text

    def _resolve_vlm_prompt(self, data: Dict[str, Any], cosmos_doc: Optional[Dict[str, Any]]) -> Tuple[str, str]:
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
            task_sentence = self._normalise_sentence(task)
            effective_prompt = f"The task is the following: {task_sentence} {prompt_label}"

        return prompt_label, effective_prompt

    def generate_ego(self, data: Dict[str, Any]) -> tuple[str, int]:
        logger.info(f"generate_ego() called with data: {data}")
        try:
            prompt = data.get("prompt")
            image_url = data.get("imageURL")
            date_val = data.get("date")
            misc_tags = data.get("tags", [])

            if not image_url:
                raise ValueError("No imageURL provided")

            logger.info(f"Generating ego view with prompt: {prompt}")

            container_name = self.azure_service.container_name
            blob_path_start = image_url.index(container_name)
            blob_path_end = image_url.index("/orig") + 5
            blob_path = image_url[blob_path_start:blob_path_end]

            path_components = blob_path.split("/")
            path_components[-1] = "egos"
            output_name = "/".join(path_components[1:4])

            source_doc = self._get_cosmos_doc_for_image(image_url) or {}
            task = str(source_doc.get("task", "") or "").strip()

            local_image_path = None
            logger.info("Calling lambda VM for ego generation")
            try:
                from datara.services import call_lambda_vm

                local_image_path, status_code = call_lambda_vm.generate_ego_image(
                    prompt,
                    image_url,
                    container_name,
                    output_name,
                )
            except (ImportError, AttributeError):
                logger.warning("call_lambda_vm module not found, skipping ego generation")
                return {"message": "Ego generation module not available"}, 500
            except Exception as e:
                logger.error(f"Error in ego generation: {e}")
                return {"message": f"Ego generation failed: {str(e)}"}, 500

            if status_code == 200 and local_image_path:
                input_dir = os.path.join(DATASET_LIST_DIR, output_name)
                cmd = [
                    sys.executable,
                    os.path.join(UTILS_DIR, "upload_frames_to_azure.py"),
                    "--container_name",
                    container_name,
                    "--output_name",
                    output_name,
                    "--input_dir",
                    input_dir,
                    "--view",
                    "egos",
                    "--date",
                    date_val or "",
                    "--tags",
                    json.dumps(misc_tags),
                    "--task",
                    task,
                ]
                subprocess.check_call(cmd)

                ego_local_dir = os.path.join(DATASET_LIST_DIR, output_name, "egos")
                if os.path.exists(ego_local_dir):
                    shutil.rmtree(ego_local_dir)
                logger.info("Ego view generation completed")
            elif status_code != 200:
                return {"message": "Error generating ego view"}, status_code

            return {"message": "Ego view processed and uploaded successfully"}, 200

        except Exception as e:
            logger.error(f"Error generating ego: {e}", exc_info=True)
            return {"message": f"Ego generation failed: {str(e)}"}, 500

    def generate_corner_case(self, data: Dict[str, Any]) -> tuple[str, int]:
        logger.info(f"generate_corner_case() called with data: {data}")

        try:
            prompt = data.get("prompt")
            image_url = data.get("imageURL")
            tags = data.get("tags", [])
            date_val = data.get("date", "")

            if not prompt:
                return {"error": "Missing 'prompt' in request body"}, 400
            if not image_url:
                return {"error": "Missing 'imageURL' in request body"}, 400

            logger.info(f"Generating corner case with prompt: {prompt}")

            container_name = self.azure_service.container_name
            blob_path_start = image_url.index(container_name)
            blob_path_end = image_url.index("/egos") + 5
            blob_path = image_url[blob_path_start:blob_path_end]

            path_components = blob_path.split("/")
            path_components[-1] = "corner_images_controlnet"
            output_name = "/".join(path_components[1:4])

            source_doc = self._get_cosmos_doc_for_image(image_url) or {}
            task = str(source_doc.get("task", "") or "").strip()

            try:
                from datara.services import call_lambda_vm

                local_path, status_code = call_lambda_vm.invoke_corner_case(
                    prompt, image_url, container_name, output_name
                )
            except (ImportError, AttributeError):
                logger.warning("call_lambda_vm module not found, skipping corner case generation")
                return {"message": "Corner case generation module not available"}, 500
            except Exception as e:
                logger.error(f"Error in corner case generation: {e}")
                return {"message": f"Corner case generation failed: {str(e)}"}, 500

            if status_code != 200 or not local_path:
                return {"error": "Corner case invocation failed"}, status_code or 500

            input_dir = os.path.join(DATASET_LIST_DIR, output_name)
            cmd = [
                sys.executable,
                os.path.join(UTILS_DIR, "upload_frames_to_azure.py"),
                "--container_name",
                container_name,
                "--output_name",
                output_name,
                "--input_dir",
                input_dir,
                "--view",
                "corner_images_controlnet",
                "--date",
                date_val or "",
                "--tags",
                json.dumps(tags),
                "--task",
                task,
            ]
            subprocess.check_call(cmd)

            corner_local_dir = os.path.join(DATASET_LIST_DIR, output_name, "corner_images_controlnet")
            if os.path.exists(corner_local_dir):
                shutil.rmtree(corner_local_dir)
            logger.info("Corner case generation completed")

            return {"message": "Corner case generation completed successfully"}, 200
        except subprocess.CalledProcessError as e:
            print(f"Corner case upload script failed: {e}")
            return {"error": f"Corner case generation failed: {str(e)}"}, 500
        except Exception as e:
            print(f"Corner case error: {e}")
            return {"error": f"Corner case generation failed: {str(e)}"}, 500

    def create_vlm_tags(self, data: Dict[str, Any]) -> tuple[str, int]:
        """
        Create VLM tags for an image, using the existing SaaS script unchanged.
        DaaS resolves presets/task context, then wraps the returned flat tag list
        into grouped prompt history in Cosmos.
        """
        logger.info(f"create_vlm_tags() called with data: {data}")
        try:
            image_url = data.get("imageURL")

            if not image_url or not str(image_url).strip():
                return {"error": "Missing or empty 'imageURL' in request body"}, 400

            image_url = str(image_url).strip()
            cosmos_doc = self._get_cosmos_doc_for_image(image_url)

            prompt_label, effective_prompt = self._resolve_vlm_prompt(data, cosmos_doc)
            logger.info(f"Resolved VLM prompt label: {prompt_label}")
            logger.info(f"Resolved VLM effective prompt: {effective_prompt}")

            try:
                from datara.services import call_lambda_vm
                local_json_path, status_code = call_lambda_vm.run_vlm_tags(effective_prompt, image_url)
            except (ImportError, AttributeError):
                logger.warning("call_lambda_vm module not found")
                return {"error": "VLM tags module not available"}, 500
            except Exception as e:
                logger.error(f"Error in run_vlm_tags: {e}")
                return {"error": f"VLM tags generation failed: {str(e)}"}, 500

            if status_code != 200 or not local_json_path or not os.path.exists(local_json_path):
                return {"error": "VLM tags invocation failed or no JSON produced"}, status_code or 500

            try:
                append_script = os.path.join(UTILS_DIR, "append_tags_to_image.py")
                subprocess.check_call(
                    [
                        sys.executable,
                        append_script,
                        "--egoURL",
                        image_url,
                        "--json_path",
                        local_json_path,
                        "--prompt_label",
                        prompt_label,
                        "--effective_prompt",
                        effective_prompt,
                    ],
                    cwd=BACKEND_DIR,
                )
            finally:
                if os.path.exists(local_json_path):
                    try:
                        os.remove(local_json_path)
                    except OSError:
                        pass

            return {"message": "VLM tags created and appended successfully"}, 200
        except ValueError as e:
            logger.error(f"create_vlm_tags validation error: {e}")
            return {"error": str(e)}, 400
        except subprocess.CalledProcessError as e:
            logger.error(f"append_tags_to_image failed: {e}")
            return {"error": f"Appending tags failed: {str(e)}"}, 500
        except Exception as e:
            logger.error(f"create_vlm_tags error: {e}", exc_info=True)
            return {"error": str(e)}, 500
