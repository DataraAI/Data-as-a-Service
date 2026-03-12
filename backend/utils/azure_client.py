"""
Shared Azure client helpers for Blob Storage and Cosmos DB.

Used by delete_from_azure, upload_frames_to_azure, and upload_glb_to_azure
to connect to Azure resources and perform uploads/deletes consistently.

Environment variables (with fallbacks):
- Blob: BLOB_CONNECTION_STRING or AZURE_STORAGE_CONNECTION_STRING
- Blob container: AZURE_BLOB_CONTAINER (default: roboteyeview)
- Cosmos: COSMOS_DB_KEY or AZURE_COSMOS_KEY
- Cosmos endpoint: COSMOS_ENDPOINT or AZURE_COSMOS_ENDPOINT (or default below)
"""

import os
from typing import Any, Optional, Tuple

from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceExistsError
from azure.cosmos import CosmosClient

# Defaults when not overridden by env or arguments
COSMOS_ENDPOINT_DEFAULT = "https://daas-blob-annotations.documents.azure.com:443/"
COSMOS_DATABASE = "BlobAnnotations"
COSMOS_CONTAINER = "roboteyeview"
BLOB_CONTAINER_DEFAULT = "roboteyeview"


def get_blob_connection_string(connection_string: Optional[str] = None) -> str:
    """Resolve blob storage connection string from arg or env."""
    load_dotenv()
    out = (
        connection_string
        or os.getenv("BLOB_CONNECTION_STRING")
        or os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    )
    if not out:
        raise ValueError(
            "Missing blob connection string. Set BLOB_CONNECTION_STRING or "
            "AZURE_STORAGE_CONNECTION_STRING, or pass --connection_string."
        )
    return out


def get_blob_container(
    connection_string: Optional[str] = None,
    container_name: Optional[str] = None,
) -> Any:
    """
    Return an Azure Blob Storage container client.
    connection_string and container_name default from environment if not provided.
    """
    load_dotenv()
    conn_str = get_blob_connection_string(connection_string)
    name = container_name or os.getenv("AZURE_BLOB_CONTAINER", BLOB_CONTAINER_DEFAULT)
    blob_service = BlobServiceClient.from_connection_string(conn_str)
    return blob_service.get_container_client(name)


def ensure_blob_container_exists(container_client: Any) -> None:
    """
    Create the blob container if it does not exist.
    Raises RuntimeError if the container is currently being deleted.
    """
    try:
        if not container_client.exists():
            print(f"Container '{container_client.container_name}' does not exist. Creating it...")
            container_client.create_container()
        else:
            print(f"Using existing container '{container_client.container_name}'")
    except ResourceExistsError as e:
        if "being deleted" in str(e):
            raise RuntimeError(
                "Container is currently being deleted by Azure. "
                "Wait 1–2 minutes and retry."
            )
        raise


def get_cosmos_key() -> str:
    """Resolve Cosmos DB key from environment."""
    load_dotenv()
    key = os.getenv("COSMOS_DB_KEY") or os.getenv("AZURE_COSMOS_KEY")
    if not key:
        raise ValueError(
            "Missing Cosmos key. Set COSMOS_DB_KEY or AZURE_COSMOS_KEY."
        )
    return key


def get_cosmos_container(
    cosmos_key: Optional[str] = None,
    endpoint: Optional[str] = None,
    database: Optional[str] = None,
    container: Optional[str] = None,
) -> Any:
    """
    Return the Cosmos DB container client for annotations (roboteyeview).
    All arguments default from environment or module constants.
    """
    load_dotenv()
    key = cosmos_key or get_cosmos_key()
    ep = (
        endpoint
        or os.getenv("COSMOS_ENDPOINT")
        or os.getenv("AZURE_COSMOS_ENDPOINT")
        or COSMOS_ENDPOINT_DEFAULT
    )
    db = database or COSMOS_DATABASE
    cont = container or COSMOS_CONTAINER
    client = CosmosClient(ep, credential=key)
    return client.get_database_client(db).get_container_client(cont)


def get_azure_clients(
    connection_string: Optional[str] = None,
    blob_container_name: Optional[str] = None,
    cosmos_key: Optional[str] = None,
    cosmos_endpoint: Optional[str] = None,
) -> Tuple[Any, Any]:
    """
    Return (blob_container_client, cosmos_container_client) for scripts that need both.
    Uses env for any argument not provided.
    """
    blob_container = get_blob_container(
        connection_string=connection_string,
        container_name=blob_container_name,
    )
    cosmos_container = get_cosmos_container(
        cosmos_key=cosmos_key,
        endpoint=cosmos_endpoint,
    )
    return blob_container, cosmos_container
