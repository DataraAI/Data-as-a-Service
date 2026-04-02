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

    def list_all_dataset_paths(self) -> List[Dict[str, Any]]:
        """
        Recursively list all folder paths in the dataset tree.

        Returns:
            List of folder items with name/full_path/type
        """
        try:
            all_paths: List[Dict[str, Any]] = []
            seen: set[str] = set()

            def walk(path: str = "") -> None:
                items = self.list_datasets(path)
                for item in items:
                    full_path = item.get("full_path")
                    if not full_path or full_path in seen:
                        continue

                    seen.add(full_path)
                    all_paths.append(item)
                    walk(full_path)

            walk("")
            return all_paths
        except Exception as e:
            logger.error(f"Error recursively listing dataset paths: {e}")
            raise

    @staticmethod
    def _extract_frame_id_value(*candidates: Optional[Any]) -> Optional[str]:
        """
        Try to recover a usable frame ID from several candidate values.

        Priority:
        1. stored Cosmos frameId if numeric
        2. Cosmos frameName
        3. blob filename

        This is needed because some ego/corner image filenames include prompt
        suffixes, and older uploads may have stored a non-numeric frameId like
        'degrees' instead of the original frame number.
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

    def get_dataset_images(self, dataset_name: str) -> List[Dict[str, Any]]:
        """
        Get images and metadata for a dataset

        Args:
            dataset_name: Name of dataset

        Returns:
            List of image data with metadata
        """
        try:
            # Fetch metadata from Cosmos DB
            metadata_map = self.azure_service.get_cosmos_metadata(dataset_name)

            image_list = []
            base_prefix = f"{dataset_name}/"

            # List blobs for dataset
            blobs = self.azure_service.list_blobs(base_prefix)

            for blob in blobs:
                # Check if image or 3D model
                is_image = blob.name.lower().endswith(('.png', '.jpg', '.jpeg'))
                is_3d = blob.name.lower().endswith(('.stl', '.obj', '.glb', '.gltf'))

                if not (is_image or is_3d):
                    continue

                # Generate SAS URL
                try:
                    url = self.azure_service.generate_sas_url(blob.name)
                except Exception as e:
                    logger.warning(f"Could not generate SAS URL for {blob.name}: {e}")
                    url = f"{self.azure_service.account_url}{self.azure_service.container_name}/{blob.name}"

                # Get metadata
                cosmos_doc = metadata_map.get(blob.name, {})

                # Recover frame ID robustly
                recovered_frame_id = self._extract_frame_id_value(
                    cosmos_doc.get("frameId"),
                    cosmos_doc.get("frameName"),
                    blob.name,
                )

                # Process tags
                tags = list(cosmos_doc.get("miscTags", []))

                # Add view tags
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
                            # Fallback for current naming style:
                            # frontGrille_000_Rotate_right_45_degrees
                            match = re.search(r"_(\d+)_(.+)$", stem)
                            if match:
                                ego_name = match.group(2)
                                if ego_name:
                                    tags.append(f"ego_{ego_name}")
                    except Exception:
                        pass

                # Add quality tags
                if cosmos_doc.get("clear") is True:
                    tags.append("clear")
                elif cosmos_doc.get("clear") is False:
                    tags.append("blurry")

                # Construct image data
                media_type = "3d" if is_3d else "image"

                image_data = {
                    "id": blob.name,
                    "url": url,
                    "proxy_url": f"/api/proxy/{blob.name}",
                    "name": os.path.basename(blob.name),
                    "type": media_type,
                    "tags": list(set(tags)),
                    "metadata": {
                        "uuid": cosmos_doc.get("id"),
                        "date": cosmos_doc.get("date"),
                        "uploaded_at": cosmos_doc.get("_ts"),
                        "frame_id": recovered_frame_id,
                        "width": cosmos_doc.get("width"),
                        "height": cosmos_doc.get("height"),
                        "sharpness": cosmos_doc.get("sharpnessScore"),
                        "view": cosmos_doc.get("view")
                    }
                }

                image_list.append(image_data)

            logger.info(f"Retrieved {len(image_list)} images for dataset {dataset_name}")
            return image_list

        except Exception as e:
            logger.error(f"Error getting images for dataset {dataset_name}: {e}")
            raise