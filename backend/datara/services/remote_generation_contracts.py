"""Private compute and artifact contracts for the SaaS generation worker."""

from __future__ import annotations

import shutil
import tempfile
from typing import Any


class RemoteGenerationContracts:
    """Separates untrusted SaaS compute from DaaS-owned artifact finalization."""

    CONTRACT_VERSION = 1

    def __init__(self, processing_service: Any) -> None:
        self.processing_service = processing_service
        self.azure_service = processing_service.azure_service

    def _transfer_id(self, job_id: str, offset: int = 0) -> str:
        resolver = getattr(self.processing_service, "remote_generation_transfer_id", None)
        return resolver(job_id, offset=offset) if resolver else job_id

    @staticmethod
    def _handler_name(prefix: str, job_type: str) -> str:
        if not job_type or not job_type.replace("_", "").isalnum():
            raise ValueError("Unsupported generation request")
        return f"_{prefix}_remote_{job_type}"

    def prepare(
        self,
        user: dict[str, Any],
        job_type: str,
        payload: dict[str, Any],
        job_id: str,
    ) -> dict[str, Any]:
        handler = getattr(self.processing_service, self._handler_name("prepare", job_type), None)
        if handler is None:
            raise ValueError("Unsupported remote generation request")

        transfer_id = self._transfer_id(job_id)
        previous_transfer_id = self._transfer_id(job_id, offset=-1)
        if previous_transfer_id != transfer_id:
            self.azure_service.delete_generation_transfer(previous_transfer_id)
        output_upload_url = self.azure_service.create_generation_transfer(transfer_id)
        try:
            execution = handler(user, payload, job_id)
            if not isinstance(execution, dict):
                raise ValueError("Remote preparation returned an invalid contract")
            return {
                "contract_version": self.CONTRACT_VERSION,
                **execution,
                "output_upload_url": output_upload_url,
            }
        except Exception:
            self.azure_service.delete_generation_transfer(transfer_id)
            raise

    def complete(
        self,
        user: dict[str, Any],
        job_type: str,
        payload: dict[str, Any],
        job_id: str,
        manifest: dict[str, Any],
    ) -> tuple[dict[str, Any], int]:
        artifact_root = tempfile.mkdtemp(prefix=f"generation_{job_id}_")
        try:
            if int(manifest.get("contract_version") or 0) != self.CONTRACT_VERSION:
                raise ValueError("Unsupported artifact contract version")
            handler = getattr(self.processing_service, self._handler_name("complete", job_type), None)
            if handler is None:
                raise ValueError("Unsupported remote generation request")
            transfer_id = self._transfer_id(job_id)
            artifact_paths = self.azure_service.download_generation_artifacts(
                transfer_id,
                manifest,
                artifact_root,
            )
            return handler(user, payload, job_id, artifact_root, artifact_paths)
        finally:
            shutil.rmtree(artifact_root, ignore_errors=True)
            self.azure_service.delete_generation_transfer(self._transfer_id(job_id))
