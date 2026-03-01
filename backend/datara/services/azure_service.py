"""Azure Storage and Cosmos DB service integration"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.cosmos import CosmosClient

from datara.logging import logger


class AzureService:
    """Service for Azure Blob Storage and Cosmos DB operations"""

    def __init__(self):
        """Initialize Azure services"""
        self.account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "daasblob")
        self.account_url = f"https://{self.account_name}.blob.core.windows.net/"
        self.container_name = os.getenv("AZURE_BLOB_CONTAINER", "roboteyeview")

        # Initialize Blob Storage
        self._init_blob_service()

        # Initialize Cosmos DB
        self._init_cosmos_db()

        logger.info(f"Azure services initialized - Account: {self.account_name}, Container: {self.container_name}")

    def _init_blob_service(self) -> None:
        """Initialize Azure Blob Storage client"""
        conn_str = os.getenv("BLOB_CONNECTION_STRING")
        self.account_key = None

        if conn_str:
            logger.info("Initializing Blob Service with connection string")
            self.blob_service_client = BlobServiceClient.from_connection_string(conn_str)

            # Parse account key from connection string
            try:
                data = dict(item.split('=', 1) for item in conn_str.split(';') if item)
                self.account_key = data.get('AccountKey')
            except Exception as e:
                logger.warning(f"Could not parse AccountKey: {e}")
        else:
            logger.info("Initializing Blob Service with DefaultAzureCredential")
            credential = DefaultAzureCredential()
            self.blob_service_client = BlobServiceClient(
                account_url=self.account_url,
                credential=credential
            )

        self.container_client = self.blob_service_client.get_container_client(self.container_name)

    def _init_cosmos_db(self) -> None:
        """Initialize Azure Cosmos DB client"""
        cosmos_endpoint = os.getenv(
            "COSMOS_ENDPOINT",
            "https://daas-blob-annotations.documents.azure.com:443/"
        )
        cosmos_key = os.getenv("COSMOS_DB_KEY")

        if cosmos_key:
            try:
                self.cosmos_client = CosmosClient(cosmos_endpoint, cosmos_key)
                self.cosmos_database = "BlobAnnotations"
                self.cosmos_container = "roboteyeview"
                logger.info("Cosmos DB initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Cosmos DB: {e}")
                self.cosmos_client = None
        else:
            logger.warning("Cosmos DB key not configured, Cosmos features disabled")
            self.cosmos_client = None

    def list_datasets(self, path: str = "") -> List[Dict[str, Any]]:
        """
        List datasets (directories) in the container

        Args:
            path: Path prefix to list under

        Returns:
            List of dataset items
        """
        if path and not path.endswith('/'):
            path += '/'

        try:
            blob_iter = self.container_client.walk_blobs(name_starts_with=path, delimiter="/")

            items = []
            for item in blob_iter:
                if hasattr(item, 'name') and item.name.endswith('/'):
                    full_path = item.name.rstrip('/')
                    relative_name = item.name[len(path):].rstrip('/')

                    items.append({
                        "name": relative_name,
                        "full_path": full_path,
                        "type": "folder"
                    })

            return items
        except Exception as e:
            logger.error(f"Error listing datasets at {path}: {e}")
            raise

    def list_blobs(self, prefix: str) -> List[Any]:
        """
        List blobs with given prefix

        Args:
            prefix: Blob name prefix

        Returns:
            List of blob objects
        """
        try:
            return list(self.container_client.list_blobs(name_starts_with=prefix))
        except Exception as e:
            logger.error(f"Error listing blobs with prefix {prefix}: {e}")
            raise

    def download_blob(self, blob_name: str) -> Any:
        """
        Download blob content

        Args:
            blob_name: Name of blob to download

        Returns:
            Blob download stream
        """
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            return blob_client.download_blob()
        except Exception as e:
            logger.error(f"Error downloading blob {blob_name}: {e}")
            raise

    def generate_sas_url(self, blob_name: str, expiry_hours: int = 1) -> str:
        """
        Generate SAS URL for blob access

        Args:
            blob_name: Name of blob
            expiry_hours: SAS token expiry in hours

        Returns:
            SAS URL
        """
        if not self.account_key:
            logger.warning(f"Cannot generate SAS URL without account key for {blob_name}")
            return f"{self.account_url}{self.container_name}/{blob_name}"

        try:
            sas_token = generate_blob_sas(
                account_name=self.account_name,
                container_name=self.container_name,
                blob_name=blob_name,
                account_key=self.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.now(timezone.utc) + timedelta(hours=expiry_hours)
            )

            return f"{self.account_url}{self.container_name}/{blob_name}?{sas_token}"
        except Exception as e:
            logger.error(f"Error generating SAS URL for {blob_name}: {e}")
            raise

    def get_cosmos_metadata(self, dataset_name: str) -> Dict[str, Any]:
        """
        Fetch metadata from Cosmos DB for dataset

        Args:
            dataset_name: Name of dataset

        Returns:
            Mapping of blob path to metadata document
        """
        if not self.cosmos_client:
            logger.warning(f"Cosmos DB not configured, no metadata for {dataset_name}")
            return {}

        try:
            database = self.cosmos_client.get_database_client(self.cosmos_database)
            container = database.get_container_client(self.cosmos_container)

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

