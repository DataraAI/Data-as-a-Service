"""Integration tests for SQLStore user credential storage and lookup."""

from __future__ import annotations

from werkzeug.security import check_password_hash, generate_password_hash

from datara.services.sql_store import SQLStore
from tests.conftest import TEST_PASSWORD, make_user


def test_create_user_stores_normalized_email_and_password_hash(sql_store: SQLStore) -> None:
    password_hash = generate_password_hash(TEST_PASSWORD)
    user = sql_store.create_user(
        email="User@Example.COM",
        display_name="Test User",
        password_hash=password_hash,
        approval_status="approved",
        role="customer",
    )

    assert user["email"] == "user@example.com"
    assert user["display_name"] == "Test User"
    assert user["approval_status"] == "approved"
    assert user["role"] == "customer"
    assert user["storage_slug"]
    assert user["private_container_name"]
    assert check_password_hash(user["password_hash"], TEST_PASSWORD)


def test_get_user_by_email_finds_existing_user(sql_store: SQLStore) -> None:
    created = make_user(sql_store, email="lookup@example.com")

    found = sql_store.get_user_by_email("lookup@example.com")
    assert found is not None
    assert found["id"] == created["id"]
    assert found["email"] == "lookup@example.com"


def test_get_user_by_email_is_case_insensitive(sql_store: SQLStore) -> None:
    make_user(sql_store, email="case@example.com")

    found = sql_store.get_user_by_email("CASE@EXAMPLE.COM")
    assert found is not None
    assert found["email"] == "case@example.com"


def test_get_user_by_email_returns_none_for_missing_user(sql_store: SQLStore) -> None:
    assert sql_store.get_user_by_email("missing@example.com") is None


def test_touch_user_login_updates_timestamp(sql_store: SQLStore) -> None:
    user = make_user(sql_store)
    assert user.get("last_login_at") is None

    sql_store.touch_user_login(user["id"])
    refreshed = sql_store.get_user_by_id(user["id"])

    assert refreshed is not None
    assert refreshed["last_login_at"] is not None


def test_password_verification_matches_stored_hash(sql_store: SQLStore) -> None:
    user = make_user(sql_store, email="verify@example.com", password="my-secure-pass")

    stored = sql_store.get_user_by_email("verify@example.com")
    assert stored is not None
    assert check_password_hash(stored["password_hash"], "my-secure-pass")
    assert not check_password_hash(stored["password_hash"], "wrong-password")
