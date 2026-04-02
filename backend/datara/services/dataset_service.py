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

        Priority:
        1. stored Cosmos frameId if numeric
        2. Cosmos frameName
        3. blob filename
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

    def _get_dataset_metadata_map(self, dataset_name: str) -> Dict[str, Any]:
        """Fetch metadata from Cosmos DB for a specific dataset"""
        if not self.azure_service.cosmos_client:
            logger.warning(f"Cosmos DB not configured, no metadata for {dataset_name}")
            return {}

        try:
            database = self.azure_service.cosmos_client.get_database_client(self.azure_service.cosmos_database)
            container = database.get_container_client(self.azure_service.cosmos_container)

            query = f"SELECT * FROM c WHERE c.datasetName = '{dataset_name}'"
            items = list(container.query_items(query=query, enable_cross_partition_query=True))

            logger.info(f"Retrieved {len(items)} Cosmos metadata documents for {dataset_name}")

            metadata_map = {}
            for item in items:
                blob_path = item.get("blobPath")
                if blob_path:
                    metadata_map[blob_path] = item

            return metadata_map
        except Exception as e:
            logger.error(f"Error fetching Cosmos metadata for {dataset_name}: {e}")
            return {}

    def _get_all_metadata_map(self) -> Dict[str, Any]:
        """Fetch metadata from Cosmos DB for all datasets"""
        if not self.azure_service.cosmos_client:
            logger.warning("Cosmos DB not configured, no metadata for global search")
            return {}

        try:
            database = self.azure_service.cosmos_client.get_database_client(self.azure_service.cosmos_database)
            container = database.get_container_client(self.azure_service.cosmos_container)

            query = "SELECT * FROM c"
            items = list(container.query_items(query=query, enable_cross_partition_query=True))

            logger.info(f"Retrieved {len(items)} Cosmos metadata documents for global search")

            metadata_map = {}
            for item in items:
                blob_path = item.get("blobPath")
                if blob_path:
                    metadata_map[blob_path] = item

            return metadata_map
        except Exception as e:
            logger.error(f"Error fetching Cosmos metadata for global search: {e}")
            return {}

    def _build_image_data(self, blob: Any, metadata_map: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Build frontend image payload from blob + metadata"""
        is_image = blob.name.lower().endswith(('.png', '.jpg', '.jpeg'))
        is_3d = blob.name.lower().endswith(('.stl', '.obj', '.glb', '.gltf'))

        if not (is_image or is_3d):
            return None

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

        return {
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

    def get_dataset_images(self, dataset_name: str) -> List[Dict[str, Any]]:
        """
        Get images and metadata for a dataset

        Args:
            dataset_name: Name of dataset

        Returns:
            List of image data with metadata
        """
        try:
            metadata_map = self._get_dataset_metadata_map(dataset_name)
            blobs = self.azure_service.list_blobs(f"{dataset_name}/")

            image_list = []
            for blob in blobs:
                image_data = self._build_image_data(blob, metadata_map)
                if image_data is not None:
                    image_list.append(image_data)

            logger.info(f"Retrieved {len(image_list)} images for dataset {dataset_name}")
            return image_list

        except Exception as e:
            logger.error(f"Error getting images for dataset {dataset_name}: {e}")
            raise

    def get_all_images(self) -> List[Dict[str, Any]]:
        """
        Get images and metadata across all datasets

        Returns:
            List of image data with metadata
        """
        try:
            metadata_map = self._get_all_metadata_map()
            blobs = self.azure_service.list_blobs("")

            image_list = []
            for blob in blobs:
                image_data = self._build_image_data(blob, metadata_map)
                if image_data is not None:
                    image_list.append(image_data)

            logger.info(f"Retrieved {len(image_list)} images for global search")
            return image_list

        except Exception as e:
            logger.error(f"Error getting images for global search: {e}")
            raise