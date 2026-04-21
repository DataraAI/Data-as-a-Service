"""SQLite-backed catalog for application auth and dataset routing."""

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

    def initialize(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    entra_object_id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    approved INTEGER NOT NULL DEFAULT 0,
                    role TEXT NOT NULL DEFAULT 'user',
                    storage_slug TEXT NOT NULL UNIQUE,
                    private_container_name TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_login_at TEXT
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
                    FOREIGN KEY(owner_user_id) REFERENCES users(entra_object_id),
                    FOREIGN KEY(created_by_user_id) REFERENCES users(entra_object_id),
                    FOREIGN KEY(source_dataset_id) REFERENCES datasets(id)
                );

                CREATE INDEX IF NOT EXISTS idx_datasets_owner ON datasets(owner_user_id);
                CREATE INDEX IF NOT EXISTS idx_datasets_visibility ON datasets(visibility);
                CREATE INDEX IF NOT EXISTS idx_datasets_storage ON datasets(storage_container, storage_prefix);
                CREATE INDEX IF NOT EXISTS idx_datasets_route ON datasets(category, brand, dataset_name);
                """
            )

    def _fetchone(self, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(query, params).fetchone()
            return row_to_dict(row)

    def _fetchall(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def _storage_slug_exists(self, slug: str) -> bool:
        return self._fetchone("SELECT entra_object_id FROM users WHERE storage_slug = ?", (slug,)) is not None

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

    def get_user_by_entra_object_id(self, entra_object_id: str) -> dict[str, Any] | None:
        return self._fetchone("SELECT * FROM users WHERE entra_object_id = ?", (entra_object_id,))

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        return self._fetchone("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email,))

    def get_user_by_storage_slug(self, storage_slug: str) -> dict[str, Any] | None:
        return self._fetchone("SELECT * FROM users WHERE storage_slug = ?", (storage_slug,))

    def list_users(self) -> list[dict[str, Any]]:
        return self._fetchall(
            "SELECT * FROM users ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, email ASC"
        )

    def upsert_user(
        self,
        *,
        entra_object_id: str,
        email: str,
        display_name: str,
        bootstrap_admin_emails: list[str] | None = None,
    ) -> dict[str, Any]:
        existing = self.get_user_by_entra_object_id(entra_object_id)
        now = utc_now()
        normalized_email = email.strip().lower()
        display_name = display_name.strip() or normalized_email
        bootstrap_admin_emails = [value.strip().lower() for value in (bootstrap_admin_emails or []) if value.strip()]
        should_bootstrap_admin = normalized_email in bootstrap_admin_emails

        if existing:
            approved = int(existing["approved"])
            role = existing["role"]
            if should_bootstrap_admin:
                approved = 1
                role = "admin"

            with self.connection() as conn:
                conn.execute(
                    """
                    UPDATE users
                    SET email = ?, display_name = ?, approved = ?, role = ?, updated_at = ?, last_login_at = ?
                    WHERE entra_object_id = ?
                    """,
                    (
                        normalized_email,
                        display_name,
                        approved,
                        role,
                        now,
                        now,
                        entra_object_id,
                    ),
                )
            return self.get_user_by_entra_object_id(entra_object_id) or existing

        storage_slug = self.generate_unique_storage_slug(
            normalized_email.split("@", 1)[0],
            display_name,
            normalized_email,
        )
        approved = 1 if should_bootstrap_admin else 0
        role = "admin" if should_bootstrap_admin else "user"

        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO users (
                    entra_object_id,
                    email,
                    display_name,
                    approved,
                    role,
                    storage_slug,
                    private_container_name,
                    created_at,
                    updated_at,
                    last_login_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entra_object_id,
                    normalized_email,
                    display_name,
                    approved,
                    role,
                    storage_slug,
                    storage_slug,
                    now,
                    now,
                    now,
                ),
            )
        return self.get_user_by_entra_object_id(entra_object_id)

    def set_user_approval(self, user_ref: str, approved: bool) -> dict[str, Any] | None:
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET approved = ?, updated_at = ?
                WHERE entra_object_id = ? OR LOWER(email) = LOWER(?)
                """,
                (1 if approved else 0, utc_now(), user_ref, user_ref),
            )
        return self.get_user_by_entra_object_id(user_ref) or self.get_user_by_email(user_ref)

    def set_user_role(self, user_ref: str, role: str) -> dict[str, Any] | None:
        if role not in ALLOWED_ROLES:
            raise ValueError(f"Unsupported role: {role}")
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET role = ?, approved = CASE WHEN ? = 'admin' THEN 1 ELSE approved END, updated_at = ?
                WHERE entra_object_id = ? OR LOWER(email) = LOWER(?)
                """,
                (role, role, utc_now(), user_ref, user_ref),
            )
        return self.get_user_by_entra_object_id(user_ref) or self.get_user_by_email(user_ref)

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
        params.append(current_user["entra_object_id"])
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
            owner_user_id=owner_user["entra_object_id"],
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
                    owner_user["entra_object_id"],
                    owner_user["storage_slug"],
                    created_by_user["entra_object_id"],
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

    def mark_dataset_deleted(self, dataset_id: str) -> None:
        with self.connection() as conn:
            conn.execute(
                "UPDATE datasets SET deleted_at = ?, updated_at = ? WHERE id = ?",
                (utc_now(), utc_now(), dataset_id),
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

            if scope == "my" and dataset["owner_user_id"] == current_user["entra_object_id"]:
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
        if dataset["visibility"] == "private" and dataset["owner_user_id"] != current_user["entra_object_id"]:
            viewer_mode = "admin"
        full_path = self.route_path_for_dataset(dataset, viewer_mode=viewer_mode)
        return {
            **dataset,
            "full_path": full_path,
            "viewer_path": f"/viewer/{full_path}",
            "source_path": dataset["storage_prefix"],
            "is_owner": dataset["owner_user_id"] == current_user["entra_object_id"],
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
            owner_user_id=owner_user["entra_object_id"],
        ):
            candidate = f"{preferred_name}-{counter}"
            counter += 1
        return candidate

    def assert_user_can_access_dataset(self, dataset: dict[str, Any], current_user: dict[str, Any]) -> None:
        if dataset["visibility"] == "public":
            return
        if dataset["owner_user_id"] == current_user["entra_object_id"]:
            return
        if current_user["role"] == "admin":
            return
        raise PermissionError("Dataset access denied")

    def assert_user_can_manage_dataset(self, dataset: dict[str, Any], current_user: dict[str, Any]) -> None:
        if dataset["owner_user_id"] == current_user["entra_object_id"] or current_user["role"] == "admin":
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
        existing = self.get_dataset_by_storage(storage_container, storage_prefix.rstrip("/"))
        if existing:
            logger.info("Dataset catalog already contains %s/%s", storage_container, storage_prefix)
            return existing
        return self.create_dataset(
            owner_user=owner_user,
            created_by_user=created_by_user,
            visibility=visibility,
            category=category,
            brand=brand,
            dataset_name=dataset_name,
            storage_container=storage_container,
            storage_prefix=storage_prefix.rstrip("/"),
            source_kind=source_kind,
            task=task,
        )
