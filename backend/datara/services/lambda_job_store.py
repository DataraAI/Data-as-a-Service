"""SQL persistence for queued generation jobs."""

from __future__ import annotations

import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, TYPE_CHECKING

from sqlalchemy import and_, func, insert, inspect, or_, select, text, update

from datara.services.sql_store import utc_now

if TYPE_CHECKING:
    from datara.services.sql_store import SQLStore


class LambdaJobStore:
    """Owns lambda_jobs persistence and lease state transitions."""

    def __init__(self, sql_store: SQLStore) -> None:
        self.sql_store = sql_store
        self.engine = sql_store.engine
        self.session_factory = sql_store.session_factory
        self.lambda_jobs = sql_store.lambda_jobs
        self.users = sql_store.users
        self._lambda_job_lock = getattr(sql_store, "_lambda_job_lock", threading.Lock())

    def migrate_schema(self) -> None:
        inspector = inspect(self.engine)
        if not inspector.has_table("lambda_jobs"):
            return
        columns = {str(column["name"]) for column in inspector.get_columns("lambda_jobs")}
        if "execution_context_json" in columns:
            return
        column_type = "NVARCHAR(MAX)" if self.engine.dialect.name == "mssql" else "TEXT"
        with self.engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE lambda_jobs ADD execution_context_json {column_type} NULL"))

    def _select_one(self, statement: Any) -> dict[str, Any] | None:
        return self.sql_store._select_one(statement)

    def _select_all(self, statement: Any) -> list[dict[str, Any]]:
        return self.sql_store._select_all(statement)

    def _acquire_job_lock(self, session: Any, resource: str) -> None:
        if self.engine.dialect.name != "mssql":
            return
        session.execute(
            text(
                "DECLARE @lock_result int; "
                "EXEC @lock_result = sp_getapplock "
                "@Resource=:resource, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; "
                "IF @lock_result < 0 THROW 50001, 'Could not reserve a queue submission slot', 1;"
            ),
            {"resource": resource},
        )

    def create_lambda_job_atomic(
        self,
        *,
        owner_user_id: int,
        job_type: str,
        job_label: str,
        dataset_id: str | None,
        asset_id: str | None,
        scope_key: str,
        payload_json: str,
        request_fingerprint: str,
        estimated_duration_seconds: int,
        queued_limit: int = 5,
    ) -> tuple[str, dict[str, Any] | None]:
        """Create a queued job while atomically enforcing dedupe and the per-user limit."""
        now = utc_now()
        active_dedupe_key = f"{owner_user_id}:{request_fingerprint}"
        job_id = uuid.uuid4().hex

        with self._lambda_job_lock, self.session_factory.begin() as session:
            self._acquire_job_lock(session, f"lambda-jobs-user-{owner_user_id}")
            self._acquire_job_lock(session, "lambda-jobs-ticket-sequence")

            session.execute(
                update(self.lambda_jobs)
                .where(
                    and_(
                        self.lambda_jobs.c.active_dedupe_key == active_dedupe_key,
                        self.lambda_jobs.c.status.in_(("succeeded", "failed")),
                    )
                )
                .values(active_dedupe_key=None)
            )

            duplicate = session.execute(
                select(self.lambda_jobs).where(
                    and_(
                        self.lambda_jobs.c.active_dedupe_key == active_dedupe_key,
                        self.lambda_jobs.c.status.in_(("queued", "running")),
                    )
                )
            ).mappings().first()
            if duplicate:
                return "duplicate", dict(duplicate)

            queued_count = session.execute(
                select(func.count())
                .select_from(self.lambda_jobs)
                .where(
                    and_(
                        self.lambda_jobs.c.owner_user_id == owner_user_id,
                        self.lambda_jobs.c.status == "queued",
                    )
                )
            ).scalar_one()
            if int(queued_count) >= queued_limit:
                return "limit", None

            latest_ticket = session.execute(select(func.max(self.lambda_jobs.c.ticket_number))).scalar_one()
            ticket_number = int(latest_ticket or 0) + 1
            session.execute(
                insert(self.lambda_jobs).values(
                    job_id=job_id,
                    ticket_number=ticket_number,
                    job_type=job_type,
                    job_label=job_label,
                    owner_user_id=owner_user_id,
                    dataset_id=dataset_id,
                    asset_id=asset_id,
                    scope_key=scope_key,
                    payload_json=payload_json,
                    execution_context_json=None,
                    request_fingerprint=request_fingerprint,
                    active_dedupe_key=active_dedupe_key,
                    status="queued",
                    stage="Queued",
                    user_message="Your request is waiting to begin.",
                    result_json=None,
                    error_message=None,
                    retry_count=0,
                    celery_task_id=None,
                    worker_id=None,
                    lease_expires_at=None,
                    heartbeat_at=None,
                    estimated_duration_seconds=estimated_duration_seconds,
                    created_at=now,
                    queued_at=now,
                    started_at=None,
                    completed_at=None,
                    updated_at=now,
                )
            )

        return "created", self.get_lambda_job(job_id)

    def get_lambda_job(self, job_id: str, *, include_owner: bool = False) -> dict[str, Any] | None:
        if not include_owner:
            return self._select_one(select(self.lambda_jobs).where(self.lambda_jobs.c.job_id == job_id))

        statement = (
            select(
                self.lambda_jobs,
                self.users.c.display_name.label("owner_display_name"),
                self.users.c.username.label("owner_email"),
            )
            .select_from(self.lambda_jobs.join(self.users, self.lambda_jobs.c.owner_user_id == self.users.c.user_id))
            .where(self.lambda_jobs.c.job_id == job_id)
        )
        return self._select_one(statement)

    def get_active_duplicate_lambda_job(
        self,
        *,
        owner_user_id: int,
        request_fingerprint: str,
    ) -> dict[str, Any] | None:
        active_dedupe_key = f"{owner_user_id}:{request_fingerprint}"
        return self._select_one(
            select(self.lambda_jobs).where(
                and_(
                    self.lambda_jobs.c.active_dedupe_key == active_dedupe_key,
                    self.lambda_jobs.c.status.in_(("queued", "running")),
                )
            )
        )

    def list_lambda_jobs(
        self,
        *,
        owner_user_id: int | None = None,
        statuses: set[str] | None = None,
        include_owner: bool = False,
        limit: int | None = None,
        newest_first: bool = False,
    ) -> list[dict[str, Any]]:
        if include_owner:
            statement = select(
                self.lambda_jobs,
                self.users.c.display_name.label("owner_display_name"),
                self.users.c.username.label("owner_email"),
            ).select_from(self.lambda_jobs.join(self.users, self.lambda_jobs.c.owner_user_id == self.users.c.user_id))
        else:
            statement = select(self.lambda_jobs)

        filters: list[Any] = []
        if owner_user_id is not None:
            filters.append(self.lambda_jobs.c.owner_user_id == owner_user_id)
        if statuses:
            filters.append(self.lambda_jobs.c.status.in_(sorted(statuses)))
        if filters:
            statement = statement.where(and_(*filters))

        if newest_first:
            statement = statement.order_by(
                self.lambda_jobs.c.completed_at.desc(),
                self.lambda_jobs.c.ticket_number.desc(),
            )
        else:
            statement = statement.order_by(self.lambda_jobs.c.ticket_number.asc())
        if limit is not None:
            statement = statement.limit(limit)
        return self._select_all(statement)

    def update_lambda_job(self, job_id: str, **values: Any) -> dict[str, Any] | None:
        values["updated_at"] = utc_now()
        with self.session_factory.begin() as session:
            session.execute(update(self.lambda_jobs).where(self.lambda_jobs.c.job_id == job_id).values(**values))
        return self.get_lambda_job(job_id)

    def update_running_lambda_job(self, job_id: str, *, worker_id: str, **values: Any) -> dict[str, Any] | None:
        values["updated_at"] = utc_now()
        with self.session_factory.begin() as session:
            result = session.execute(
                update(self.lambda_jobs)
                .where(
                    and_(
                        self.lambda_jobs.c.job_id == job_id,
                        self.lambda_jobs.c.status == "running",
                        self.lambda_jobs.c.worker_id == worker_id,
                    )
                )
                .values(**values)
            )
        if result.rowcount != 1:
            return self.get_lambda_job(job_id)
        return self.get_lambda_job(job_id)

    def claim_lambda_job(self, job_id: str, *, worker_id: str, lease_seconds: int) -> dict[str, Any] | None:
        now_dt = datetime.now(timezone.utc)
        now = now_dt.isoformat()
        lease_expires_at = (now_dt + timedelta(seconds=lease_seconds)).isoformat()

        with self.session_factory.begin() as session:
            record = session.execute(select(self.lambda_jobs).where(self.lambda_jobs.c.job_id == job_id)).mappings().first()
            if not record:
                return None
            current = dict(record)
            if current["status"] in {"succeeded", "failed"}:
                return current
            if current["status"] == "running" and current.get("lease_expires_at") and str(current["lease_expires_at"]) > now:
                return current

            reclaiming = current["status"] == "running"
            claimable = or_(
                self.lambda_jobs.c.status == "queued",
                and_(
                    self.lambda_jobs.c.status == "running",
                    or_(
                        self.lambda_jobs.c.lease_expires_at.is_(None),
                        self.lambda_jobs.c.lease_expires_at <= now,
                    ),
                ),
            )
            result = session.execute(
                update(self.lambda_jobs)
                .where(and_(self.lambda_jobs.c.job_id == job_id, claimable))
                .values(
                    status="running",
                    stage="Preparing",
                    user_message="Your request is being prepared.",
                    worker_id=worker_id,
                    lease_expires_at=lease_expires_at,
                    heartbeat_at=now,
                    started_at=current.get("started_at") or now,
                    retry_count=int(current.get("retry_count") or 0) + (1 if reclaiming else 0),
                    updated_at=now,
                )
            )
            if result.rowcount != 1:
                return None

        return self.get_lambda_job(job_id)

    def renew_lambda_job_lease(self, job_id: str, *, worker_id: str, lease_seconds: int) -> bool:
        now_dt = datetime.now(timezone.utc)
        now = now_dt.isoformat()
        lease_expires_at = (now_dt + timedelta(seconds=lease_seconds)).isoformat()
        with self.session_factory.begin() as session:
            result = session.execute(
                update(self.lambda_jobs)
                .where(
                    and_(
                        self.lambda_jobs.c.job_id == job_id,
                        self.lambda_jobs.c.status == "running",
                        self.lambda_jobs.c.worker_id == worker_id,
                    )
                )
                .values(
                    heartbeat_at=now,
                    lease_expires_at=lease_expires_at,
                    updated_at=now,
                )
            )
        return result.rowcount == 1

    def finish_lambda_job(
        self,
        job_id: str,
        *,
        status: str,
        stage: str,
        user_message: str,
        result_json: str | None = None,
        error_message: str | None = None,
        worker_id: str | None = None,
    ) -> dict[str, Any] | None:
        if status not in {"succeeded", "failed"}:
            raise ValueError("Terminal job status must be succeeded or failed")
        now = utc_now()
        filters = [self.lambda_jobs.c.job_id == job_id]
        if worker_id is not None:
            filters.extend(
                [
                    self.lambda_jobs.c.status == "running",
                    self.lambda_jobs.c.worker_id == worker_id,
                ]
            )
        with self.session_factory.begin() as session:
            result = session.execute(
                update(self.lambda_jobs)
                .where(and_(*filters))
                .values(
                    status=status,
                    stage=stage,
                    user_message=user_message,
                    result_json=result_json,
                    error_message=error_message,
                    execution_context_json=None,
                    active_dedupe_key=None,
                    worker_id=None,
                    lease_expires_at=None,
                    heartbeat_at=None,
                    completed_at=now,
                    updated_at=now,
                )
            )
        if result.rowcount != 1:
            return self.get_lambda_job(job_id)
        return self.get_lambda_job(job_id)
