"""Copy Datara auth/catalog rows from the legacy SQLite file into Azure SQL."""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from typing import Any

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.config import settings
from datara.services.sql_store import SQLStore


DEFAULT_LEGACY_SQLITE_PATH = os.path.join(_BACKEND, "data", "datara_app.sqlite3")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate Datara auth/catalog rows from SQLite to Azure SQL")
    parser.add_argument(
        "--sqlite-path",
        default=DEFAULT_LEGACY_SQLITE_PATH,
        help="Path to the legacy SQLite database file",
    )
    parser.add_argument("--dry-run", action="store_true", help="Inspect only; do not write to Azure SQL")
    return parser.parse_args()


def fetch_sqlite_rows(sqlite_path: str, table_name: str) -> list[dict[str, object]]:
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(f"SELECT * FROM {table_name}").fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def normalize_role(role: object | None) -> str:
    value = str(role or "customer").strip().lower()
    if value == "user":
        return "customer"
    return value


def normalize_approval_status(status: object | None, role: str) -> str:
    normalized = str(status or "").strip().lower()
    if normalized in {"pending", "approved", "rejected"}:
        return normalized
    return "approved" if role == "admin" else "pending"


def user_sort_key(row: dict[str, Any]) -> tuple[str, str]:
    created_at = str(row.get("created_at") or "")
    email = str(row.get("email") or "").lower()
    return created_at, email


def pick_primary_admin(users: list[dict[str, Any]]) -> dict[str, Any]:
    admin_candidates = [user for user in users if normalize_role(user.get("role")) == "admin"]
    if not admin_candidates:
        raise SystemExit("No admin user exists in the legacy SQLite database.")

    bootstrap_emails = {email.lower() for email in settings.auth_bootstrap_admin_emails}
    prioritized = [
        user
        for user in admin_candidates
        if str(user.get("email") or "").strip().lower() in bootstrap_emails
    ]
    chosen_pool = prioritized or admin_candidates
    chosen_pool.sort(key=user_sort_key)
    return chosen_pool[0]


def ensure_target_empty(store: SQLStore) -> None:
    if store.count_users() > 0 or store.count_datasets(include_deleted=True) > 0:
        raise SystemExit(
            "Azure SQL target is not empty. Use a fresh database for migration or clear the target first."
        )


def create_user_from_legacy_row(
    store: SQLStore,
    row: dict[str, Any],
    *,
    approved_by_user_id: int | None,
) -> dict[str, Any]:
    role = normalize_role(row.get("role"))
    approval_status = normalize_approval_status(row.get("approval_status"), role)
    if role == "admin":
        approval_status = "approved"

    return store.create_user(
        email=str(row.get("email") or "").strip().lower(),
        display_name=str(row.get("display_name") or row.get("email") or "").strip(),
        password_hash=str(row.get("password_hash") or ""),
        approval_status=approval_status,
        role=role,
        approved_by_user_id=approved_by_user_id if approval_status == "approved" else None,
        storage_slug=str(row.get("storage_slug") or "").strip(),
        private_container_name=str(row.get("private_container_name") or "").strip(),
        created_at=str(row.get("created_at") or ""),
        updated_at=str(row.get("updated_at") or ""),
        last_login_at=str(row.get("last_login_at")) if row.get("last_login_at") else None,
    )


def main() -> None:
    args = parse_args()
    sqlite_path = os.path.abspath(os.path.expanduser(args.sqlite_path))

    if not os.path.exists(sqlite_path):
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    users = fetch_sqlite_rows(sqlite_path, "users")
    datasets = fetch_sqlite_rows(sqlite_path, "datasets")

    primary_admin = pick_primary_admin(users) if users else None

    print(f"Legacy SQLite source: {sqlite_path}")
    print(f"Azure SQL target: {settings.auth_database_label}")
    print(f"Users found: {len(users)}")
    print(f"Datasets found: {len(datasets)}")
    if primary_admin:
        print(f"Primary migrated admin: {primary_admin.get('email')}")

    if args.dry_run:
        print("Dry run only. No rows were written.")
        return

    store = SQLStore()
    ensure_target_empty(store)

    if not users:
        if datasets:
            raise SystemExit("Legacy datasets exist, but the SQLite users table is empty. Migration cannot continue.")
        print("No legacy users were found. Nothing to migrate.")
        return

    old_to_new_user_ids: dict[str, int] = {}

    created_admin = create_user_from_legacy_row(store, primary_admin, approved_by_user_id=None)
    primary_admin_old_id = str(primary_admin["id"])
    primary_admin_new_id = int(created_admin["id"])
    old_to_new_user_ids[primary_admin_old_id] = primary_admin_new_id

    remaining_users = [user for user in users if str(user["id"]) != primary_admin_old_id]
    remaining_users.sort(key=user_sort_key)

    for user in remaining_users:
        role = normalize_role(user.get("role"))
        approval_status = normalize_approval_status(user.get("approval_status"), role)
        approver_id = primary_admin_new_id if approval_status == "approved" else None
        migrated_user = create_user_from_legacy_row(
            store,
            user,
            approved_by_user_id=approver_id,
        )
        old_to_new_user_ids[str(user["id"])] = int(migrated_user["id"])

    ordered_datasets = sorted(
        datasets,
        key=lambda row: (str(row.get("created_at") or ""), str(row.get("id") or "")),
    )

    first_pass_records: list[dict[str, Any]] = []
    second_pass_records: list[dict[str, Any]] = []

    for dataset in ordered_datasets:
        legacy_owner_id = str(dataset["owner_user_id"])
        legacy_creator_id = str(dataset.get("created_by_user_id") or dataset["owner_user_id"])
        if legacy_owner_id not in old_to_new_user_ids:
            raise SystemExit(f"Dataset {dataset['id']} references missing owner user id {legacy_owner_id}")
        if legacy_creator_id not in old_to_new_user_ids:
            raise SystemExit(f"Dataset {dataset['id']} references missing creator user id {legacy_creator_id}")

        migrated_record = {
            "id": str(dataset["id"]).strip(),
            "owner_user_id": old_to_new_user_ids[legacy_owner_id],
            "owner_storage_slug": str(dataset["owner_storage_slug"]).strip(),
            "created_by_user_id": old_to_new_user_ids[legacy_creator_id],
            "visibility": str(dataset["visibility"]).strip(),
            "category": str(dataset["category"]).strip(),
            "brand": str(dataset["brand"]).strip(),
            "dataset_name": str(dataset["dataset_name"]).strip(),
            "storage_container": str(dataset["storage_container"]).strip(),
            "storage_prefix": str(dataset["storage_prefix"]).strip(),
            "source_kind": str(dataset.get("source_kind") or "upload").strip(),
            "source_dataset_id": str(dataset["source_dataset_id"]).strip() if dataset.get("source_dataset_id") else None,
            "task": str(dataset.get("task") or ""),
            "created_at": str(dataset.get("created_at") or ""),
            "updated_at": str(dataset.get("updated_at") or ""),
            "deleted_at": str(dataset["deleted_at"]) if dataset.get("deleted_at") else None,
        }

        first_pass = dict(migrated_record)
        first_pass["source_dataset_id"] = None
        first_pass_records.append(first_pass)
        second_pass_records.append(migrated_record)

    for dataset_record in first_pass_records:
        store.upsert_dataset_record(dataset_record)

    for dataset_record in second_pass_records:
        if dataset_record["source_dataset_id"]:
            store.upsert_dataset_record(dataset_record)

    print("Migration complete.")
    print(f"Azure SQL users: {store.count_users()}")
    print(f"Azure SQL datasets: {store.count_datasets(include_deleted=True)}")
    print(f"Primary admin user id: {primary_admin_new_id}")


if __name__ == "__main__":
    main()
