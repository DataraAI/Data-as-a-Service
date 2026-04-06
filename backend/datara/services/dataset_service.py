"""Dataset management service"""

import os
import re
from typing import List, Dict, Any, Optional

from datara.logging import logger


class DatasetService:
    """Service for dataset operations"""

    def __init__(self, azure_service):
        """
        Initialize dataset service

        Args:
            azure_service: Azure service instance
        """
        self.azure_service = azure_service

    def list_datasets(self, path: str = "") -> List[Dict[str, Any]]:
        """
        List datasets

        Args:
            path: Optional path prefix

        Returns:
            List of datasets
        """
        try:
            return self.azure_service.list_datasets(path)
        except Exception as e:
            logger.error(f"Error listing datasets: {e}")
            raise

    @staticmethod
    def _extract_frame_id_value(*candidates: Optional[Any]) -> Optional[str]:
        """
        Try to recover a usable frame ID from several candidate values.
        """
        for candidate in candidates:
            if candidate is None:
                continue

            text = str(candidate).strip()
            if not text:
                continue

            base = os.path.basename(text)
            stem = os.path.splitext(base)[0]

            if stem.isdigit():
                return stem

            match = re.search(r"_(\d+)(?:_|$)", stem)
            if match:
                return match.group(1)

        return None

    @staticmethod
    def _clean_tag_list(value: Any) -> List[str]:
        if value is None:
            return []

        if isinstance(value, dict):
            tags: List[str] = []
            for _, nested in value.items():
                tags.extend(DatasetService._clean_tag_list(nested))
            return list(dict.fromkeys(tags))

        if isinstance(value, (list, tuple, set)):
            items = [str(item).strip() for item in value if str(item).strip()]
            return list(dict.fromkeys(items))

        text = str(value).strip()
        return [text] if text else []

    @staticmethod
    def _normalise_vlm_history(value: Any) -> Dict[str, List[str]]:
        if not isinstance(value, dict):
            return {}

        out: Dict[str, List[str]] = {}
        for prompt_label, prompt_tags in value.items():
            label = str(prompt_label).strip()
            if not label:
                continue
            out[label] = DatasetService._clean_tag_list(prompt_tags)
        return out

    @staticmethod
    def _normalise_string_map(value: Any) -> Dict[str, str]:
        if not isinstance(value, dict):
            return {}
        out: Dict[str, str] = {}
        for key, item in value.items():
            key_text = str(key).strip()
            item_text = str(item).strip()
            if key_text and item_text:
                out[key_text] = item_text
        return out

    def get_dataset_images(self, dataset_name: str) -> List[Dict[str, Any]]:
        """
        Get images and metadata for a dataset

        Args:
            dataset_name: Name of dataset

        Returns:
            List of image data with metadata
        """
        try:
            metadata_map = self.azure_service.get_cosmos_metadata(dataset_name)

            image_list = []
            base_prefix = f"{dataset_name}/"

            blobs = self.azure_service.list_blobs(base_prefix)

            for blob in blobs:
                is_image = blob.name.lower().endswith((".png", ".jpg", ".jpeg"))
                is_3d = blob.name.lower().endswith((".stl", ".obj", ".glb", ".gltf"))

                if not (is_image or is_3d):
                    continue

                try:
                    url = self.azure_service.generate_sas_url(blob.name)
                except Exception as e:
                    logger.warning(f"Could not generate SAS URL for {blob.name}: {e}")
                    url = f"{self.azure_service.account_url}{self.azure_service.container_name}/{blob.name}"

                cosmos_doc = metadata_map.get(blob.name, {})

                recovered_frame_id = self._extract_frame_id_value(
                    cosmos_doc.get("frameId"),
                    cosmos_doc.get("frameName"),
                    blob.name,
                )

                tags = list(cosmos_doc.get("miscTags", []))

                latest_vlm_tags = self._clean_tag_list(cosmos_doc.get("VLM_tags"))
                tags.extend(latest_vlm_tags)

                vlm_history = self._normalise_vlm_history(cosmos_doc.get("VLM_tags_by_prompt"))
                for prompt_label, prompt_tags in vlm_history.items():
                    for prompt_tag in prompt_tags:
                        tags.append(prompt_tag)
                        tags.append(f"{prompt_label}: {prompt_tag}")

                if "/orig/" in blob.name:
                    tags.append("exocentric")
                elif "/egos/" in blob.name:
                    tags.append("ego_view")
                    try:
                        fname = os.path.basename(blob.name)
                        stem = os.path.splitext(fname)[0]

                        if "_ego_" in stem:
                            ego_name = stem.split("_ego_", 1)[1]
                            if ego_name:
                                tags.append(f"ego_{ego_name}")
                        else:
                            match = re.search(r"_(\d+)_(.+)$", stem)
                            if match:
                                ego_name = match.group(2)
                                if ego_name:
                                    tags.append(f"ego_{ego_name}")
                    except Exception:
                        pass

                if cosmos_doc.get("clear") is True:
                    tags.append("clear")
                elif cosmos_doc.get("clear") is False:
                    tags.append("blurry")

                media_type = "3d" if is_3d else "image"

                image_data = {
                    "id": blob.name,
                    "url": url,
                    "proxy_url": f"/api/proxy/{blob.name}",
                    "name": os.path.basename(blob.name),
                    "type": media_type,
                    "tags": list(dict.fromkeys(tags)),
                    "metadata": {
                        "uuid": cosmos_doc.get("id"),
                        "date": cosmos_doc.get("date"),
                        "uploaded_at": cosmos_doc.get("_ts"),
                        "frame_id": recovered_frame_id,
                        "width": cosmos_doc.get("width"),
                        "height": cosmos_doc.get("height"),
                        "sharpness": cosmos_doc.get("sharpnessScore"),
                        "view": cosmos_doc.get("view"),
                        "task": cosmos_doc.get("task"),
                        "vlm_tags": latest_vlm_tags,
                        "vlm_tags_by_prompt": vlm_history,
                        "vlm_effective_prompts": self._normalise_string_map(cosmos_doc.get("VLM_effective_prompts")),
                        "vlm_last_prompt_label": cosmos_doc.get("VLM_last_prompt_label"),
                    },
                }

                image_list.append(image_data)

            logger.info(f"Retrieved {len(image_list)} images for dataset {dataset_name}")
            return image_list

        except Exception as e:
            logger.error(f"Error getting images for dataset {dataset_name}: {e}")
            raise
