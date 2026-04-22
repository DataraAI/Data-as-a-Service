"""SQLite-backed catalog for Datara auth and dataset routing."""

from __future__ import annotations

import re
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator

from datara.config import settings
from datara.logging import logger


ALLOWED_VISIBILITY = {"private", "public"}
ALLOWED_ROLES = {"user", "admin"}
ALLOWED_APPROVAL_STATUSES = {"pending", "approved", "rejected"}
SLUG_PATTERN = re.compile(r"[^a-z0-9-]+")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
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
    """Small SQLite layer used for auth and dataset authorization."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        self.db_path = Path(db_path or settings.sqlite_path).expanduser().resolve()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    @contextmanager
    def connection(self) -> Generator[sqlite3.Connection, None, None]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table_name,),
        ).fetchone()
        return row is not None

    @staticmethod
    def _table_columns(conn: sqlite3.Connection, table_name: str) -> set[str]:
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        return {str(row["name"]) for row in rows}

    def _assert_supported_schema(self, conn: sqlite3.Connection) -> None:
        if self._table_exists(conn, "users"):
            user_columns = self._table_columns(conn, "users")
            if "entra_object_id" in user_columns and "id" not in user_columns:
                raise RuntimeError(
                    "The configured auth SQLite file still uses the retired Entra schema. "
                    "Point AUTH_SQLITE_PATH to a fresh file or remove the old SQLite database "
                    "before starting the app."
                )

    def initialize(self) -> None:
        with self.connection() as conn:
            self._assert_supported_schema(conn)
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    display_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    approval_status TEXT NOT NULL DEFAULT 'pending',
                    role TEXT NOT NULL DEFAULT 'user',
                    storage_slug TEXT NOT NULL UNIQUE,
                    private_container_name TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_login_at TEXT,
                    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
                    CHECK (role IN ('user', 'admin'))
                );

                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_storage_slug ON users(storage_slug);

                CREATE TABLE IF NOT EXISTS datasets (
                    id TEXT PRIMARY KEY,
                    owner_user_id TEXT NOT NULL,
                    owner_storage_slug TEXT NOT NULL,
                    created_by_user_id TEXT NOT NULL,
                    visibility TEXT NOT NULL,
                    category TEXT NOT NULL,
                    brand TEXT NOT NULL,
                    dataset_name TEXT NOT NULL,
                    storage_container TEXT NOT NULL,
                    storage_prefix TEXT NOT NULL,
                    source_kind TEXT NOT NULL DEFAULT 'upload',
                    source_dataset_id TEXT,
                    task TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    deleted_at TEXT,
                    FOREIGN KEY(owner_user_id) REFERENCES users(id),
                    FOREIGN KEY(created_by_user_id) REFERENCES users(id),
                    FOREIGN KEY(source_dataset_id) REFERENCES datasets(id)
                );

                CREATE INDEX IF NOT EXISTS idx_datasets_owner ON datasets(owner_user_id);
                CREATE INDEX IF NOT EXISTS idx_datasets_visibility ON datasets(visibility);
                CREATE INDEX IF NOT EXISTS idx_datasets_storage ON datasets(storage_container, storage_prefix);
                CREATE INDEX IF NOT EXISTS idx_datasets_route ON datasets(category, brand, dataset_name);
                """
            )

    @staticmethod
    def _decorate_user(record: dict[str, Any] | None) -> dict[str, Any] | None:
        if not record:
            return None
        approval_status = str(record.get("approval_status") or "pending")
        record["approval_status"] = approval_status
        record["approved"] = approval_status == "approved" or record.get("role") == "admin"
        return record

    def _fetchone(self, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(query, params).fetchone()
            return row_to_dict(row)

    def _fetchall(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def _storage_slug_exists(self, slug: str) -> bool:
        return self._fetchone("SELECT id FROM users WHERE storage_slug = ?", (slug,)) is not None

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

    def count_admin_users(self) -> int:
        result = self._fetchone("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
        return int(result["count"]) if result else 0

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._decorate_user(self._fetchone("SELECT * FROM users WHERE id = ?", (user_id,)))

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        return self._decorate_user(self._fetchone("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)))

    def get_user_by_storage_slug(self, storage_slug: str) -> dict[str, Any] | None:
        return self._decorate_user(self._fetchone("SELECT * FROM users WHERE storage_slug = ?", (storage_slug,)))

    def get_user(self, user_ref: str) -> dict[str, Any] | None:
        return self.get_user_by_id(user_ref) or self.get_user_by_email(user_ref)

    def get_first_admin_user(self) -> dict[str, Any] | None:
        return self._decorate_user(
            self._fetchone(
                """
                SELECT *
                FROM users
                WHERE role = 'admin'
                ORDER BY created_at ASC
                LIMIT 1
                """
            )
        )

    def list_users(self) -> list[dict[str, Any]]:
        return [
            self._decorate_user(record) or record
            for record in self._fetchall(
                """
                SELECT *
                FROM users
                ORDER BY
                    CASE role WHEN 'admin' THEN 0 ELSE 1 END,
                    CASE approval_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                    email ASC
                """
            )
        ]

    def create_user(
        self,
        *,
        email: str,
        display_name: str,
        password_hash: str,
        approval_status: str = "pending",
        role: str = "user",
    ) -> dict[str, Any]:
        if approval_status not in ALLOWED_APPROVAL_STATUSES:
            raise ValueError(f"Unsupported approval status: {approval_status}")
        if role not in ALLOWED_ROLES:
            raise ValueError(f"Unsupported role: {role}")

        normalized_email = email.strip().lower()
        display_name = display_name.strip() or normalized_email
        storage_slug = self.generate_unique_storage_slug(
            normalized_email.split("@", 1)[0],
            display_name,
            normalized_email,
        )
        now = utc_now()
        user_id = uuid.uuid4().hex

        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO users (
                    id,
                    email,
                    display_name,
                    password_hash,
                    approval_status,
                    role,
                    storage_slug,
                    private_container_name,
                    created_at,
                    updated_at,
                    last_login_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    user_id,
                    normalized_email,
                    display_name,
                    password_hash,
                    approval_status,
                    role,
                    storage_slug,
                    storage_slug,
                    now,
                    now,
                ),
            )
        return self.get_user_by_id(user_id)

    def touch_user_login(self, user_id: str) -> None:
        now = utc_now()
        with self.connection() as conn:
            conn.execute(
                "UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?",
                (now, now, user_id),
            )

    def set_user_approval_status(self, user_ref: str, approval_status: str) -> dict[str, Any] | None:
        if approval_status not in ALLOWED_APPROVAL_STATUSES:
            raise ValueError(f"Unsupported approval status: {approval_status}")
        now = utc_now()
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET approval_status = ?, updated_at = ?
                WHERE id = ? OR email = ?
                """,
                (approval_status, now, user_ref, user_ref.strip().lower()),
            )
        return self.get_user(user_ref)

    def set_user_role(self, user_ref: str, role: str) -> dict[str, Any] | None:
        if role not in ALLOWED_ROLES:
            raise ValueError(f"Unsupported role: {role}")

        user = self.get_user(user_ref)
        if not user:
            return None

        approval_status = user["approval_status"]
        if role == "admin":
            approval_status = "approved"

        with self.connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET role = ?, approval_status = ?, updated_at = ?
                WHERE id = ?
                """,
                (role, approval_status, utc_now(), user["id"]),
            )
        return self.get_user_by_id(user["id"])

    def update_user_password(self, user_ref: str, password_hash: str) -> dict[str, Any] | None:
        user = self.get_user(user_ref)
        if not user:
            return None
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET password_hash = ?, updated_at = ?
                WHERE id = ?
                """,
                (password_hash, utc_now(), user["id"]),
            )
        return self.get_user_by_id(user["id"])

    def route_path_for_dataset(self, dataset: dict[str, Any], viewer_mode: str = "default") -> str:
        base = f"{dataset['category']}/{dataset['brand']}/{dataset['dataset_name']}"
        if dataset["visibility"] == "public":
            return base
        if viewer_mode == "admin":
            return f"admin/{dataset['owner_storage_slug']}/{base}"
        return f"my/{base}"

    def list_accessible_datasets(self, current_user: dict[str, Any], *, include_deleted: bool = False) -> list[dict[str, Any]]:
        clauses = ["deleted_at IS NULL"] if not include_deleted else []
        params: list[Any] = []

        if current_user["role"] == "admin":
            where = " AND ".join(clauses) if clauses else "1=1"
            query = f"SELECT * FROM datasets WHERE {where} ORDER BY visibility ASC, category ASC, brand ASC, dataset_name ASC"
            return self._fetchall(query, tuple(params))

        clauses.append("(visibility = 'public' OR owner_user_id = ?)")
        params.append(current_user["id"])
        where = " AND ".join(clauses)
        query = f"SELECT * FROM datasets WHERE {where} ORDER BY visibility ASC, category ASC, brand ASC, dataset_name ASC"
        return self._fetchall(query, tuple(params))

    def dataset_exists_for_route(
        self,
        *,
        visibility: str,
        category: str,
        brand: str,
        dataset_name: str,
        owner_user_id: str,
    ) -> bool:
        if visibility == "public":
            row = self._fetchone(
                """
                SELECT id FROM datasets
                WHERE deleted_at IS NULL
                  AND visibility = 'public'
                  AND category = ?
                  AND brand = ?
                  AND dataset_name = ?
                """,
                (category, brand, dataset_name),
            )
            return row is not None

        row = self._fetchone(
            """
            SELECT id FROM datasets
            WHERE deleted_at IS NULL
              AND visibility = 'private'
              AND owner_user_id = ?
              AND category = ?
              AND brand = ?
              AND dataset_name = ?
            """,
            (owner_user_id, category, brand, dataset_name),
        )
        return row is not None

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
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO datasets (
                    id,
                    owner_user_id,
                    owner_storage_slug,
                    created_by_user_id,
                    visibility,
                    category,
                    brand,
                    dataset_name,
                    storage_container,
                    storage_prefix,
                    source_kind,
                    source_dataset_id,
                    task,
                    created_at,
                    updated_at,
                    deleted_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    dataset_id,
                    owner_user["id"],
                    owner_user["storage_slug"],
                    created_by_user["id"],
                    visibility,
                    category,
                    brand,
                    dataset_name,
                    storage_container,
                    storage_prefix,
                    source_kind,
                    source_dataset_id,
                    task,
                    now,
                    now,
                ),
            )
        return self.get_dataset_by_id(dataset_id)

    def get_dataset_by_id(self, dataset_id: str) -> dict[str, Any] | None:
        return self._fetchone("SELECT * FROM datasets WHERE id = ?", (dataset_id,))

    def get_dataset_by_storage(self, container_name: str, storage_prefix: str) -> dict[str, Any] | None:
        return self._fetchone(
            """
            SELECT * FROM datasets
            WHERE storage_container = ?
              AND storage_prefix = ?
              AND deleted_at IS NULL
            """,
            (container_name, storage_prefix.rstrip("/")),
        )

    def get_dataset_by_route(
        self,
        *,
        visibility: str,
        category: str,
        brand: str,
        dataset_name: str,
        owner_user_id: str | None = None,
    ) -> dict[str, Any] | None:
        params: list[Any] = [visibility, category, brand, dataset_name]
        owner_clause = ""
        if visibility == "private":
            if not owner_user_id:
                raise ValueError("owner_user_id is required for private dataset route lookup")
            owner_clause = " AND owner_user_id = ?"
            params.append(owner_user_id)

        return self._fetchone(
            f"""
            SELECT *
            FROM datasets
            WHERE deleted_at IS NULL
              AND visibility = ?
              AND category = ?
              AND brand = ?
              AND dataset_name = ?
              {owner_clause}
            """,
            tuple(params),
        )

    def update_dataset_storage(
        self,
        dataset_id: str,
        *,
        storage_container: str,
        storage_prefix: str,
    ) -> dict[str, Any] | None:
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE datasets
                SET storage_container = ?, storage_prefix = ?, updated_at = ?
                WHERE id = ?
                """,
                (storage_container, storage_prefix.rstrip("/"), utc_now(), dataset_id),
            )
        return self.get_dataset_by_id(dataset_id)

    def mark_dataset_deleted(self, dataset_id: str) -> None:
        now = utc_now()
        with self.connection() as conn:
            conn.execute(
                "UPDATE datasets SET deleted_at = ?, updated_at = ? WHERE id = ?",
                (now, now, dataset_id),
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
