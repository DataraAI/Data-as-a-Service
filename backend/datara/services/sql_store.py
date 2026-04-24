"""SQLAlchemy-backed catalog for Datara auth and dataset routing."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Identity,
    Index,
    Integer,
    MetaData,
    Table,
    and_,
    case,
    create_engine,
    delete,
    func,
    inspect,
    insert,
    or_,
    select,
    text,
    update,
)
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql.sqltypes import String, Text

from datara.config import settings
from datara.logging import logger


ALLOWED_VISIBILITY = {"private", "public"}
ALLOWED_ROLES = {"customer", "analyst", "admin"}
ALLOWED_APPROVAL_STATUSES = {"pending", "approved", "rejected"}
SLUG_PATTERN = re.compile(r"[^a-z0-9-]+")

metadata = MetaData()

users_table = Table(
    "users",
    metadata,
    Column("user_id", Integer, Identity(start=1, increment=1), primary_key=True),
    Column("username", String(320), nullable=False, unique=True),
    Column("display_name", String(255), nullable=False),
    Column("password_hash", Text, nullable=False),
    Column("approval_status", String(16), nullable=False, server_default=text("'pending'")),
    Column("approved_by_user_id", Integer, ForeignKey("users.user_id"), nullable=True),
    Column("role", String(16), nullable=False, server_default=text("'customer'")),
    Column("storage_slug", String(63), nullable=False, unique=True),
    Column("private_container_name", String(63), nullable=False, unique=True),
    Column("created_at", String(64), nullable=False),
    Column("updated_at", String(64), nullable=False),
    Column("last_login_at", String(64), nullable=True),
    CheckConstraint("approval_status IN ('pending', 'approved', 'rejected')", name="ck_users_approval_status"),
    CheckConstraint("role IN ('customer', 'analyst', 'admin')", name="ck_users_role"),
)

Index("idx_users_username", users_table.c.username)
Index("idx_users_storage_slug", users_table.c.storage_slug)

datasets_table = Table(
    "datasets",
    metadata,
    Column("id", String(32), primary_key=True),
    Column("owner_user_id", Integer, ForeignKey("users.user_id"), nullable=False),
    Column("owner_storage_slug", String(63), nullable=False),
    Column("created_by_user_id", Integer, ForeignKey("users.user_id"), nullable=False),
    Column("visibility", String(16), nullable=False),
    Column("category", String(255), nullable=False),
    Column("brand", String(255), nullable=False),
    Column("dataset_name", String(255), nullable=False),
    Column("storage_container", String(255), nullable=False),
    Column("storage_prefix", String(1024), nullable=False),
    Column("source_kind", String(64), nullable=False, server_default=text("'upload'")),
    Column("source_dataset_id", String(32), ForeignKey("datasets.id"), nullable=True),
    Column("task", Text, nullable=True),
    Column("created_at", String(64), nullable=False),
    Column("updated_at", String(64), nullable=False),
    Column("deleted_at", String(64), nullable=True),
    CheckConstraint("visibility IN ('private', 'public')", name="ck_datasets_visibility"),
)

Index("idx_datasets_owner", datasets_table.c.owner_user_id)
Index("idx_datasets_visibility", datasets_table.c.visibility)
Index("idx_datasets_storage", datasets_table.c.storage_container, datasets_table.c.storage_prefix)
Index("idx_datasets_route", datasets_table.c.category, datasets_table.c.brand, datasets_table.c.dataset_name)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_dict(row: Mapping[str, Any] | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


def slugify_storage_name(value: str) -> str:
    normalized = SLUG_PATTERN.sub("-", value.strip().lower())
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    if not normalized:
        normalized = "user"
    if len(normalized) < 3:
        normalized = f"{normalized}-acct"
    return normalized[:63].strip("-") or "useracct"


class SQLStore:
    """Small SQLAlchemy layer used for auth and dataset authorization."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or settings.auth_database_url
        self._ensure_sqlite_parent_dir(self.database_url)
        self.engine: Engine = create_engine(self.database_url, future=True, pool_pre_ping=True)
        self.session_factory = sessionmaker(bind=self.engine, future=True, expire_on_commit=False)
        self.users = users_table
        self.datasets = datasets_table
        self.initialize()

    @staticmethod
    def _ensure_sqlite_parent_dir(database_url: str) -> None:
        try:
            parsed = make_url(database_url)
        except Exception:
            return

        if not parsed.drivername.startswith("sqlite"):
            return

        if not parsed.database or parsed.database == ":memory:":
            return

        db_path = Path(parsed.database).expanduser().resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _coerce_user_id(user_id: Any) -> int | None:
        if user_id is None:
            return None
        if isinstance(user_id, bool):
            raise ValueError("Boolean values are not valid user ids")
        if isinstance(user_id, int):
            return user_id

        value = str(user_id).strip()
        if not value:
            return None
        try:
            return int(value)
        except ValueError as exc:
            raise ValueError(f"Invalid user id: {user_id}") from exc

    @staticmethod
    def _normalize_role(role: str | None) -> str:
        normalized = str(role or "customer").strip().lower()
        if normalized == "user":
            return "customer"
        return normalized

    @staticmethod
    def _normalize_approval_status(status: str | None) -> str:
        normalized = str(status or "pending").strip().lower()
        if normalized not in ALLOWED_APPROVAL_STATUSES:
            raise ValueError(f"Unsupported approval status: {normalized}")
        return normalized

    def initialize(self) -> None:
        self._assert_supported_schema()
        metadata.create_all(self.engine)

    def _assert_supported_schema(self) -> None:
        inspector = inspect(self.engine)
        if not inspector.has_table("users"):
            return

        user_columns = {str(column["name"]) for column in inspector.get_columns("users")}
        retired_entra_columns = {"entra_object_id", "tenant_id"}
        required_new_columns = {"user_id", "username", "approved_by_user_id"}
        if retired_entra_columns & user_columns or not required_new_columns.issubset(user_columns):
            raise RuntimeError(
                "The configured auth database does not match the Datara Azure SQL schema. "
                "Point the app at a fresh Azure SQL database or run the SQLite-to-Azure migration "
                "before starting the app."
            )

    @staticmethod
    def _decorate_user(record: dict[str, Any] | None) -> dict[str, Any] | None:
        if not record:
            return None

        approval_status = str(record.get("approval_status") or "pending")
        record["approval_status"] = approval_status
        record["approved"] = approval_status == "approved"
        if "user_id" in record:
            record["id"] = int(record["user_id"])
        if "username" in record:
            record["email"] = str(record["username"])
        if "approved_by_username" in record and "approved_by_email" not in record:
            record["approved_by_email"] = record["approved_by_username"]
        return record

    def _select_one(self, statement: Any) -> dict[str, Any] | None:
        with self.session_factory() as session:
            row = session.execute(statement).mappings().first()
            return row_to_dict(row)

    def _select_all(self, statement: Any) -> list[dict[str, Any]]:
        with self.session_factory() as session:
            rows = session.execute(statement).mappings().all()
            return [dict(row) for row in rows]

    def _storage_slug_exists(self, slug: str) -> bool:
        return (
            self._select_one(select(self.users.c.user_id).where(self.users.c.storage_slug == slug))
            is not None
        )

    def generate_unique_storage_slug(self, *candidates: str) -> str:
        base_candidates = [slugify_storage_name(candidate) for candidate in candidates if candidate and candidate.strip()]
        base = next((candidate for candidate in base_candidates if candidate), "user")
        if not self._storage_slug_exists(base):
            return base

        counter = 2
        while True:
            suffix = f"-{counter}"
            candidate = f"{base[: max(3, 63 - len(suffix))]}{suffix}".strip("-")
            if not self._storage_slug_exists(candidate):
                return candidate
            counter += 1

    def count_users(self) -> int:
        with self.session_factory() as session:
            value = session.execute(select(func.count()).select_from(self.users)).scalar_one()
        return int(value)

    def count_admin_users(self) -> int:
        with self.session_factory() as session:
            value = session.execute(
                select(func.count())
                .select_from(self.users)
                .where(
                    and_(
                        self.users.c.role == "admin",
                        self.users.c.approval_status == "approved",
                    )
                )
            ).scalar_one()
        return int(value)

    def count_datasets(self, *, visibility: str | None = None, include_deleted: bool = False) -> int:
        filters: list[Any] = []
        if visibility:
            filters.append(self.datasets.c.visibility == visibility)
        if not include_deleted:
            filters.append(self.datasets.c.deleted_at.is_(None))

        statement = select(func.count()).select_from(self.datasets)
        if filters:
            statement = statement.where(and_(*filters))

        with self.session_factory() as session:
            value = session.execute(statement).scalar_one()
        return int(value)

    def count_owned_datasets(self, user_id: int | str, *, include_deleted: bool = False) -> int:
        normalized_user_id = self._coerce_user_id(user_id)
        if normalized_user_id is None:
            return 0

        filters = [self.datasets.c.owner_user_id == normalized_user_id]
        if not include_deleted:
            filters.append(self.datasets.c.deleted_at.is_(None))

        with self.session_factory() as session:
            value = session.execute(
                select(func.count()).select_from(self.datasets).where(and_(*filters))
            ).scalar_one()
        return int(value)

    def count_dataset_user_references(self, user_id: int | str, *, include_deleted: bool = False) -> int:
        normalized_user_id = self._coerce_user_id(user_id)
        if normalized_user_id is None:
            return 0

        filters = [
            or_(
                self.datasets.c.owner_user_id == normalized_user_id,
                self.datasets.c.created_by_user_id == normalized_user_id,
            )
        ]
        if not include_deleted:
            filters.append(self.datasets.c.deleted_at.is_(None))

        with self.session_factory() as session:
            value = session.execute(
                select(func.count()).select_from(self.datasets).where(and_(*filters))
            ).scalar_one()
        return int(value)

    def get_user_by_id(self, user_id: int | str) -> dict[str, Any] | None:
        normalized_user_id = self._coerce_user_id(user_id)
        if normalized_user_id is None:
            return None
        return self._decorate_user(
            self._select_one(select(self.users).where(self.users.c.user_id == normalized_user_id))
        )

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        normalized_email = str(email or "").strip().lower()
        if not normalized_email:
            return None
        return self._decorate_user(
            self._select_one(select(self.users).where(self.users.c.username == normalized_email))
        )

    def get_user_by_storage_slug(self, storage_slug: str) -> dict[str, Any] | None:
        return self._decorate_user(
            self._select_one(select(self.users).where(self.users.c.storage_slug == storage_slug))
        )

    def get_user(self, user_ref: int | str) -> dict[str, Any] | None:
        if isinstance(user_ref, int):
            return self.get_user_by_id(user_ref)

        text_ref = str(user_ref or "").strip()
        if not text_ref:
            return None
        if "@" in text_ref:
            return self.get_user_by_email(text_ref)
        if text_ref.isdigit():
            return self.get_user_by_id(text_ref)
        return self.get_user_by_email(text_ref)

    def get_first_admin_user(self) -> dict[str, Any] | None:
        statement = (
            select(self.users)
            .where(
                and_(
                    self.users.c.role == "admin",
                    self.users.c.approval_status == "approved",
                )
            )
            .order_by(self.users.c.created_at.asc(), self.users.c.user_id.asc())
            .limit(1)
        )
        return self._decorate_user(self._select_one(statement))

    def list_users(self) -> list[dict[str, Any]]:
        approver = self.users.alias("approver")
        statement = (
            select(
                self.users,
                approver.c.username.label("approved_by_username"),
                approver.c.display_name.label("approved_by_display_name"),
            )
            .select_from(
                self.users.outerjoin(
                    approver,
                    self.users.c.approved_by_user_id == approver.c.user_id,
                )
            )
            .order_by(
                case(
                    (self.users.c.approval_status == "pending", 0),
                    (self.users.c.approval_status == "approved", 1),
                    else_=2,
                ),
                case(
                    (self.users.c.role == "admin", 0),
                    (self.users.c.role == "analyst", 1),
                    else_=2,
                ),
                self.users.c.username.asc(),
            )
        )
        return [self._decorate_user(record) or record for record in self._select_all(statement)]

    def create_user(
        self,
        *,
        email: str,
        display_name: str,
        password_hash: str,
        approval_status: str = "pending",
        role: str = "customer",
        approved_by_user_id: int | str | None = None,
        storage_slug: str | None = None,
        private_container_name: str | None = None,
        created_at: str | None = None,
        updated_at: str | None = None,
        last_login_at: str | None = None,
    ) -> dict[str, Any]:
        normalized_email = str(email or "").strip().lower()
        if not normalized_email:
            raise ValueError("Email is required")

        approval_status = self._normalize_approval_status(approval_status)
        role = self._normalize_role(role)
        if role not in ALLOWED_ROLES:
            raise ValueError(f"Unsupported role: {role}")
        if role == "admin" and approval_status != "approved":
            approval_status = "approved"

        normalized_approver_id = self._coerce_user_id(approved_by_user_id)
        if approval_status != "approved":
            normalized_approver_id = None

        resolved_display_name = str(display_name or "").strip() or normalized_email
        resolved_storage_slug = str(storage_slug or "").strip() or self.generate_unique_storage_slug(
            normalized_email.split("@", 1)[0],
            resolved_display_name,
            normalized_email,
        )
        resolved_private_container = str(private_container_name or "").strip() or resolved_storage_slug
        now = utc_now()

        with self.session_factory.begin() as session:
            session.execute(
                insert(self.users).values(
                    username=normalized_email,
                    display_name=resolved_display_name,
                    password_hash=password_hash,
                    approval_status=approval_status,
                    approved_by_user_id=normalized_approver_id,
                    role=role,
                    storage_slug=resolved_storage_slug,
                    private_container_name=resolved_private_container,
                    created_at=created_at or now,
                    updated_at=updated_at or now,
                    last_login_at=last_login_at,
                )
            )
        return self.get_user_by_email(normalized_email)

    def touch_user_login(self, user_id: int | str) -> None:
        normalized_user_id = self._coerce_user_id(user_id)
        if normalized_user_id is None:
            raise ValueError("User id is required")

        now = utc_now()
        with self.session_factory.begin() as session:
            session.execute(
                update(self.users)
                .where(self.users.c.user_id == normalized_user_id)
                .values(last_login_at=now, updated_at=now)
            )

    def set_user_approval_status(
        self,
        user_ref: int | str,
        approval_status: str,
        *,
        actor_user_id: int | str | None = None,
    ) -> dict[str, Any] | None:
        approval_status = self._normalize_approval_status(approval_status)
        user = self.get_user(user_ref)
        if not user:
            return None

        if (
            user["role"] == "admin"
            and user["approval_status"] == "approved"
            and approval_status != "approved"
            and self.count_admin_users() <= 1
        ):
            raise ValueError("Cannot change the last approved admin away from approved status.")

        approver_id = self._coerce_user_id(actor_user_id)
        if approval_status != "approved":
            approver_id = None
        elif approver_id is None:
            approver_id = self._coerce_user_id(user.get("approved_by_user_id"))

        with self.session_factory.begin() as session:
            session.execute(
                update(self.users)
                .where(self.users.c.user_id == user["id"])
                .values(
                    approval_status=approval_status,
                    approved_by_user_id=approver_id,
                    updated_at=utc_now(),
                )
            )
        return self.get_user_by_id(user["id"])

    def set_user_role(
        self,
        user_ref: int | str,
        role: str,
        *,
        actor_user_id: int | str | None = None,
    ) -> dict[str, Any] | None:
        role = self._normalize_role(role)
        if role not in ALLOWED_ROLES:
            raise ValueError(f"Unsupported role: {role}")

        user = self.get_user(user_ref)
        if not user:
            return None

        if (
            user["role"] == "admin"
            and user["approval_status"] == "approved"
            and role != "admin"
            and self.count_admin_users() <= 1
        ):
            raise ValueError("Cannot demote the last approved admin.")

        approval_status = user["approval_status"]
        approved_by_user_id = self._coerce_user_id(user.get("approved_by_user_id"))
        actor_id = self._coerce_user_id(actor_user_id)

        if role == "admin":
            approval_status = "approved"
            approved_by_user_id = actor_id or approved_by_user_id
        elif approval_status != "approved":
            approved_by_user_id = None

        with self.session_factory.begin() as session:
            session.execute(
                update(self.users)
                .where(self.users.c.user_id == user["id"])
                .values(
                    role=role,
                    approval_status=approval_status,
                    approved_by_user_id=approved_by_user_id,
                    updated_at=utc_now(),
                )
            )
        return self.get_user_by_id(user["id"])

    def update_user_password(self, user_ref: int | str, password_hash: str) -> dict[str, Any] | None:
        user = self.get_user(user_ref)
        if not user:
            return None

        with self.session_factory.begin() as session:
            session.execute(
                update(self.users)
                .where(self.users.c.user_id == user["id"])
                .values(password_hash=password_hash, updated_at=utc_now())
            )
        return self.get_user_by_id(user["id"])

    def delete_user(self, user_ref: int | str) -> bool:
        user = self.get_user(user_ref)
        if not user:
            return False

        if (
            user["role"] == "admin"
            and user["approval_status"] == "approved"
            and self.count_admin_users() <= 1
        ):
            raise ValueError("Cannot delete the last approved admin user.")

        if self.count_dataset_user_references(user["id"], include_deleted=True) > 0:
            raise ValueError("Cannot delete a user who still has dataset records.")

        with self.session_factory.begin() as session:
            session.execute(
                update(self.users)
                .where(self.users.c.approved_by_user_id == user["id"])
                .values(approved_by_user_id=None, updated_at=utc_now())
            )
            session.execute(delete(self.users).where(self.users.c.user_id == user["id"]))
        return True

    def upsert_user_record(self, record: Mapping[str, Any]) -> dict[str, Any]:
        username = str(record.get("username") or record.get("email") or "").strip().lower()
        if not username:
            raise ValueError("User record must include username/email")

        role = self._normalize_role(str(record.get("role") or "customer"))
        if role not in ALLOWED_ROLES:
            raise ValueError(f"Unsupported role during import: {role}")

        approval_status = self._normalize_approval_status(str(record.get("approval_status") or "pending"))
        approved_by_user_id = self._coerce_user_id(record.get("approved_by_user_id"))
        if approval_status != "approved":
            approved_by_user_id = None

        payload = {
            "username": username,
            "display_name": str(record.get("display_name") or username).strip() or username,
            "password_hash": str(record["password_hash"]),
            "approval_status": approval_status,
            "approved_by_user_id": approved_by_user_id,
            "role": role,
            "storage_slug": str(record["storage_slug"]).strip(),
            "private_container_name": str(record["private_container_name"]).strip(),
            "created_at": str(record.get("created_at") or utc_now()),
            "updated_at": str(record.get("updated_at") or utc_now()),
            "last_login_at": str(record["last_login_at"]) if record.get("last_login_at") else None,
        }

        existing_user = None
        imported_user_id = self._coerce_user_id(record.get("user_id") or record.get("id"))
        if imported_user_id is not None:
            existing_user = self.get_user_by_id(imported_user_id)
        if existing_user is None:
            existing_user = self.get_user_by_email(username)

        target_id = existing_user["id"] if existing_user else None
        with self.session_factory.begin() as session:
            if existing_user:
                session.execute(
                    update(self.users)
                    .where(self.users.c.user_id == existing_user["id"])
                    .values(**payload)
                )
            else:
                session.execute(insert(self.users).values(**payload))
        if target_id is not None:
            return self.get_user_by_id(target_id) or payload
        return self.get_user_by_email(username) or payload

    def route_path_for_dataset(self, dataset: dict[str, Any], viewer_mode: str = "default") -> str:
        base = f"{dataset['category']}/{dataset['brand']}/{dataset['dataset_name']}"
        if dataset["visibility"] == "public":
            return base
        if viewer_mode == "admin":
            return f"admin/{dataset['owner_storage_slug']}/{base}"
        return f"my/{base}"

    def list_accessible_datasets(
        self,
        current_user: dict[str, Any],
        *,
        include_deleted: bool = False,
    ) -> list[dict[str, Any]]:
        filters: list[Any] = []
        if not include_deleted:
            filters.append(self.datasets.c.deleted_at.is_(None))

        if current_user["role"] != "admin":
            filters.append(
                or_(
                    self.datasets.c.visibility == "public",
                    self.datasets.c.owner_user_id == current_user["id"],
                )
            )

        statement = select(self.datasets)
        if filters:
            statement = statement.where(and_(*filters))
        statement = statement.order_by(
            self.datasets.c.visibility.asc(),
            self.datasets.c.category.asc(),
            self.datasets.c.brand.asc(),
            self.datasets.c.dataset_name.asc(),
        )
        return self._select_all(statement)

    def dataset_exists_for_route(
        self,
        *,
        visibility: str,
        category: str,
        brand: str,
        dataset_name: str,
        owner_user_id: int | str,
    ) -> bool:
        normalized_owner_id = self._coerce_user_id(owner_user_id)
        filters = [
            self.datasets.c.deleted_at.is_(None),
            self.datasets.c.visibility == visibility,
            self.datasets.c.category == category,
            self.datasets.c.brand == brand,
            self.datasets.c.dataset_name == dataset_name,
        ]
        if visibility == "private":
            if normalized_owner_id is None:
                raise ValueError("owner_user_id is required for private dataset route lookup")
            filters.append(self.datasets.c.owner_user_id == normalized_owner_id)

        statement = select(self.datasets.c.id).where(and_(*filters)).limit(1)
        return self._select_one(statement) is not None

    def create_dataset(
        self,
        *,
        owner_user: dict[str, Any],
        created_by_user: dict[str, Any],
        visibility: str,
        category: str,
        brand: str,
        dataset_name: str,
        storage_container: str,
        storage_prefix: str,
        source_kind: str = "upload",
        source_dataset_id: str | None = None,
        task: str = "",
    ) -> dict[str, Any]:
        if visibility not in ALLOWED_VISIBILITY:
            raise ValueError(f"Unsupported visibility: {visibility}")
        if self.dataset_exists_for_route(
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            owner_user_id=owner_user["id"],
        ):
            raise ValueError(f"Dataset route already exists: {category}/{brand}/{dataset_name}")

        dataset_id = uuid.uuid4().hex
        now = utc_now()
        with self.session_factory.begin() as session:
            session.execute(
                insert(self.datasets).values(
                    id=dataset_id,
                    owner_user_id=owner_user["id"],
                    owner_storage_slug=owner_user["storage_slug"],
                    created_by_user_id=created_by_user["id"],
                    visibility=visibility,
                    category=category,
                    brand=brand,
                    dataset_name=dataset_name,
                    storage_container=storage_container,
                    storage_prefix=storage_prefix.rstrip("/"),
                    source_kind=source_kind,
                    source_dataset_id=source_dataset_id,
                    task=task,
                    created_at=now,
                    updated_at=now,
                    deleted_at=None,
                )
            )
        return self.get_dataset_by_id(dataset_id)

    def upsert_dataset_record(self, record: Mapping[str, Any]) -> dict[str, Any]:
        dataset_id = str(record["id"]).strip()
        payload = {
            "id": dataset_id,
            "owner_user_id": self._coerce_user_id(record["owner_user_id"]),
            "owner_storage_slug": str(record["owner_storage_slug"]).strip(),
            "created_by_user_id": self._coerce_user_id(record.get("created_by_user_id") or record["owner_user_id"]),
            "visibility": str(record["visibility"]).strip(),
            "category": str(record["category"]).strip(),
            "brand": str(record["brand"]).strip(),
            "dataset_name": str(record["dataset_name"]).strip(),
            "storage_container": str(record["storage_container"]).strip(),
            "storage_prefix": str(record["storage_prefix"]).strip().rstrip("/"),
            "source_kind": str(record.get("source_kind") or "upload").strip(),
            "source_dataset_id": str(record["source_dataset_id"]).strip() if record.get("source_dataset_id") else None,
            "task": str(record.get("task") or ""),
            "created_at": str(record.get("created_at") or utc_now()),
            "updated_at": str(record.get("updated_at") or utc_now()),
            "deleted_at": str(record["deleted_at"]) if record.get("deleted_at") else None,
        }

        if payload["visibility"] not in ALLOWED_VISIBILITY:
            raise ValueError(f"Unsupported visibility during import: {payload['visibility']}")
        if payload["owner_user_id"] is None or payload["created_by_user_id"] is None:
            raise ValueError("Dataset import records must include owner_user_id and created_by_user_id")

        existing = self.get_dataset_by_id(dataset_id)
        with self.session_factory.begin() as session:
            if existing:
                session.execute(
                    update(self.datasets)
                    .where(self.datasets.c.id == dataset_id)
                    .values(**payload)
                )
            else:
                session.execute(insert(self.datasets).values(**payload))
        return self.get_dataset_by_id(dataset_id) or payload

    def get_dataset_by_id(self, dataset_id: str) -> dict[str, Any] | None:
        return self._select_one(select(self.datasets).where(self.datasets.c.id == dataset_id))

    def get_dataset_by_storage(self, container_name: str, storage_prefix: str) -> dict[str, Any] | None:
        return self._select_one(
            select(self.datasets).where(
                and_(
                    self.datasets.c.storage_container == container_name,
                    self.datasets.c.storage_prefix == storage_prefix.rstrip("/"),
                    self.datasets.c.deleted_at.is_(None),
                )
            )
        )

    def get_dataset_by_route(
        self,
        *,
        visibility: str,
        category: str,
        brand: str,
        dataset_name: str,
        owner_user_id: int | str | None = None,
    ) -> dict[str, Any] | None:
        filters = [
            self.datasets.c.deleted_at.is_(None),
            self.datasets.c.visibility == visibility,
            self.datasets.c.category == category,
            self.datasets.c.brand == brand,
            self.datasets.c.dataset_name == dataset_name,
        ]
        if visibility == "private":
            normalized_owner_id = self._coerce_user_id(owner_user_id)
            if normalized_owner_id is None:
                raise ValueError("owner_user_id is required for private dataset route lookup")
            filters.append(self.datasets.c.owner_user_id == normalized_owner_id)

        return self._select_one(select(self.datasets).where(and_(*filters)))

    def update_dataset_storage(
        self,
        dataset_id: str,
        *,
        storage_container: str,
        storage_prefix: str,
    ) -> dict[str, Any] | None:
        with self.session_factory.begin() as session:
            session.execute(
                update(self.datasets)
                .where(self.datasets.c.id == dataset_id)
                .values(
                    storage_container=storage_container,
                    storage_prefix=storage_prefix.rstrip("/"),
                    updated_at=utc_now(),
                )
            )
        return self.get_dataset_by_id(dataset_id)

    def mark_dataset_deleted(self, dataset_id: str) -> None:
        now = utc_now()
        with self.session_factory.begin() as session:
            session.execute(
                update(self.datasets)
                .where(self.datasets.c.id == dataset_id)
                .values(deleted_at=now, updated_at=now)
            )

    def parse_route_path(self, route_path: str) -> dict[str, Any]:
        cleaned = route_path.strip("/ ")
        if not cleaned:
            return {"scope": "root", "segments": []}

        segments = [segment for segment in cleaned.split("/") if segment]

        if segments[0] == "my":
            dataset_root = segments[:4]
            if len(dataset_root) < 4:
                return {"scope": "my", "segments": segments}
            return {
                "scope": "my",
                "segments": segments,
                "category": dataset_root[1],
                "brand": dataset_root[2],
                "dataset_name": dataset_root[3],
                "extra_segments": segments[4:],
                "dataset_root": "/".join(dataset_root),
            }

        if segments[0] == "admin":
            dataset_root = segments[:5]
            if len(dataset_root) < 5:
                return {"scope": "admin", "segments": segments}
            return {
                "scope": "admin",
                "segments": segments,
                "owner_slug": dataset_root[1],
                "category": dataset_root[2],
                "brand": dataset_root[3],
                "dataset_name": dataset_root[4],
                "extra_segments": segments[5:],
                "dataset_root": "/".join(dataset_root),
            }

        dataset_root = segments[:3]
        if len(dataset_root) < 3:
            return {"scope": "public", "segments": segments}
        return {
            "scope": "public",
            "segments": segments,
            "category": dataset_root[0],
            "brand": dataset_root[1],
            "dataset_name": dataset_root[2],
            "extra_segments": segments[3:],
            "dataset_root": "/".join(dataset_root),
        }

    def resolve_dataset_route(self, route_path: str, current_user: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
        parsed = self.parse_route_path(route_path)
        scope = parsed["scope"]

        if scope == "root" or "dataset_root" not in parsed:
            raise ValueError("Route does not identify a dataset")

        datasets = self.list_accessible_datasets(current_user)
        for dataset in datasets:
            if dataset["visibility"] == "public":
                if (
                    scope == "public"
                    and dataset["category"] == parsed["category"]
                    and dataset["brand"] == parsed["brand"]
                    and dataset["dataset_name"] == parsed["dataset_name"]
                ):
                    return dataset, parsed.get("extra_segments", [])
                continue

            if scope == "my" and dataset["owner_user_id"] == current_user["id"]:
                if (
                    dataset["category"] == parsed["category"]
                    and dataset["brand"] == parsed["brand"]
                    and dataset["dataset_name"] == parsed["dataset_name"]
                ):
                    return dataset, parsed.get("extra_segments", [])

            if scope == "admin" and current_user["role"] == "admin":
                if (
                    dataset["owner_storage_slug"] == parsed["owner_slug"]
                    and dataset["category"] == parsed["category"]
                    and dataset["brand"] == parsed["brand"]
                    and dataset["dataset_name"] == parsed["dataset_name"]
                ):
                    return dataset, parsed.get("extra_segments", [])

        raise PermissionError("Dataset not found or access denied")

    def build_dataset_summary(self, dataset: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        viewer_mode = "default"
        if dataset["visibility"] == "private" and dataset["owner_user_id"] != current_user["id"]:
            viewer_mode = "admin"
        full_path = self.route_path_for_dataset(dataset, viewer_mode=viewer_mode)
        return {
            **dataset,
            "full_path": full_path,
            "viewer_path": f"/viewer/{full_path}",
            "source_path": dataset["storage_prefix"],
            "is_owner": dataset["owner_user_id"] == current_user["id"],
            "is_admin_view": viewer_mode == "admin",
        }

    def reserve_unique_dataset_name(
        self,
        *,
        owner_user: dict[str, Any],
        visibility: str,
        category: str,
        brand: str,
        preferred_name: str,
    ) -> str:
        candidate = preferred_name
        counter = 2
        while self.dataset_exists_for_route(
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=candidate,
            owner_user_id=owner_user["id"],
        ):
            candidate = f"{preferred_name}-{counter}"
            counter += 1
        return candidate

    def assert_user_can_access_dataset(self, dataset: dict[str, Any], current_user: dict[str, Any]) -> None:
        if dataset["visibility"] == "public":
            return
        if dataset["owner_user_id"] == current_user["id"]:
            return
        if current_user["role"] == "admin":
            return
        raise PermissionError("Dataset access denied")

    def assert_user_can_manage_dataset(self, dataset: dict[str, Any], current_user: dict[str, Any]) -> None:
        if dataset["owner_user_id"] == current_user["id"] or current_user["role"] == "admin":
            return
        raise PermissionError("Dataset management denied")

    def backfill_dataset(
        self,
        *,
        owner_user: dict[str, Any],
        created_by_user: dict[str, Any],
        visibility: str,
        category: str,
        brand: str,
        dataset_name: str,
        storage_container: str,
        storage_prefix: str,
        source_kind: str = "migration",
        task: str = "",
    ) -> dict[str, Any]:
        normalized_prefix = storage_prefix.rstrip("/")
        existing = self.get_dataset_by_storage(storage_container, normalized_prefix)
        if existing:
            logger.info("Dataset catalog already contains %s/%s", storage_container, storage_prefix)
            return existing

        route_existing = self.get_dataset_by_route(
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            owner_user_id=owner_user["id"] if visibility == "private" else None,
        )
        if route_existing:
            if (
                route_existing["storage_container"] != storage_container
                or route_existing["storage_prefix"] != normalized_prefix
            ):
                logger.info(
                    "Repairing dataset route %s/%s/%s to use %s/%s",
                    category,
                    brand,
                    dataset_name,
                    storage_container,
                    normalized_prefix,
                )
                return self.update_dataset_storage(
                    route_existing["id"],
                    storage_container=storage_container,
                    storage_prefix=normalized_prefix,
                ) or route_existing
            return route_existing

        return self.create_dataset(
            owner_user=owner_user,
            created_by_user=created_by_user,
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            storage_container=storage_container,
            storage_prefix=normalized_prefix,
            source_kind=source_kind,
            task=task,
        )
