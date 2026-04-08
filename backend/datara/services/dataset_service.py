"""Dataset management service"""

import os
import re
from typing import List, Dict, Any, Optional

from datara.logging import logger


PRESET_VLM_LABELS = [
    "Describe the image.",
    "Has the task been completed?",
    "What are the sensor modalities detected?",
]


class DatasetService:
    """Service for dataset operations"""

    def __init__(self, azure_service):
        self.azure_service = azure_service

    def list_datasets(self, path: str = "") -> List[Dict[str, Any]]:
        try:
            return self.azure_service.list_datasets(path)
        except Exception as e:
            logger.error(f"Error listing datasets: {e}")
            raise

    def list_all_dataset_paths(self) -> List[str]:
        try:
            return self.azure_service.list_all_dataset_paths()
        except Exception as e:
            logger.error(f"Error listing all dataset paths: {e}")
            raise

    @staticmethod
    def _extract_frame_id_value(*candidates: Optional[Any]) -> Optional[str]:
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

        if isinstance(value, (list, tuple, set)):
            items = [str(item).strip() for item in value if str(item).strip()]
            return list(dict.fromkeys(items))

        if isinstance(value, dict):
            tags: List[str] = []
            for _, nested in value.items():
                tags.extend(DatasetService._clean_tag_list(nested))
            return list(dict.fromkeys(tags))

        text = str(value).strip()
        return [text] if text else []

    @staticmethod
    def _base_vlm_structure() -> Dict[str, Any]:
        return {
            "last_prompt_label": None,
            "runs": {
                prompt_label: {
                    "effective_prompt": prompt_label,
                    "tags": [],
                }
                for prompt_label in PRESET_VLM_LABELS
            },
        }

    @staticmethod
    def _migrate_legacy_vlm(doc: Dict[str, Any]) -> Dict[str, Any]:
        base = DatasetService._base_vlm_structure()

        by_prompt = doc.get("VLM_tags_by_prompt")
        if isinstance(by_prompt, dict):
            for prompt_label, raw_tags in by_prompt.items():
                label = str(prompt_label).strip()
                if not label:
                    continue
                if label not in base["runs"]:
                    base["runs"][label] = {"effective_prompt": label, "tags": []}
                base["runs"][label]["tags"] = DatasetService._clean_tag_list(raw_tags)

        effective_prompts = doc.get("VLM_effective_prompts")
        if isinstance(effective_prompts, dict):
            for prompt_label, prompt_text in effective_prompts.items():
                label = str(prompt_label).strip()
                if not label:
                    continue
                if label not in base["runs"]:
                    base["runs"][label] = {"effective_prompt": label, "tags": []}
                base["runs"][label]["effective_prompt"] = str(prompt_text).strip() or label

        last_prompt_label = doc.get("VLM_last_prompt_label")
        if isinstance(last_prompt_label, str) and last_prompt_label.strip():
            base["last_prompt_label"] = last_prompt_label.strip()

        if base["last_prompt_label"]:
            label = base["last_prompt_label"]
            if not base["runs"].get(label, {}).get("tags"):
                flat_tags = DatasetService._clean_tag_list(doc.get("VLM_tags"))
                if flat_tags:
                    if label not in base["runs"]:
                        base["runs"][label] = {"effective_prompt": label, "tags": []}
                    base["runs"][label]["tags"] = flat_tags

        return base

    @staticmethod
    def _normalise_vlm(value: Any, fallback_doc: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if isinstance(value, dict):
            runs = value.get("runs")
            if isinstance(runs, dict):
                base = DatasetService._base_vlm_structure()
                for prompt_label, run in runs.items():
                    label = str(prompt_label).strip()
                    if not label:
                        continue
                    if isinstance(run, dict):
                        effective_prompt = str(run.get("effective_prompt", label)).strip() or label
                        tags = DatasetService._clean_tag_list(run.get("tags"))
                    else:
                        effective_prompt = label
                        tags = []
                    base["runs"][label] = {
                        "effective_prompt": effective_prompt,
                        "tags": tags,
                    }
                last_prompt_label = value.get("last_prompt_label")
                if isinstance(last_prompt_label, str) and last_prompt_label.strip():
                    base["last_prompt_label"] = last_prompt_label.strip()
                return base

        if fallback_doc is not None:
            return DatasetService._migrate_legacy_vlm(fallback_doc)

        return DatasetService._base_vlm_structure()

    def get_dataset_images(self, dataset_name: str) -> List[Dict[str, Any]]:
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
                vlm = self._normalise_vlm(cosmos_doc.get("vlm"), fallback_doc=cosmos_doc)

                recovered_frame_id = self._extract_frame_id_value(
                    cosmos_doc.get("frameId"),
                    cosmos_doc.get("frameName"),
                    blob.name,
                )

                tags = list(cosmos_doc.get("miscTags", []))

                # Only prompt-scoped VLM tags are added to img.tags. These are what the accordion on the left filters on.
                for prompt_label, run in vlm["runs"].items():
                    prompt_tags = self._clean_tag_list(run.get("tags"))
                    for prompt_tag in prompt_tags:
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
                        "vlm": vlm,
                    },
                }

                image_list.append(image_data)

            logger.info(f"Retrieved {len(image_list)} images for dataset {dataset_name}")
            return image_list

        except Exception as e:
            logger.error(f"Error getting images for dataset {dataset_name}: {e}")
            raise
