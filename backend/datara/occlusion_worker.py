"""Background worker for queued occlusion-removal jobs."""

from __future__ import annotations

import json
import os
import time

from datara.logging import logger
from datara.services.azure_service import AzureService
from datara.services.dataset_service import DatasetService
from datara.services.processing_service import ProcessingService
from datara.services.sql_store import SQLStore


IDLE_TIMEOUT_SECONDS = 90
POLL_INTERVAL_SECONDS = 2


def main() -> int:
    sql_store = SQLStore()
    azure_service = AzureService()
    dataset_service = DatasetService(azure_service, sql_store)
    processing_service = ProcessingService(azure_service, dataset_service, sql_store)
    worker_pid = os.getpid()
    logger.info("Occlusion worker started pid=%s", worker_pid)

    idle_since = time.monotonic()
    while True:
        job = sql_store.claim_next_occlusion_job(worker_pid=worker_pid)
        if job is None:
            if time.monotonic() - idle_since >= IDLE_TIMEOUT_SECONDS:
                logger.info("Occlusion worker pid=%s exiting after idle timeout", worker_pid)
                return 0
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        idle_since = time.monotonic()
        job_id = job["id"]
        logger.info("Occlusion worker pid=%s claimed job=%s route=%s", worker_pid, job_id, job["route_path"])

        user = sql_store.get_user_by_entra_object_id(job["submitted_by_user_id"])
        if not user:
            sql_store.fail_occlusion_job(job_id, "The requesting user could not be resolved for this job.")
            continue

        try:
            request_data = json.loads(job["request_json"])
        except json.JSONDecodeError:
            sql_store.fail_occlusion_job(job_id, "The stored occlusion request payload is invalid JSON.")
            continue

        def progress_callback(phase: str, current: int, total: int) -> None:
            sql_store.update_occlusion_job(
                job_id,
                status="running",
                phase=phase,
                progress_current=max(0, int(current)),
                progress_total=max(0, int(total)),
            )

        try:
            payload = processing_service.run_occlusion_job(
                user,
                request_data,
                progress_callback=progress_callback,
                job_id=job_id,
            )
            sql_store.complete_occlusion_job(
                job_id,
                output_route_path=str(payload["output_route_path"]),
                output_viewer_path=str(payload["output_viewer_path"]),
            )
            logger.info("Occlusion worker pid=%s completed job=%s", worker_pid, job_id)
        except Exception as exc:
            logger.exception("Occlusion worker pid=%s failed job=%s: %s", worker_pid, job_id, exc)
            sql_store.fail_occlusion_job(job_id, str(exc))


if __name__ == "__main__":
    raise SystemExit(main())
