"""Azure Blob Storage and Cosmos DB helpers."""

from __future__ import annotations

import os
import posixpath
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

from azure.cosmos import CosmosClient
from azure.cosmos.partition_key import NonePartitionKeyValue
from azure.core.exceptions import HttpResponseError, ResourceExistsError, ResourceNotFoundError
from azure.identity import DefaultAzureCredential
from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContentSettings,
    ContainerSasPermissions,
    generate_blob_sas,
    generate_container_sas,
)

from datara.config import settings
from datara.logging import logger


def _normalize_azure_connection_string(connection_string: str) -> str:
    """Repair common connection-string mistakes that break blob endpoint URLs."""
    if not connection_string:
        return connection_string

    normalized_parts: list[str] = []
    for segment in connection_string.split(";"):
        segment = segment.strip()
        if not segment:
            continue
        if "=" not in segment:
            normalized_parts.append(segment)
            continue

        key, value = segment.split("=", 1)
        if key == "DefaultEndpointsProtocol" and value.startswith("DefaultEndpointsProtocol="):
            value = value.split("=", 1)[1]
        normalized_parts.append(f"{key}={value}")

    return ";".join(normalized_parts)


class AzureService:
    """Service object for Azure Blob Storage and Cosmos DB operations."""

    def __init__(self) -> None:
        self.account_name = settings.azure_storage_account or "daasblob"
        self.account_url = f"https://{self.account_name}.blob.core.windows.net/"
        self.account_key = settings.azure_storage_key
        self.container_name = settings.azure_blob_container
        self.public_container_name = settings.azure_public_container

        self._init_blob_service()
        self._init_cosmos_db()

    def _init_blob_service(self) -> None:
        connection_string = _normalize_azure_connection_string(settings.azure_connection_string or "")
        if connection_string:
            self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
            if not self.account_key:
                try:
                    fields = dict(part.split("=", 1) for part in connection_string.split(";") if "=" in part)
                    self.account_key = fields.get("AccountKey") or self.account_key
                    self.account_name = fields.get("AccountName", self.account_name)
                    self.account_url = f"https://{self.account_name}.blob.core.windows.net/"
                except Exception as exc:
                    logger.warning("Could not parse Azure connection string: %s", exc)
            logger.info("Azure Blob client initialized from connection string")
            return

        credential = DefaultAzureCredential()
        self.blob_service_client = BlobServiceClient(account_url=self.account_url, credential=credential)
        logger.info("Azure Blob client initialized with DefaultAzureCredential")

    def _init_cosmos_db(self) -> None:
        if not settings.azure_cosmos_endpoint or not settings.azure_cosmos_key:
            logger.warning("Cosmos DB not configured; metadata features are limited")
            self.cosmos_client = None
            return

        self.cosmos_client = CosmosClient(settings.azure_cosmos_endpoint, settings.azure_cosmos_key)
        self.cosmos_database = settings.azure_cosmos_database
        self.cosmos_container = settings.azure_cosmos_container
        logger.info(
            "Cosmos DB initialized: database=%s container=%s",
            self.cosmos_database,
            self.cosmos_container,
        )

    def get_container_client(self, container_name: str):
        return self.blob_service_client.get_container_client(container_name)

    def ensure_container(self, container_name: str) -> None:
        client = self.get_container_client(container_name)
        try:
            if not client.exists():
                client.create_container()
        except ResourceExistsError:
            pass

    def blob_exists(self, container_name: str, blob_name: str) -> bool:
        return self.get_container_client(container_name).get_blob_client(blob_name).exists()

    def list_immediate_child_folders(self, container_name: str, prefix: str = "") -> list[str]:
        prefix = prefix.strip("/")
        if prefix:
            prefix = f"{prefix}/"

        client = self.get_container_client(container_name)
        folders: list[str] = []
        for item in client.walk_blobs(name_starts_with=prefix, delimiter="/"):
            name = getattr(item, "name", "")
            if not name.endswith("/"):
                continue
            folders.append(name.rstrip("/"))
        return folders

    def list_blobs(self, container_name: str, prefix: str) -> list[Any]:
        prefix = prefix.strip("/")
        if prefix:
            prefix = f"{prefix}/"
        client = self.get_container_client(container_name)
        return list(client.list_blobs(name_starts_with=prefix))

    def find_first_matching_blob(
        self,
        container_name: str,
        prefix: str,
        *,
        extensions: tuple[str, ...] = (".png", ".jpg", ".jpeg", ".webp"),
    ) -> str | None:
        prefix = prefix.strip("/")
        if prefix:
            prefix = f"{prefix}/"

        client = self.get_container_client(container_name)
        for blob in client.list_blobs(name_starts_with=prefix):
            blob_name = getattr(blob, "name", "")
            if blob_name.lower().endswith(extensions):
                return blob_name

        return None

    def download_blob(self, container_name: str, blob_name: str) -> Any:
        client = self.get_container_client(container_name)
        return client.get_blob_client(blob_name).download_blob()

    def delete_blob(self, container_name: str, blob_name: str) -> None:
        client = self.get_container_client(container_name)
        try:
            client.delete_blob(blob_name)
        except ResourceNotFoundError:
            logger.info("Blob already absent: %s/%s", container_name, blob_name)

    def delete_blobs_with_prefix(self, container_name: str, prefix: str) -> list[str]:
        deleted: list[str] = []
        deferred: list[str] = []
        blobs = sorted(
            self.list_blobs(container_name, prefix),
            key=lambda blob: (len(getattr(blob, "name", "")), getattr(blob, "name", "")),
            reverse=True,
        )

        for blob in blobs:
            try:
                self.delete_blob(container_name, blob.name)
                deleted.append(blob.name)
            except ResourceExistsError as exc:
                if getattr(exc, "error_code", "") == "DirectoryIsNotEmpty" or "DirectoryIsNotEmpty" in str(exc):
                    deferred.append(blob.name)
                    continue
                raise

        for blob_name in deferred:
            try:
                self.delete_blob(container_name, blob_name)
                deleted.append(blob_name)
            except ResourceExistsError as exc:
                if getattr(exc, "error_code", "") == "DirectoryIsNotEmpty" or "DirectoryIsNotEmpty" in str(exc):
                    logger.info("Directory marker still non-empty during cleanup: %s/%s", container_name, blob_name)
                    continue
                raise
        return deleted
    
    def delete_dataset_blobs(self, container_name: str, prefix: str) -> list[str]:
        """Delete all blobs under prefix and the directory marker blob at exactly prefix."""
        deleted = self.delete_blobs_with_prefix(container_name, prefix)
        self.delete_blob(container_name, prefix.rstrip("/"))
        return deleted

    def generate_sas_url(self, container_name: str, blob_name: str, expiry_hours: int = 1) -> str:
        encoded_blob_name = quote(blob_name, safe="/")
        if not self.account_key:
            return f"{self.account_url}{container_name}/{encoded_blob_name}"
        token = generate_blob_sas(
            account_name=self.account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=self.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
        )
        return f"{self.account_url}{container_name}/{encoded_blob_name}?{token}"

    @staticmethod
    def generation_container_name(job_id: str) -> str:
        normalized = str(job_id or "").strip().lower()
        if not normalized or not normalized.replace("-", "").isalnum():
            raise ValueError("Invalid generation job ID")
        return f"generation-{normalized}"[:63].rstrip("-")

    def create_generation_transfer(self, job_id: str, expiry_hours: int = 6) -> str:
        if not self.account_key:
            raise RuntimeError("Azure storage account key is required for generation transfers")
        container_name = self.generation_container_name(job_id)
        self.ensure_container(container_name)
        token = generate_container_sas(
            account_name=self.account_name,
            container_name=container_name,
            account_key=self.account_key,
            permission=ContainerSasPermissions(create=True, write=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
        )
        return f"{self.account_url}{container_name}?{token}"

    def upload_generation_input(
        self,
        job_id: str,
        *,
        local_path: str,
        blob_name: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        container_name = self.generation_container_name(job_id)
        normalized_name = posixpath.normpath(str(blob_name or "").replace("\\", "/")).lstrip("/")
        if not normalized_name.startswith("inputs/") or ".." in normalized_name.split("/"):
            raise ValueError("Invalid generation input name")
        with open(local_path, "rb") as handle:
            self.get_container_client(container_name).upload_blob(
                name=normalized_name,
                data=handle,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type),
            )
        return self.generate_sas_url(container_name, normalized_name, expiry_hours=6)

    def download_generation_artifacts(
        self,
        job_id: str,
        manifest: dict[str, Any],
        destination_dir: str,
    ) -> list[str]:
        artifacts = manifest.get("artifacts")
        if not isinstance(artifacts, list) or not artifacts or len(artifacts) > 5000:
            raise ValueError("Artifact manifest must contain between 1 and 5000 files")

        container = self.get_container_client(self.generation_container_name(job_id))
        destination_root = os.path.realpath(destination_dir)
        downloaded: list[str] = []
        total_size = 0
        for artifact in artifacts:
            if not isinstance(artifact, dict):
                raise ValueError("Invalid artifact manifest entry")
            raw_name = str(artifact.get("name") or "").replace("\\", "/")
            normalized_name = posixpath.normpath(raw_name).lstrip("/")
            if (
                not normalized_name.startswith("outputs/")
                or normalized_name != raw_name.lstrip("/")
                or ".." in normalized_name.split("/")
            ):
                raise ValueError("Invalid artifact name")
            expected_size = int(artifact.get("size") or -1)
            if expected_size < 0:
                raise ValueError("Invalid artifact size")
            total_size += expected_size
            if total_size > 20 * 1024 * 1024 * 1024:
                raise ValueError("Artifact manifest is too large")

            blob = container.get_blob_client(normalized_name)
            actual_size = int(blob.get_blob_properties().size)
            if actual_size != expected_size:
                raise ValueError("Artifact size does not match the uploaded blob")

            local_path = os.path.realpath(os.path.join(destination_root, *normalized_name.split("/")))
            if os.path.commonpath([destination_root, local_path]) != destination_root:
                raise ValueError("Invalid artifact name")
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as handle:
                blob.download_blob().readinto(handle)
            downloaded.append(local_path)
        return downloaded

    def delete_generation_transfer(self, job_id: str) -> None:
        container = self.get_container_client(self.generation_container_name(job_id))
        try:
            container.delete_container()
        except ResourceNotFoundError:
            pass

    def get_blob_url(self, container_name: str, blob_name: str) -> str:
        encoded_blob_name = quote(blob_name, safe="/")
        return f"{self.account_url}{container_name}/{encoded_blob_name}"

    def copy_blob(
        self,
        *,
        source_container: str,
        source_blob: str,
        target_container: str,
        target_blob: str,
        overwrite: bool = False,
        timeout_seconds: int = 60,
    ) -> None:
        self.ensure_container(target_container)
        destination = self.get_container_client(target_container).get_blob_client(target_blob)
        if destination.exists() and not overwrite:
            raise FileExistsError(f"Destination blob already exists: {target_container}/{target_blob}")

        source_url = self.generate_sas_url(source_container, source_blob, expiry_hours=2)
        try:
            result = destination.start_copy_from_url(source_url)
        except HttpResponseError as exc:
            logger.warning(
                "start_copy_from_url failed for %s/%s -> %s/%s (%s). Falling back to download/upload copy.",
                source_container,
                source_blob,
                target_container,
                target_blob,
                exc,
            )
            self._copy_blob_via_download(
                source_container=source_container,
                source_blob=source_blob,
                target_container=target_container,
                target_blob=target_blob,
                overwrite=overwrite,
            )
            return
        copy_id = result["copy_id"]
        deadline = time.time() + timeout_seconds

        while time.time() < deadline:
            props = destination.get_blob_properties()
            status = props.copy.status
            if status == "success":
                return
            if status == "failed":
                raise RuntimeError(f"Blob copy failed for {source_blob} -> {target_blob}")
            time.sleep(1)

        raise TimeoutError(f"Timed out waiting for blob copy {copy_id}")

    def _copy_blob_via_download(
        self,
        *,
        source_container: str,
        source_blob: str,
        target_container: str,
        target_blob: str,
        overwrite: bool = False,
    ) -> None:
        self.ensure_container(target_container)
        source_client = self.get_container_client(source_container).get_blob_client(source_blob)
        destination = self.get_container_client(target_container).get_blob_client(target_blob)
        if destination.exists() and not overwrite:
            raise FileExistsError(f"Destination blob already exists: {target_container}/{target_blob}")

        download = source_client.download_blob()
        source_props = source_client.get_blob_properties()
        destination.upload_blob(
            download.readall(),
            overwrite=True,
            content_settings=source_props.content_settings,
            metadata=source_props.metadata,
        )

    def move_blob(
        self,
        *,
        source_container: str,
        source_blob: str,
        target_container: str,
        target_blob: str,
        overwrite: bool = False,
    ) -> None:
        self.copy_blob(
            source_container=source_container,
            source_blob=source_blob,
            target_container=target_container,
            target_blob=target_blob,
            overwrite=overwrite,
        )
        self.delete_blob(source_container, source_blob)

    def get_cosmos_container_client(self):
        if not self.cosmos_client:
            return None
        return self.cosmos_client.get_database_client(self.cosmos_database).get_container_client(self.cosmos_container)

    def get_cosmos_metadata_for_prefix(self, container_name: str, dataset_prefix: str) -> dict[str, dict[str, Any]]:
        cosmos_container = self.get_cosmos_container_client()
        if not cosmos_container:
            return {}

        prefix = dataset_prefix.rstrip("/")
        query = (
            "SELECT * FROM c WHERE c.containerName = @container "
            "AND (c.datasetName = @prefix OR STARTSWITH(c.datasetName, @prefixSlash))"
        )
        items = list(
            cosmos_container.query_items(
                query=query,
                parameters=[
                    {"name": "@container", "value": container_name},
                    {"name": "@prefix", "value": prefix},
                    {"name": "@prefixSlash", "value": f"{prefix}/"},
                ],
                enable_cross_partition_query=True,
            )
        )
        return {item["blobPath"]: item for item in items if item.get("blobPath")}

    def get_cosmos_doc_for_blob(self, container_name: str, blob_path: str) -> dict[str, Any] | None:
        cosmos_container = self.get_cosmos_container_client()
        if not cosmos_container:
            return None

        query = "SELECT * FROM c WHERE c.containerName = @container AND c.blobPath = @blobPath"
        items = list(
            cosmos_container.query_items(
                query=query,
                parameters=[
                    {"name": "@container", "value": container_name},
                    {"name": "@blobPath", "value": blob_path},
                ],
                enable_cross_partition_query=True,
            )
        )
        return items[0] if items else None

    def list_cosmos_docs_for_prefix(self, container_name: str, dataset_prefix: str) -> list[dict[str, Any]]:
        cosmos_container = self.get_cosmos_container_client()
        if not cosmos_container:
            return []

        prefix = dataset_prefix.rstrip("/")
        query = (
            "SELECT * FROM c WHERE c.containerName = @container "
            "AND (c.datasetName = @prefix OR STARTSWITH(c.datasetName, @prefixSlash))"
        )
        return list(
            cosmos_container.query_items(
                query=query,
                parameters=[
                    {"name": "@container", "value": container_name},
                    {"name": "@prefix", "value": prefix},
                    {"name": "@prefixSlash", "value": f"{prefix}/"},
                ],
                enable_cross_partition_query=True,
            )
        )

    def upsert_cosmos_item(self, item: dict[str, Any]) -> None:
        cosmos_container = self.get_cosmos_container_client()
        if not cosmos_container:
            return
        cosmos_container.upsert_item(item)

    def delete_cosmos_docs_for_prefix(self, container_name: str, dataset_prefix: str) -> int:
        cosmos_container = self.get_cosmos_container_client()
        if not cosmos_container:
            return 0

        docs = self.list_cosmos_docs_for_prefix(container_name, dataset_prefix)
        deleted = 0
        partition_key_field = None
        try:
            container_props = cosmos_container.read()
            paths = container_props.get("partitionKey", {}).get("paths", [])
            if paths:
                partition_key_field = paths[0].lstrip("/")
        except Exception:
            partition_key_field = None

        for doc in docs:
            raw = doc.get(partition_key_field) if partition_key_field else None
            partition_value = raw if raw is not None else NonePartitionKeyValue
            try:
                cosmos_container.delete_item(item=doc["id"], partition_key=partition_value)
                deleted += 1
            except HttpResponseError as exc:
                if getattr(exc, "status_code", None) == 404:
                    logger.info(
                        "Cosmos document already absent during prefix cleanup: id=%s prefix=%s partition=%s",
                        doc.get("id"),
                        dataset_prefix,
                        partition_value,
                    )
                    continue
                raise
        return deleted

    def rewrite_cosmos_docs_for_prefix(
        self,
        *,
        source_container: str,
        source_prefix: str,
        target_container: str,
        target_prefix: str,
        dataset_id: str,
        owner_user_id: str,
        visibility: str,
        source_dataset_id: str | None = None,
    ) -> int:
        docs = self.list_cosmos_docs_for_prefix(source_container, source_prefix)
        if not docs:
            return 0

        updated = 0
        source_prefix = source_prefix.rstrip("/")
        target_prefix = target_prefix.rstrip("/")
        for doc in docs:
            blob_path = doc.get("blobPath")
            if blob_path and blob_path.startswith(f"{source_prefix}/"):
                suffix = blob_path[len(source_prefix) + 1 :]
                doc["blobPath"] = f"{target_prefix}/{suffix}"
            doc["containerName"] = target_container
            doc["datasetName"] = target_prefix
            doc["datasetId"] = dataset_id
            doc["ownerUserId"] = owner_user_id
            doc["visibility"] = visibility
            doc["sourceDatasetId"] = source_dataset_id
            self.upsert_cosmos_item(doc)
            updated += 1
        return updated
