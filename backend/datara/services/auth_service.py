"""Datara-managed email/password auth helpers and Flask session enforcement."""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable, TypeVar
from urllib.parse import urlencode, urljoin

from flask import jsonify, redirect, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from datara.config import settings
from datara.logging import logger
from datara.services.sql_store import SQLStore


SESSION_USER_KEY = "datara_user_id"
ELEVATED_ACCOUNT_ROLES = {"analyst", "admin"}
F = TypeVar("F", bound=Callable[..., Any])


class AuthService:
    """Encapsulates Datara-managed auth and current-user helpers."""

    def __init__(self, sql_store: SQLStore) -> None:
        self.sql_store = sql_store

    @staticmethod
    def _normalize_email(email: str | None) -> str:
        return str(email or "").strip().lower()

    @staticmethod
    def _is_valid_email(email: str) -> bool:
        if not email or " " in email:
            return False
        if email.count("@") != 1:
            return False

        local_part, domain = email.split("@", 1)
        if not local_part or not domain:
            return False
        if "." not in domain:
            return False
        if domain.startswith(".") or domain.endswith("."):
            return False
        if local_part.startswith(".") or local_part.endswith("."):
            return False
        return True

    @staticmethod
    def _sanitize_display_name(display_name: str | None, fallback_email: str) -> str:
        name = str(display_name or "").strip()
        return name or fallback_email

    @staticmethod
    def _sanitize_next(next_path: str | None) -> str:
        if not next_path:
            return settings.auth_post_login_path

        next_path = next_path.strip()
        if not next_path:
            return settings.auth_post_login_path

        frontend_root = settings.frontend_url.rstrip("/")
        if next_path.startswith("http://") or next_path.startswith("https://"):
            if next_path.startswith(frontend_root):
                suffix = next_path[len(frontend_root) :]
                return suffix or settings.auth_post_login_path
            return settings.auth_post_login_path

        if not next_path.startswith("/"):
            next_path = f"/{next_path}"
        return next_path

    def _frontend_redirect(self, path: str) -> str:
        return urljoin(f"{settings.frontend_url.rstrip('/')}/", path.lstrip("/"))

    def _frontend_auth_url(self, *, mode: str, next_path: str | None = None) -> str:
        query = {"mode": mode}
        sanitized_next = self._sanitize_next(next_path)
        if sanitized_next:
            query["next"] = sanitized_next
        return self._frontend_redirect(f"/auth?{urlencode(query)}")

    def _user_is_approved(self, user: dict[str, Any] | None) -> bool:
        if not user:
            return False
        return user["approval_status"] == "approved"

    def _password_error(self, password: str) -> str | None:
        if len(password) < settings.auth_min_password_length:
            return f"Password must be at least {settings.auth_min_password_length} characters long"
        return None

    @staticmethod
    def user_is_admin(user: dict[str, Any] | None) -> bool:
        return bool(user and user.get("role") == "admin")

    @staticmethod
    def user_can_manage_accounts(user: dict[str, Any] | None) -> bool:
        return bool(user and user.get("role") in ELEVATED_ACCOUNT_ROLES and user.get("approval_status") == "approved")

    def assert_account_manager(self, user: dict[str, Any] | None) -> dict[str, Any]:
        if not self.user_can_manage_accounts(user):
            raise PermissionError("Account management requires an approved analyst or admin account")
        return user or {}

    def assert_admin(self, user: dict[str, Any] | None) -> dict[str, Any]:
        if not self.user_is_admin(user) or not self._user_is_approved(user):
            raise PermissionError("Admin access required")
        return user or {}

    def login_redirect(self):
        next_path = request.args.get("next")
        return redirect(self._frontend_auth_url(mode="login", next_path=next_path))

    def register_redirect(self):
        next_path = request.args.get("next")
        return redirect(self._frontend_auth_url(mode="register", next_path=next_path))

    def register(self):
        if not settings.auth_registration_enabled:
            return jsonify({"error": "Registration is currently disabled"}), 503

        payload = request.get_json(silent=True) or {}
        email = self._normalize_email(payload.get("email"))
        display_name = self._sanitize_display_name(payload.get("displayName"), email)
        password = str(payload.get("password") or "")

        if not self._is_valid_email(email):
            return jsonify({"error": "A valid email address is required"}), 400
        if not display_name:
            return jsonify({"error": "Display name is required"}), 400

        password_error = self._password_error(password)
        if password_error:
            return jsonify({"error": password_error}), 400

        existing = self.sql_store.get_user_by_email(email)
        if existing:
            if existing["approval_status"] == "rejected":
                return jsonify({"error": "This account has been rejected. Please contact Datara."}), 403
            return jsonify({"error": "An account with this email already exists"}), 409

        should_bootstrap_admin = (
            email in settings.auth_bootstrap_admin_emails and self.sql_store.count_admin_users() == 0
        )
        approval_status = "approved" if should_bootstrap_admin else "pending"
        role = "admin" if should_bootstrap_admin else "customer"

        user = self.sql_store.create_user(
            email=email,
            display_name=display_name,
            password_hash=generate_password_hash(password),
            approval_status=approval_status,
            role=role,
            approved_by_user_id=None,
        )
        session[SESSION_USER_KEY] = user["id"]
        session.permanent = True

        logger.info("Registered Datara account for %s with status=%s role=%s", email, approval_status, role)
        response = self.serialize_user(user)
        response["message"] = (
            "Account created successfully"
            if self._user_is_approved(user)
            else "Account created and pending Datara approval"
        )
        return jsonify(response), 201

    def login(self):
        payload = request.get_json(silent=True) or {}
        email = self._normalize_email(payload.get("email"))
        password = str(payload.get("password") or "")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = self.sql_store.get_user_by_email(email)
        if not user or not check_password_hash(str(user["password_hash"]), password):
            return jsonify({"error": "Invalid email or password"}), 401

        if user["approval_status"] == "rejected":
            return jsonify({"error": "This account has been rejected. Please contact Datara."}), 403

        if not self._user_is_approved(user) and not settings.auth_allow_pending_login_session:
            return jsonify({"error": "Your account is pending approval"}), 403

        self.sql_store.touch_user_login(user["id"])
        user = self.sql_store.get_user_by_id(user["id"]) or user
        session[SESSION_USER_KEY] = user["id"]
        session.permanent = True

        logger.info("Datara login successful for %s", user["email"])
        response = self.serialize_user(user)
        response["message"] = "Login successful"
        return jsonify(response)

    def logout(self):
        session.pop(SESSION_USER_KEY, None)
        return jsonify({"ok": True})

    def get_current_user(self) -> dict[str, Any] | None:
        user_id = session.get(SESSION_USER_KEY)
        if user_id is None:
            return None
        user = self.sql_store.get_user_by_id(user_id)
        if not user:
            session.pop(SESSION_USER_KEY, None)
            return None
        return user

    def get_current_user_or_raise(self) -> dict[str, Any]:
        user = self.get_current_user()
        if not user:
            raise PermissionError("Authentication required")
        if not self._user_is_approved(user):
            raise PermissionError("Account approval required")
        return user

    def serialize_user(self, user: dict[str, Any] | None) -> dict[str, Any]:
        if not user:
            next_path = self._sanitize_next(request.args.get("next"))
            return {
                "isAuthenticated": False,
                "isApproved": False,
                "approvalStatus": None,
                "loginUrl": self._frontend_auth_url(mode="login", next_path=next_path),
                "registerUrl": self._frontend_auth_url(mode="register", next_path=next_path),
                "user": None,
            }

        return {
            "isAuthenticated": True,
            "isApproved": self._user_is_approved(user),
            "approvalStatus": user["approval_status"],
            "loginUrl": self._frontend_auth_url(mode="login"),
            "registerUrl": self._frontend_auth_url(mode="register"),
            "user": {
                "id": user["id"],
                "email": user["email"],
                "displayName": user["display_name"],
                "role": user["role"],
                "storageSlug": user["storage_slug"],
                "privateContainerName": user["private_container_name"],
            },
        }

    @staticmethod
    def serialize_managed_user(user: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": user["id"],
            "email": user["email"],
            "displayName": user["display_name"],
            "role": user["role"],
            "approvalStatus": user["approval_status"],
            "isApproved": user["approval_status"] == "approved",
            "approvedByUserId": user.get("approved_by_user_id"),
            "approvedByEmail": user.get("approved_by_email"),
            "approvedByDisplayName": user.get("approved_by_display_name"),
            "storageSlug": user["storage_slug"],
            "privateContainerName": user["private_container_name"],
            "createdAt": user.get("created_at"),
            "updatedAt": user.get("updated_at"),
            "lastLoginAt": user.get("last_login_at"),
        }

    def require_login(self, func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            user = self.get_current_user()
            if not user:
                login_target = self._sanitize_next(request.args.get("next") or request.path)
                return (
                    jsonify(
                        {
                            "error": "authentication_required",
                            "login_url": self._frontend_auth_url(mode="login", next_path=login_target),
                        }
                    ),
                    401,
                )
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    def require_approved_user(self, func: F) -> F:
        @self.require_login
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            user = self.get_current_user()
            if not user:
                return jsonify({"error": "authentication_required"}), 401
            if not self._user_is_approved(user):
                return jsonify({"error": "approval_required", "approval_status": user["approval_status"]}), 403
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    def require_account_manager(self, func: F) -> F:
        @self.require_approved_user
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            user = self.get_current_user()
            if not self.user_can_manage_accounts(user):
                return jsonify({"error": "account_manager_required"}), 403
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    def require_admin(self, func: F) -> F:
        @self.require_approved_user
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            user = self.get_current_user()
            if not self.user_is_admin(user):
                return jsonify({"error": "admin_required"}), 403
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]
