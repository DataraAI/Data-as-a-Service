"""Video and image processing service"""

import os
import json
import sys
import shutil
import subprocess
from datetime import datetime
from typing import Dict, Any

import cv2
import gdown

from datara.logging import logger

# Get the backend directory path and utils path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UTILS_DIR = os.path.join(BACKEND_DIR, "utils")
# All upload scripts receive input_dir under this base (backend/utils/dataset_list)
DATASET_LIST_DIR = os.path.join(UTILS_DIR, "dataset_list")


class ProcessingService:
    """Service for processing videos and generating ego views"""

    def __init__(self, azure_service, dataset_service):
        """
        Initialize processing service

        Args:
            azure_service: Azure service instance
            dataset_service: Dataset service instance
        """
        self.azure_service = azure_service
        self.dataset_service = dataset_service
        self.upload_folder = "uploads"
        os.makedirs(self.upload_folder, exist_ok=True)

    def process_video(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process video from Google Drive and upload to Azure

        Args:
            data: Request data containing gdrive_link, output_name, etc.

        Returns:
            Processing result
        """
        gdrive_link = data.get("gdrive_link")
        output_name = data.get("output_name")
        upload_type = data.get("upload_type", "video")

        if not gdrive_link:
            raise ValueError("No Google Drive link provided")

        # Check if dataset already exists
        if output_name:
            try:
                existing_blobs = list(
                    self.azure_service.container_client.list_blobs(
                        name_starts_with=f"{output_name}/",
                        results_per_page=1
                    )
                )
                if existing_blobs:
                    raise ValueError(f"Dataset '{output_name}' already exists")
            except Exception as e:
                logger.error(f"Error checking existing dataset: {e}")
                raise

        # Get metadata
        date_val = data.get("date")
        misc_tags = data.get("tags", [])

        # Setup local processing directory
        ts = int(datetime.now().timestamp())

        if output_name:
            dataset_basename = os.path.basename(output_name)
        else:
            dataset_basename = f"dataset_{ts}"

        local_process_dir = os.path.join(DATASET_LIST_DIR, dataset_basename)

        try:
            if os.path.exists(local_process_dir):
                shutil.rmtree(local_process_dir)
            os.makedirs(os.path.join(local_process_dir, "orig"), exist_ok=True)

            if upload_type == "folder":
                self._process_folder(gdrive_link, local_process_dir, dataset_basename)
            else:
                self._process_video_file(gdrive_link, local_process_dir, dataset_basename, ts)

            # Upload to Azure (input_dir is backend/utils/dataset_list/<dataset_basename>)
            self._upload_to_azure(
                local_process_dir,
                output_name or dataset_basename,
                date_val,
                misc_tags
            )

            # Cleanup
            if os.path.exists(local_process_dir):
                shutil.rmtree(local_process_dir)

            logger.info(f"Video processing completed successfully: {output_name}")
            return {"message": "Data processed and uploaded successfully"}

        except Exception as e:
            logger.error(f"Error processing video: {e}", exc_info=True)
            if os.path.exists(local_process_dir):
                shutil.rmtree(local_process_dir)
            raise

    def _process_folder(self, gdrive_link: str, local_process_dir: str, dataset_basename: str) -> None:
        """
        Process folder from Google Drive

        Args:
            gdrive_link: Google Drive folder link
            local_process_dir: Local directory for processing
            dataset_basename: Dataset base name
        """
        ts = int(datetime.now().timestamp())
        temp_download_dir = os.path.join(self.upload_folder, f"temp_folder_{ts}")
        os.makedirs(temp_download_dir, exist_ok=True)

        try:
            logger.info(f"Downloading folder from GDrive: {gdrive_link}")
            downloaded = gdown.download_folder(
                gdrive_link,
                output=temp_download_dir,
                quiet=False,
                use_cookies=False
            )

            if not downloaded:
                raise ValueError("Folder download failed or link invalid")

            # Find and process images
            valid_exts = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp')
            image_files = []

            for root, dirs, files in os.walk(temp_download_dir):
                for file in files:
                    if file.lower().endswith(valid_exts):
                        image_files.append(os.path.join(root, file))

            image_files.sort()

            # Copy images to processing directory
            count = 0
            pad_width = len(str(len(image_files)))

            for img_path in image_files:
                ext = os.path.splitext(img_path)[1].lower()
                new_filename = f"{dataset_basename}_{count:0{pad_width}d}{ext}"
                dest_path = os.path.join(local_process_dir, "orig", new_filename)
                shutil.copy2(img_path, dest_path)
                count += 1

            logger.info(f"Processed {count} images from folder")

        finally:
            if os.path.exists(temp_download_dir):
                shutil.rmtree(temp_download_dir)

    def _process_video_file(
        self,
        gdrive_link: str,
        local_process_dir: str,
        dataset_basename: str,
        ts: int
    ) -> None:
        """
        Process video file from Google Drive

        Args:
            gdrive_link: Google Drive video link
            local_process_dir: Local directory for processing
            dataset_basename: Dataset base name
            ts: Timestamp
        """
        video_filename = f"video_{ts}.mp4"
        video_path = os.path.join(self.upload_folder, video_filename)

        try:
            logger.info(f"Downloading video from GDrive: {gdrive_link}")
            downloaded_path = gdown.download(
                gdrive_link,
                video_path,
                quiet=False,
                fuzzy=True
            )

            if not downloaded_path:
                raise ValueError("Download failed or link invalid")

            # Use video's native FPS so we don't downsample (e.g. 60 fps video stays 60 fps)
            cap = cv2.VideoCapture(downloaded_path)
            try:
                video_fps = cap.get(cv2.CAP_PROP_FPS)
                target_fps = float(video_fps) if video_fps and video_fps > 0 else 30.0
                logger.info(f"Video FPS: {target_fps:.2f}")
            finally:
                cap.release()

            # Generate frames from video (--output_dir = backend/utils/dataset_list/<name>)
            logger.info(f"Generating frames from video: {dataset_basename}")
            cmd = [
                sys.executable,
                os.path.join(UTILS_DIR, "generate_orig_frames.py"),
                "--video_path", downloaded_path,
                "--output_name", dataset_basename,
                "--target_fps", str(target_fps),
                "--output_dir", local_process_dir,
            ]

            subprocess.check_call(cmd)
            logger.info("Frame generation completed")

        finally:
            if os.path.exists(video_path):
                os.remove(video_path)

    def _upload_to_azure(
        self,
        local_process_dir: str,
        output_name: str,
        date_val: str,
        misc_tags: list
    ) -> None:
        """
        Upload processed images to Azure

        Args:
            local_process_dir: Local processing directory
            output_name: Output name in Azure
            date_val: Date metadata
            misc_tags: Miscellaneous tags
        """
        logger.info(f"Uploading to Azure: {output_name}")

        cmd = [
            sys.executable,
            os.path.join(UTILS_DIR, "upload_frames_to_azure.py"),
            "--container_name", self.azure_service.container_name,
            "--output_name", output_name,
            "--input_dir", local_process_dir,
            "--view", "orig",
            "--date", date_val or "",
            "--tags", json.dumps(misc_tags)
        ]

        subprocess.check_call(cmd)
        logger.info("Upload to Azure completed")

    def generate_ego(self, data: Dict[str, Any]) -> tuple[str, int]:
        """
        Generate ego view from original image

        Args:
            data: Request data containing imageURL, prompt, etc.

        Returns:
            Generation result
        """
        logger.info(f"generate_ego() called with data: {data}")
        try:
            prompt = data.get("prompt")
            image_url = data.get("imageURL")
            date_val = data.get("date")
            misc_tags = data.get("tags", [])

            if not image_url:
                raise ValueError("No imageURL provided")

            logger.info(f"Generating ego view with prompt: {prompt}")

            # Extract path components from URL
            container_name = self.azure_service.container_name
            blob_path_start = image_url.index(container_name)
            blob_path_end = image_url.index("/orig") + 5
            blob_path = image_url[blob_path_start:blob_path_end]

            path_components = blob_path.split("/")
            path_components[-1] = "egos"
            output_name = "/".join(path_components[1:4])

            # Import and call ego generation (saves under dataset_list/{output_name}/egos/)
            local_image_path = None
            logger.info("Calling lambda VM for ego generation")
            try:
                from datara.services import call_lambda_vm
                logger.info(f"Generating ego view with prompt: {prompt}")
                logger.info(f"Image URL: {image_url}")
                logger.info(f"Container name: {container_name}")
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
                # Upload ego images from dataset_list to cloud
                input_dir = os.path.join(DATASET_LIST_DIR, output_name)
                cmd = [
                    sys.executable,
                    os.path.join(UTILS_DIR, "upload_frames_to_azure.py"),
                    "--container_name", container_name,
                    "--output_name", output_name,
                    "--input_dir", input_dir,
                    "--view", "egos",
                    "--date", date_val or "",
                    "--tags", json.dumps(misc_tags),
                ]
                subprocess.check_call(cmd)

                # Cleanup local dataset_list/egos for this output
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
        """
        Generate corner case from original image

        Args:
            data: Request data containing imageURL, prompt, etc.

        Returns:
            Generation result
        """
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

            # Extract path components from URL
            container_name = self.azure_service.container_name
            blob_path_start = image_url.index(container_name)
            blob_path_end = image_url.index("/egos") + 5
            blob_path = image_url[blob_path_start:blob_path_end]

            path_components = blob_path.split("/")
            path_components[-1] = "corner_images_controlnet"
            output_name = "/".join(path_components[1:4])
            container_name = self.azure_service.container_name

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

            # Upload corner_images_controlnet from dataset_list to cloud
            input_dir = os.path.join(DATASET_LIST_DIR, output_name)
            cmd = [
                sys.executable,
                os.path.join(UTILS_DIR, "upload_frames_to_azure.py"),
                "--container_name", container_name,
                "--output_name", output_name,
                "--input_dir", input_dir,
                "--view", "corner_images_controlnet",
                "--date", date_val or "",
                "--tags", json.dumps(tags),
            ]
            subprocess.check_call(cmd)

            # Cleanup local dataset_list/corner_images_controlnet for this output
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
        Create VLM tags for an ego or corner case image: call Lambda VM to produce
        a JSON with VLM_tags, then append those tags to the image's Cosmos DB document.
        """
        logger.info(f"create_vlm_tags() called with data: {data}")
        try:
            prompt = data.get("prompt")
            image_url = data.get("imageURL")

            if not prompt or not str(prompt).strip():
                return {"error": "Missing or empty 'prompt' in request body"}, 400
            if not image_url or not str(image_url).strip():
                return {"error": "Missing or empty 'imageURL' in request body"}, 400

            prompt = str(prompt).strip()
            image_url = str(image_url).strip()

            try:
                from datara.services import call_lambda_vm
                local_json_path, status_code = call_lambda_vm.run_vlm_tags(prompt, image_url)
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
                    [sys.executable, append_script, "--egoURL", image_url, "--json_path", local_json_path],
                    cwd=BACKEND_DIR,
                )
            finally:
                if os.path.exists(local_json_path):
                    try:
                        os.remove(local_json_path)
                    except OSError:
                        pass

            return {"message": "VLM tags created and appended successfully"}, 200
        except subprocess.CalledProcessError as e:
            logger.error(f"append_tags_to_image failed: {e}")
            return {"error": f"Appending tags failed: {str(e)}"}, 500
        except Exception as e:
            logger.error(f"create_vlm_tags error: {e}", exc_info=True)
            return {"error": str(e)}, 500
