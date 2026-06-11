"""Unit tests for AuthService login, register, and session behavior."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from flask import Flask
from werkzeug.security import generate_password_hash

from datara.services.auth_service import SESSION_USER_KEY, AuthService
from tests.conftest import TEST_PASSWORD

pytestmark = pytest.mark.usefixtures("monkeypatch")


@pytest.fixture
def flask_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "test-secret"
    return app


@pytest.fixture
def mock_sql_store() -> MagicMock:
    store = MagicMock()
    store.get_user_by_email.return_value = None
    store.count_admin_users.return_value = 0
    return store


@pytest.fixture
def auth_service(mock_sql_store: MagicMock) -> AuthService:
    return AuthService(mock_sql_store)


def _approved_user_dict(
    *,
    user_id: int = 1,
    email: str = "user@example.com",
    password: str = TEST_PASSWORD,
    approval_status: str = "approved",
    role: str = "customer",
) -> dict:
    return {
        "id": user_id,
        "email": email,
        "display_name": "Test User",
        "password_hash": generate_password_hash(password),
        "approval_status": approval_status,
        "role": role,
        "storage_slug": "test-user",
        "private_container_name": "private-test-user",
    }


class TestRegister:
    def test_register_creates_user_and_session(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        created = _approved_user_dict(approval_status="pending")
        mock_sql_store.create_user.return_value = created

        with flask_app.test_request_context(
            json={
                "email": "user@example.com",
                "displayName": "Test User",
                "password": TEST_PASSWORD,
            }
        ):
            response, status = auth_service.register()

        assert status == 201
        body = response.get_json()
        assert body["isAuthenticated"] is True
        assert body["isApproved"] is False
        assert body["approvalStatus"] == "pending"
        mock_sql_store.create_user.assert_called_once()
        mock_sql_store.get_user_by_email.assert_called_once_with("user@example.com")

    def test_register_rejects_duplicate_email(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        mock_sql_store.get_user_by_email.return_value = _approved_user_dict()

        with flask_app.test_request_context(
            json={
                "email": "user@example.com",
                "displayName": "Test User",
                "password": TEST_PASSWORD,
            }
        ):
            response, status = auth_service.register()

        assert status == 409
        assert response.get_json()["error"] == "An account with this email already exists"
        mock_sql_store.create_user.assert_not_called()

    def test_register_rejects_rejected_account_reregistration(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        mock_sql_store.get_user_by_email.return_value = _approved_user_dict(approval_status="rejected")

        with flask_app.test_request_context(
            json={
                "email": "user@example.com",
                "displayName": "Test User",
                "password": TEST_PASSWORD,
            }
        ):
            response, status = auth_service.register()

        assert status == 403
        assert "rejected" in response.get_json()["error"].lower()

    def test_register_rejects_invalid_email(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        with flask_app.test_request_context(
            json={
                "email": "not-valid",
                "displayName": "Test User",
                "password": TEST_PASSWORD,
            }
        ):
            response, status = auth_service.register()

        assert status == 400
        mock_sql_store.create_user.assert_not_called()

    def test_register_rejects_short_password(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        with flask_app.test_request_context(
            json={
                "email": "user@example.com",
                "displayName": "Test User",
                "password": "short",
            }
        ):
            response, status = auth_service.register()

        assert status == 400
        assert "at least" in response.get_json()["error"].lower()

    def test_register_disabled_returns_503(
        self,
        flask_app: Flask,
        auth_service: AuthService,
        mock_sql_store: MagicMock,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr("datara.services.auth_service.settings.auth_registration_enabled", False)

        with flask_app.test_request_context(
            json={
                "email": "user@example.com",
                "displayName": "Test User",
                "password": TEST_PASSWORD,
            }
        ):
            response, status = auth_service.register()

        assert status == 503
        mock_sql_store.create_user.assert_not_called()

    def test_register_bootstraps_first_admin(
        self,
        flask_app: Flask,
        auth_service: AuthService,
        mock_sql_store: MagicMock,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr(
            "datara.services.auth_service.settings.auth_bootstrap_admin_emails",
            ["admin@example.com"],
        )
        mock_sql_store.count_admin_users.return_value = 0
        mock_sql_store.create_user.return_value = _approved_user_dict(
            email="admin@example.com",
            approval_status="approved",
            role="admin",
        )

        with flask_app.test_request_context(
            json={
                "email": "admin@example.com",
                "displayName": "Admin",
                "password": TEST_PASSWORD,
            }
        ):
            response, status = auth_service.register()

        assert status == 201
        assert response.get_json()["isApproved"] is True
        create_kwargs = mock_sql_store.create_user.call_args.kwargs
        assert create_kwargs["approval_status"] == "approved"
        assert create_kwargs["role"] == "admin"


class TestLogin:
    def test_login_succeeds_for_valid_credentials(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        user = _approved_user_dict()
        mock_sql_store.get_user_by_email.return_value = user
        mock_sql_store.get_user_by_id.return_value = user

        with flask_app.test_request_context(
            json={"email": "user@example.com", "password": TEST_PASSWORD}
        ):
            response = auth_service.login()

        body = response.get_json()
        assert body["isAuthenticated"] is True
        assert body["message"] == "Login successful"
        mock_sql_store.touch_user_login.assert_called_once_with(user["id"])

    def test_login_rejects_wrong_password(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        mock_sql_store.get_user_by_email.return_value = _approved_user_dict()

        with flask_app.test_request_context(
            json={"email": "user@example.com", "password": "wrong-password"}
        ):
            response, status = auth_service.login()

        assert status == 401
        assert response.get_json()["error"] == "Invalid email or password"

    def test_login_rejects_unknown_email(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        mock_sql_store.get_user_by_email.return_value = None

        with flask_app.test_request_context(
            json={"email": "missing@example.com", "password": TEST_PASSWORD}
        ):
            response, status = auth_service.login()

        assert status == 401

    def test_login_rejects_rejected_account(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        mock_sql_store.get_user_by_email.return_value = _approved_user_dict(approval_status="rejected")

        with flask_app.test_request_context(
            json={"email": "user@example.com", "password": TEST_PASSWORD}
        ):
            response, status = auth_service.login()

        assert status == 403
        assert "rejected" in response.get_json()["error"].lower()

    def test_login_rejects_pending_when_not_allowed(
        self,
        flask_app: Flask,
        auth_service: AuthService,
        mock_sql_store: MagicMock,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr("datara.services.auth_service.settings.auth_allow_pending_login_session", False)
        mock_sql_store.get_user_by_email.return_value = _approved_user_dict(approval_status="pending")

        with flask_app.test_request_context(
            json={"email": "user@example.com", "password": TEST_PASSWORD}
        ):
            response, status = auth_service.login()

        assert status == 403
        assert "pending" in response.get_json()["error"].lower()

    def test_login_requires_email_and_password(
        self, flask_app: Flask, auth_service: AuthService, mock_sql_store: MagicMock
    ) -> None:
        with flask_app.test_request_context(json={"email": "user@example.com"}):
            response, status = auth_service.login()

        assert status == 400


class TestSession:
    def test_get_current_user_returns_none_without_session(
        self, flask_app: Flask, auth_service: AuthService
    ) -> None:
        with flask_app.test_request_context():
            assert auth_service.get_current_user() is None

    def test_logout_clears_session(self, flask_app: Flask, auth_service: AuthService) -> None:
        with flask_app.test_request_context():
            from flask import session

            session[SESSION_USER_KEY] = 42
            response = auth_service.logout()

        assert response.get_json()["ok"] is True
        with flask_app.test_request_context():
            from flask import session

            assert SESSION_USER_KEY not in session

    def test_serialize_user_unauthenticated(
        self, flask_app: Flask, auth_service: AuthService
    ) -> None:
        with flask_app.test_request_context():
            payload = auth_service.serialize_user(None)

        assert payload["isAuthenticated"] is False
        assert payload["user"] is None
        assert "loginUrl" in payload
        assert "registerUrl" in payload
