"""Dataset management service"""

import os
from typing import List, Dict, Any

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

                # Process tags
                tags = list(cosmos_doc.get("miscTags", []))

                # Add view tags
                if "/orig/" in blob.name:
                    tags.append("exocentric")
                elif "/egos/" in blob.name:
                    tags.append("ego_view")
                    try:
                        if "_ego_" in blob.name:
                            fname = os.path.basename(blob.name)
                            parts = fname.split("_ego_")
                            if len(parts) > 1:
                                ego_name = os.path.splitext(parts[1])[0]
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
                        "frame_id": cosmos_doc.get("frameId"),
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

