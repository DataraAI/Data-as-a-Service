"""Shared pytest fixtures for Datara backend tests."""

from __future__ import annotations

import os

# Configure auth database before any app/datara imports that touch SQLStore.
os.environ.setdefault("AUTH_DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("FLASK_SECRET_KEY", "test-secret-key-for-pytest")
os.environ.setdefault("AUTH_REGISTRATION_ENABLED", "true")
os.environ.setdefault("AUTH_ALLOW_PENDING_LOGIN_SESSION", "true")

import pytest
from werkzeug.security import generate_password_hash

from datara.services.auth_service import AuthService
from datara.services.sql_store import SQLStore

TEST_PASSWORD = "password1234"


@pytest.fixture
def sql_store() -> SQLStore:
    return SQLStore(database_url="sqlite:///:memory:")


@pytest.fixture
def auth_service(sql_store: SQLStore) -> AuthService:
    return AuthService(sql_store)


@pytest.fixture
def app(sql_store: SQLStore, auth_service: AuthService, monkeypatch: pytest.MonkeyPatch):
    import app as app_module

    monkeypatch.setattr(app_module, "sql_store", sql_store)
    monkeypatch.setattr(app_module, "auth_service", auth_service)

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    flask_app.config["SECRET_KEY"] = "test-secret-key-for-pytest"
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client(use_cookies=True)


def make_user(
    sql_store: SQLStore,
    *,
    email: str = "user@example.com",
    display_name: str = "Test User",
    password: str = TEST_PASSWORD,
    approval_status: str = "approved",
    role: str = "customer",
) -> dict:
    return sql_store.create_user(
        email=email,
        display_name=display_name,
        password_hash=generate_password_hash(password),
        approval_status=approval_status,
        role=role,
    )


@pytest.fixture
def approved_user(sql_store: SQLStore) -> dict:
    return make_user(sql_store)


@pytest.fixture
def pending_user(sql_store: SQLStore) -> dict:
    return make_user(
        sql_store,
        email="pending@example.com",
        display_name="Pending User",
        approval_status="pending",
    )


@pytest.fixture
def rejected_user(sql_store: SQLStore) -> dict:
    return make_user(
        sql_store,
        email="rejected@example.com",
        display_name="Rejected User",
        approval_status="rejected",
    )