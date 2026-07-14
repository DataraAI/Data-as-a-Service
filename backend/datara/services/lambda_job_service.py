"""SQL-backed queue orchestration for long-running generation requests."""

from __future__ import annotations

import hashlib
import json
import threading
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Protocol

from datara.logging import logger
from datara.services.lambda_job_store import LambdaJobStore
from datara.services.sql_store import SQLStore


ACTIVE_STATUSES = {"queued", "running"}
TERMINAL_STATUSES = {"succeeded", "failed"}
GENERIC_FAILURE_MESSAGE = "This request could not be completed. Please try again."
QUEUE_LIMIT_MESSAGE = "You already have 5 requests waiting. Please wait for one to start before submitting another."
GENERATION_BUSY_MESSAGE = "Generation resources are currently busy. Please try again when active work is complete."


class Publisher(Protocol):
    def publish(self, message: dict[str, Any]) -> str: ...


class DuplicateActiveJob(Exception):
    def __init__(self, receipt: dict[str, Any]) -> None:
        super().__init__("An identical request is already active.")
        self.receipt = receipt


class QueueLimitExceeded(Exception):
    pass


class PublishFailed(Exception):
    pass


class GenerationBusy(Exception):
    pass


class JobExecutionFailed(Exception):
    pass


@dataclass(frozen=True)
class JobDefinition:
    label: str
    method_name: str
    estimated_duration_seconds: int
    required_fields: tuple[str, ...] = ()
    required_any: tuple[str, ...] = ()


JOB_DEFINITIONS: dict[str, JobDefinition] = {
    "generate_masks": JobDefinition("Mask Generation", "generate_masks", 300, ("route_path", "prompt")),
    "remove_occlusion": JobDefinition("Occlusion Removal", "remove_occlusion", 900, ("route_path", "include")),
    "generate_ego": JobDefinition("Perspective Generation", "generate_ego", 600, ("asset_id", "prompt")),
    "generate_corner_case": JobDefinition("Scene Variation", "generate_corner_case", 600, ("asset_id", "prompt")),
    "create_vlm_tags": JobDefinition("Automated Tagging", "create_vlm_tags", 180, ("asset_id",)),
    "generate_task_intelligence": JobDefinition("Task Analysis", "generate_task_intelligence", 600, ("asset_id",)),
    "generate_video_to_video_views": JobDefinition(
        "Video Perspective Generation",
        "generate_video_to_video_views",
        1800,
        ("asset_id",),
    ),
    "generate_hand_mesh": JobDefinition(
        "Hand Motion Generation",
        "generate_hand_mesh",
        1200,
        required_any=("asset_id", "video_url"),
    ),
}

PUBLIC_JOB_TYPES = {
    "generate_masks": "mask_generation",
    "remove_occlusion": "occlusion_removal",
    "generate_ego": "perspective_generation",
    "generate_corner_case": "scene_variation",
    "create_vlm_tags": "automated_tagging",
    "generate_task_intelligence": "task_analysis",
    "generate_video_to_video_views": "video_perspective_generation",
    "generate_hand_mesh": "hand_motion_generation",
}


def _normalize_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): _normalize_value(nested)
            for key, nested in sorted(value.items(), key=lambda item: str(item[0]))
            if nested is not None
        }
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (bool, int, float)) or value is None:
        return value
    return str(value)


def _json_dumps(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _safe_result(job_type: str, result: dict[str, Any]) -> dict[str, Any] | None:
    if job_type == "generate_masks" and result.get("mask_viewer_path"):
        return {"viewer_path": result["mask_viewer_path"]}
    if job_type in {"remove_occlusion", "generate_hand_mesh"} and result.get("output_viewer_path"):
        return {"viewer_path": result["output_viewer_path"]}
    if job_type in {"generate_ego", "generate_corner_case"}:
        dataset = result.get("dataset")
        if isinstance(dataset, dict) and dataset.get("viewer_path"):
            return {"viewer_path": dataset["viewer_path"]}
    if job_type == "generate_video_to_video_views":
        data = result.get("data")
        if isinstance(data, dict) and data.get("proxy_url"):
            return {"proxy_url": data["proxy_url"]}
    if job_type == "generate_task_intelligence":
        data = result.get("data")
        tasks = data.get("tasks") if isinstance(data, dict) else None
        if isinstance(tasks, list):
            safe_tasks = []
            for task in tasks:
                if not isinstance(task, dict):
                    continue
                safe_subtasks = []
                for subtask in task.get("subtasks", []):
                    if not isinstance(subtask, dict):
                        continue
                    safe_subtasks.append(
                        {
                            "subtask_name": subtask.get("subtask_name", "Task step"),
                            "start_time": subtask.get("start_time", "Start"),
                            "end_time": subtask.get("end_time", "End"),
                            "description": "Identified during task analysis.",
                        }
                    )
                safe_tasks.append(
                    {
                        "task_name": task.get("task_name", "Task analysis"),
                        "description": "Task analysis completed.",
                        "start_time": task.get("start_time", "Start"),
                        "end_time": task.get("end_time", "End"),
                        "subtasks": safe_subtasks,
                    }
                )
            return {"tasks": safe_tasks}
    return None


class LambdaJobService:
    """Owns generation-job creation, status, authorization, and execution."""

    def __init__(
        self,
        sql_store: SQLStore,
        *,
        lambda_job_store: LambdaJobStore | None = None,
        publisher: Publisher,
        processing_service: Any | None = None,
        queued_limit: int = 5,
        lease_seconds: int = 120,
    ) -> None:
        self.sql_store = sql_store
        self.job_store = lambda_job_store or LambdaJobStore(sql_store)
        self.publisher = publisher
        self.processing_service = processing_service
        self.queued_limit = queued_limit
        self.lease_seconds = lease_seconds

    @staticmethod
    def _definition(job_type: str) -> JobDefinition:
        try:
            return JOB_DEFINITIONS[job_type]
        except KeyError as exc:
            raise ValueError("Unsupported generation request") from exc

    @staticmethod
    def _validate_payload(definition: JobDefinition, payload: dict[str, Any]) -> None:
        for field in definition.required_fields:
            if payload.get(field) in (None, "", {}):
                raise ValueError(f"Missing {field}")
        if definition.required_any and not any(payload.get(field) not in (None, "", {}) for field in definition.required_any):
            raise ValueError(f"Missing {' or '.join(definition.required_any)}")

    @staticmethod
    def _scope_key(payload: dict[str, Any]) -> str:
        for field in ("asset_id", "route_path", "dataset_id", "output_name", "video_url"):
            value = payload.get(field)
            if value:
                return f"{field}:{value}"
        return "request"

    def _authorize_and_enrich_payload(
        self,
        current_user: dict[str, Any],
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        enriched = dict(payload)
        if self.processing_service is not None and enriched.get("asset_id"):
            source = self.processing_service.dataset_service.resolve_asset(
                str(enriched["asset_id"]),
                current_user,
            )
            enriched["dataset_id"] = source["dataset"]["id"]

        if enriched.get("route_path"):
            dataset, _extra_segments = self.sql_store.resolve_dataset_route(
                str(enriched["route_path"]),
                current_user,
            )
            self.sql_store.assert_user_can_access_dataset(dataset, current_user)
            enriched["dataset_id"] = dataset["id"]
        return enriched

    def enqueue(
        self,
        *,
        current_user: dict[str, Any],
        job_type: str,
        payload: dict[str, Any],
        execute_inline: bool = False,
    ) -> dict[str, Any]:
        definition = self._definition(job_type)
        normalized_payload = _normalize_value(payload)
        if not isinstance(normalized_payload, dict):
            raise ValueError("Invalid request body")
        self._validate_payload(definition, normalized_payload)
        normalized_payload = self._authorize_and_enrich_payload(current_user, normalized_payload)

        scope_key = self._scope_key(normalized_payload)
        payload_json = _json_dumps(normalized_payload)
        fingerprint_source = _json_dumps(
            {"job_type": job_type, "scope_key": scope_key, "payload": normalized_payload}
        )
        request_fingerprint = hashlib.sha256(fingerprint_source.encode("utf-8")).hexdigest()

        if execute_inline:
            duplicate = self.job_store.get_active_duplicate_lambda_job(
                owner_user_id=int(current_user["id"]),
                request_fingerprint=request_fingerprint,
            )
            if duplicate:
                raise DuplicateActiveJob(self.serialize(duplicate))
            if self._active_jobs():
                raise GenerationBusy(GENERATION_BUSY_MESSAGE)

        outcome, record = self.job_store.create_lambda_job_atomic(
            owner_user_id=int(current_user["id"]),
            job_type=job_type,
            job_label=definition.label,
            dataset_id=str(normalized_payload["dataset_id"]) if normalized_payload.get("dataset_id") else None,
            asset_id=str(normalized_payload["asset_id"]) if normalized_payload.get("asset_id") else None,
            scope_key=scope_key,
            payload_json=payload_json,
            request_fingerprint=request_fingerprint,
            estimated_duration_seconds=definition.estimated_duration_seconds,
            queued_limit=self.queued_limit,
        )
        if outcome == "duplicate" and record:
            raise DuplicateActiveJob(self.serialize(record))
        if outcome == "limit":
            raise QueueLimitExceeded(QUEUE_LIMIT_MESSAGE)
        if not record:
            raise RuntimeError("The request could not be queued")

        if execute_inline:
            execution_outcome = self.execute_job(record["job_id"], worker_id=f"direct-ssh:{uuid.uuid4().hex}")
            if execution_outcome in {"out_of_order", "leased", "missing"}:
                self.mark_failed(
                    record["job_id"],
                    private_error=f"Direct SSH execution could not start: {execution_outcome}",
                )
                raise GenerationBusy(GENERATION_BUSY_MESSAGE)
            completed = self.job_store.get_lambda_job(record["job_id"])
            if not completed:
                raise RuntimeError("The direct generation result could not be loaded")
            return self.serialize(completed, submit=True)

        message = {"job_id": record["job_id"], "job_type": job_type, "schema_version": 1}
        try:
            task_id = self.publisher.publish(message)
            record = self.job_store.update_lambda_job(record["job_id"], celery_task_id=task_id) or record
        except Exception as exc:
            logger.error("Generation job publish failed for %s: %s", record["job_id"], exc, exc_info=True)
            self.mark_failed(record["job_id"], private_error=str(exc), publish_failure=True)
            raise PublishFailed("The request could not be queued. Please try again.") from exc
        return self.serialize(record, submit=True)

    def _active_jobs(self) -> list[dict[str, Any]]:
        return self.job_store.list_lambda_jobs(statuses=ACTIVE_STATUSES)

    def _position_and_wait(self, record: dict[str, Any]) -> tuple[int | None, int | None]:
        if record["status"] not in ACTIVE_STATUSES:
            return None, None
        active = self._active_jobs()
        for index, candidate in enumerate(active):
            if candidate["job_id"] == record["job_id"]:
                wait = sum(int(job.get("estimated_duration_seconds") or 0) for job in active[:index])
                return index + 1, wait
        return None, None

    def serialize(
        self,
        record: dict[str, Any],
        *,
        include_owner: bool = False,
        submit: bool = False,
    ) -> dict[str, Any]:
        queue_position, wait_seconds = self._position_and_wait(record)
        result = None
        if record.get("result_json"):
            try:
                result = json.loads(record["result_json"])
            except (TypeError, json.JSONDecodeError):
                result = None
        serialized = {
            "job_id": record["job_id"],
            "ticket_number": int(record["ticket_number"]),
            "job_type": PUBLIC_JOB_TYPES.get(record["job_type"], "generation_request"),
            "job_label": record["job_label"],
            "status": record["status"],
            "stage": record["stage"],
            "queue_position": queue_position,
            "eta_seconds": (
                wait_seconds + int(record.get("estimated_duration_seconds") or 0)
                if wait_seconds is not None
                else None
            ),
            "submitted_at": record["queued_at"],
            "completed_at": record.get("completed_at"),
            "user_message": record["user_message"],
            "result": result,
            "error": GENERIC_FAILURE_MESSAGE if record["status"] == "failed" else None,
        }
        if submit:
            serialized["estimated_wait_seconds"] = wait_seconds
        if include_owner and record.get("owner_email"):
            serialized["owner"] = {
                "display_name": record.get("owner_display_name") or record["owner_email"],
                "email": record["owner_email"],
            }
        return serialized

    @staticmethod
    def _is_staff(user: dict[str, Any]) -> bool:
        return user.get("role") in {"analyst", "admin"}

    def get_job_for_user(self, job_id: str, current_user: dict[str, Any]) -> dict[str, Any]:
        include_owner = self._is_staff(current_user)
        record = self.job_store.get_lambda_job(job_id, include_owner=include_owner)
        if not record:
            raise FileNotFoundError("Request not found")
        if int(record["owner_user_id"]) != int(current_user["id"]) and not include_owner:
            raise PermissionError("Request access denied")
        return self.serialize(record, include_owner=include_owner)

    def list_active_for_user(self, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        include_owner = self._is_staff(current_user)
        records = self.job_store.list_lambda_jobs(
            owner_user_id=None if include_owner else int(current_user["id"]),
            statuses=ACTIVE_STATUSES,
            include_owner=include_owner,
        )
        return [self.serialize(record, include_owner=include_owner) for record in records]

    def list_staff_jobs(self, current_user: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
        if not self._is_staff(current_user):
            raise PermissionError("Request history requires an analyst or admin account")
        active = self.job_store.list_lambda_jobs(statuses=ACTIVE_STATUSES, include_owner=True)
        recent = self.job_store.list_lambda_jobs(
            statuses=TERMINAL_STATUSES,
            include_owner=True,
            newest_first=True,
            limit=5,
        )
        return {
            "active": [self.serialize(record, include_owner=True) for record in active],
            "recent": [self.serialize(record, include_owner=True) for record in recent],
        }

    def claim_for_execution(self, job_id: str, *, worker_id: str) -> dict[str, Any] | None:
        return self.job_store.claim_lambda_job(
            job_id,
            worker_id=worker_id,
            lease_seconds=self.lease_seconds,
        )

    def _is_next_active_job(self, job_id: str) -> bool:
        next_active = self.job_store.list_lambda_jobs(statuses=ACTIVE_STATUSES, limit=1)
        return not next_active or next_active[0]["job_id"] == job_id

    def claim_for_remote_worker(
        self,
        job_id: str,
        *,
        worker_id: str,
        job_type: str,
        schema_version: int,
    ) -> tuple[dict[str, Any], int]:
        if schema_version != 1:
            return {"outcome": "invalid"}, 400
        existing = self.job_store.get_lambda_job(job_id)
        if not existing:
            return {"outcome": "missing"}, 404
        if existing["job_type"] != job_type:
            return {"outcome": "invalid"}, 400
        if existing["status"] in TERMINAL_STATUSES:
            return {"outcome": "terminal"}, 200
        if not self._is_next_active_job(job_id):
            return {"outcome": "out_of_order"}, 409
        claimed = self.claim_for_execution(job_id, worker_id=worker_id)
        if not claimed:
            return {"outcome": "missing"}, 404
        if claimed.get("worker_id") != worker_id:
            return {"outcome": "leased"}, 409
        if self.processing_service is None:
            self.mark_failed(
                job_id,
                private_error="Processing service is required for remote worker preparation",
                worker_id=worker_id,
            )
            return {"outcome": "failed"}, 500
        try:
            with self._renewing_lease(job_id, worker_id):
                payload = json.loads(claimed["payload_json"])
                user = self.sql_store.get_user_by_id(claimed["owner_user_id"])
                if not user:
                    raise JobExecutionFailed("Submitting user no longer exists")
                execution = self.processing_service.prepare_remote_generation(
                    user,
                    job_type,
                    payload if isinstance(payload, dict) else {},
                    job_id,
                )
                if not isinstance(execution, dict):
                    raise JobExecutionFailed("Remote preparation returned an invalid contract")
        except Exception as exc:
            logger.error("Remote generation preparation failed for %s: %s", job_id, exc, exc_info=True)
            self.mark_failed(job_id, private_error=str(exc), worker_id=worker_id)
            return {"outcome": "failed"}, 500
        return {
            "outcome": "claimed",
            "job_id": job_id,
            "job_type": job_type,
            "execution": execution if isinstance(execution, dict) else {},
        }, 200

    def heartbeat_remote_worker(self, job_id: str, *, worker_id: str) -> bool:
        return self.job_store.renew_lambda_job_lease(
            job_id,
            worker_id=worker_id,
            lease_seconds=self.lease_seconds,
        )

    def stage_remote_worker(self, job_id: str, *, worker_id: str, stage: str) -> bool:
        messages = {
            "Preparing": "Your request is being prepared.",
            "Processing": "Your request is being processed.",
            "Finalizing": "Your results are being finalized.",
        }
        if stage not in messages:
            raise ValueError("Unsupported worker stage")
        record = self.job_store.update_running_lambda_job(
            job_id,
            worker_id=worker_id,
            stage=stage,
            user_message=messages[stage],
        )
        return bool(record and record.get("status") == "running" and record.get("worker_id") == worker_id)

    def complete_remote_worker(
        self,
        job_id: str,
        *,
        worker_id: str,
        result: dict[str, Any] | None,
    ) -> str:
        existing = self.job_store.get_lambda_job(job_id)
        if not existing:
            return "missing"
        if existing["status"] in TERMINAL_STATUSES:
            return "terminal"
        if existing.get("worker_id") != worker_id:
            return "leased"
        if self.processing_service is None:
            self.mark_failed(
                job_id,
                private_error="Processing service is required for remote worker completion",
                worker_id=worker_id,
            )
            return "failed"
        try:
            with self._renewing_lease(job_id, worker_id):
                payload = json.loads(existing["payload_json"])
                user = self.sql_store.get_user_by_id(existing["owner_user_id"])
                if not user:
                    raise JobExecutionFailed("Submitting user no longer exists")
                final_result, status_code = self.processing_service.complete_remote_generation(
                    user,
                    existing["job_type"],
                    payload if isinstance(payload, dict) else {},
                    job_id,
                    result or {},
                )
                if int(status_code) >= 400:
                    private_error = final_result.get("error") if isinstance(final_result, dict) else str(final_result)
                    raise JobExecutionFailed(str(private_error or "Generation finalization failed"))
                safe_result = _safe_result(
                    existing["job_type"],
                    final_result if isinstance(final_result, dict) else {},
                )
                finished = self.job_store.finish_lambda_job(
                    job_id,
                    status="succeeded",
                    stage="Complete",
                    user_message="Your request is complete.",
                    result_json=_json_dumps(safe_result) if safe_result else None,
                    worker_id=worker_id,
                )
            return "succeeded" if finished and finished.get("status") == "succeeded" else "leased"
        except Exception as exc:
            logger.error("Remote generation finalization failed for %s: %s", job_id, exc, exc_info=True)
            failed = self.mark_failed(job_id, private_error=str(exc), worker_id=worker_id)
            return "failed" if failed and failed.get("status") == "failed" else "leased"

    def fail_remote_worker(self, job_id: str, *, worker_id: str, private_error: str) -> str:
        existing = self.job_store.get_lambda_job(job_id)
        if not existing:
            return "missing"
        if existing["status"] in TERMINAL_STATUSES:
            return "terminal"
        if existing.get("worker_id") != worker_id:
            return "leased"
        if self.processing_service is not None:
            try:
                self.processing_service.cleanup_remote_generation(job_id)
            except Exception:
                logger.warning("Failed to clean temporary generation transfer for %s", job_id, exc_info=True)
        failed = self.mark_failed(job_id, private_error=private_error[:4000], worker_id=worker_id)
        return "failed" if failed and failed.get("status") == "failed" else "leased"

    def mark_stage(
        self,
        job_id: str,
        *,
        stage: str,
        user_message: str,
        worker_id: str | None = None,
    ) -> dict[str, Any] | None:
        if worker_id is None:
            return self.job_store.update_lambda_job(job_id, stage=stage, user_message=user_message)
        return self.job_store.update_running_lambda_job(
            job_id,
            worker_id=worker_id,
            stage=stage,
            user_message=user_message,
        )

    def mark_failed(
        self,
        job_id: str,
        *,
        private_error: str,
        publish_failure: bool = False,
        worker_id: str | None = None,
    ) -> dict[str, Any] | None:
        public_message = (
            "The request could not be queued. Please try again."
            if publish_failure
            else GENERIC_FAILURE_MESSAGE
        )
        return self.job_store.finish_lambda_job(
            job_id,
            status="failed",
            stage="Failed",
            user_message=public_message,
            error_message=private_error,
            worker_id=worker_id,
        )

    def _heartbeat(self, job_id: str, worker_id: str, stop_event: threading.Event) -> None:
        interval = max(1, min(30, self.lease_seconds // 3))
        while not stop_event.wait(interval):
            if not self.job_store.renew_lambda_job_lease(
                job_id,
                worker_id=worker_id,
                lease_seconds=self.lease_seconds,
            ):
                return

    @contextmanager
    def _renewing_lease(self, job_id: str, worker_id: str):
        stop_event = threading.Event()
        heartbeat = threading.Thread(
            target=self._heartbeat,
            args=(job_id, worker_id, stop_event),
            daemon=True,
        )
        heartbeat.start()
        try:
            yield
        finally:
            stop_event.set()
            heartbeat.join(timeout=1)

    def execute_job(self, job_id: str, *, worker_id: str | None = None) -> str:
        if self.processing_service is None:
            raise RuntimeError("Processing service is required for worker execution")
        worker_id = worker_id or uuid.uuid4().hex
        existing = self.job_store.get_lambda_job(job_id)
        if not existing:
            return "missing"
        if existing["status"] in ACTIVE_STATUSES and not self._is_next_active_job(job_id):
            return "out_of_order"
        record = self.claim_for_execution(job_id, worker_id=worker_id)
        if not record:
            return "missing"
        if record["status"] in TERMINAL_STATUSES:
            return "terminal"
        if record.get("worker_id") != worker_id:
            return "leased"

        stop_event = threading.Event()
        heartbeat = threading.Thread(
            target=self._heartbeat,
            args=(job_id, worker_id, stop_event),
            daemon=True,
        )
        heartbeat.start()
        try:
            self.mark_stage(
                job_id,
                stage="Processing",
                user_message="Your request is being processed.",
                worker_id=worker_id,
            )
            user = self.sql_store.get_user_by_id(record["owner_user_id"])
            if not user:
                raise JobExecutionFailed("Submitting user no longer exists")
            definition = self._definition(record["job_type"])
            payload = json.loads(record["payload_json"])
            executor = getattr(self.processing_service, definition.method_name)
            result, status_code = executor(user, payload)
            if int(status_code) >= 400:
                private_error = result.get("error") if isinstance(result, dict) else str(result)
                raise JobExecutionFailed(str(private_error or "Generation request failed"))

            self.mark_stage(
                job_id,
                stage="Finalizing",
                user_message="Your results are being finalized.",
                worker_id=worker_id,
            )
            safe_result = _safe_result(record["job_type"], result if isinstance(result, dict) else {})
            self.job_store.finish_lambda_job(
                job_id,
                status="succeeded",
                stage="Complete",
                user_message="Your request is complete.",
                result_json=_json_dumps(safe_result) if safe_result else None,
                worker_id=worker_id,
            )
            return "succeeded"
        except Exception as exc:
            logger.error("Generation job %s failed: %s", job_id, exc, exc_info=True)
            self.mark_failed(job_id, private_error=str(exc), worker_id=worker_id)
            return "failed"
        finally:
            stop_event.set()
            heartbeat.join(timeout=1)
