"""Microsoft Entra auth helpers and Flask session enforcement."""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable, TypeVar
from urllib.parse import urljoin

import msal
from flask import jsonify, redirect, request, session

from datara.config import settings
from datara.logging import logger
from datara.services.sql_store import SQLStore


SESSION_USER_KEY = "datara_user_id"
SESSION_FLOW_KEY = "datara_auth_flow"
SESSION_NEXT_KEY = "datara_auth_next"
F = TypeVar("F", bound=Callable[..., Any])


class AuthService:
    """Encapsulates Microsoft Entra OIDC auth and current-user helpers."""

    def __init__(self, sql_store: SQLStore) -> None:
        self.sql_store = sql_store

    def is_configured(self) -> bool:
        return settings.has_entra_config

    def _build_redirect_uri(self) -> str:
        return f"{request.host_url.rstrip('/')}{settings.entra_redirect_path}"

    def _build_msal_app(self) -> msal.ConfidentialClientApplication:
        authority = settings.get_entra_authority()
        if not authority or not settings.entra_client_id or not settings.entra_client_secret:
            raise RuntimeError("Microsoft Entra configuration is incomplete")
        return msal.ConfidentialClientApplication(
            client_id=settings.entra_client_id,
            client_credential=settings.entra_client_secret,
            authority=authority,
        )

    @staticmethod
    def _sanitize_next(next_path: str | None) -> str:
        if not next_path:
            return settings.auth_post_login_path
        next_path = next_path.strip()
        if not next_path:
            return settings.auth_post_login_path
        if next_path.startswith("http://") or next_path.startswith("https://"):
            if next_path.startswith(settings.frontend_url.rstrip("/")):
                suffix = next_path[len(settings.frontend_url.rstrip("/")) :]
                return suffix or settings.auth_post_login_path
            return settings.auth_post_login_path
        if not next_path.startswith("/"):
            next_path = f"/{next_path}"
        return next_path

    def _frontend_redirect(self, path: str) -> str:
        return urljoin(f"{settings.frontend_url.rstrip('/')}/", path.lstrip("/"))

    def login(self):
        if not self.is_configured():
            return jsonify({"error": "Microsoft Entra is not configured"}), 503

        next_path = self._sanitize_next(request.args.get("next"))
        session[SESSION_NEXT_KEY] = next_path
        flow = self._build_msal_app().initiate_auth_code_flow(
            scopes=settings.entra_scopes,
            redirect_uri=self._build_redirect_uri(),
        )
        session[SESSION_FLOW_KEY] = flow
        logger.info("Redirecting to Microsoft Entra login")
        return redirect(flow["auth_uri"])

    def handle_callback(self):
        if not self.is_configured():
            return redirect(self._frontend_redirect("/"))

        flow = session.pop(SESSION_FLOW_KEY, None)
        if not flow:
            logger.warning("Missing auth flow during callback")
            return redirect(self._frontend_redirect("/?auth=flow-missing"))

        result = self._build_msal_app().acquire_token_by_auth_code_flow(
            flow,
            auth_response=request.args,
        )

        if "error" in result:
            logger.warning("Microsoft Entra login failed: %s", result.get("error_description") or result["error"])
            return redirect(self._frontend_redirect("/?auth=failed"))

        claims = result.get("id_token_claims") or {}
        entra_object_id = claims.get("oid") or claims.get("sub")
        email = claims.get("preferred_username") or claims.get("email")
        display_name = claims.get("name") or email

        if not entra_object_id or not email:
            logger.warning("Entra callback missing required identity claims")
            return redirect(self._frontend_redirect("/?auth=claims-missing"))

        user = self.sql_store.upsert_user(
            entra_object_id=entra_object_id,
            email=email,
            display_name=display_name or email,
            bootstrap_admin_emails=settings.auth_bootstrap_admin_emails,
        )

        session[SESSION_USER_KEY] = user["entra_object_id"]
        session.permanent = True
        next_path = session.pop(SESSION_NEXT_KEY, settings.auth_post_login_path)
        if not user["approved"] and not settings.auth_allow_unapproved_login_session:
            session.pop(SESSION_USER_KEY, None)
            return redirect(self._frontend_redirect("/?auth=pending"))

        logger.info("User %s authenticated successfully", user["email"])
        return redirect(self._frontend_redirect(self._sanitize_next(next_path)))

    def logout(self):
        session.pop(SESSION_USER_KEY, None)
        session.pop(SESSION_FLOW_KEY, None)
        session.pop(SESSION_NEXT_KEY, None)
        return jsonify({"ok": True})

    def get_current_user(self) -> dict[str, Any] | None:
        user_id = session.get(SESSION_USER_KEY)
        if not user_id:
            return None
        user = self.sql_store.get_user_by_entra_object_id(user_id)
        if not user:
            session.pop(SESSION_USER_KEY, None)
            return None
        return user

    def get_current_user_or_raise(self) -> dict[str, Any]:
        user = self.get_current_user()
        if not user:
            raise PermissionError("Authentication required")
        if not user["approved"] and user["role"] != "admin":
            raise PermissionError("Account approval required")
        return user

    def serialize_user(self, user: dict[str, Any] | None) -> dict[str, Any]:
        if not user:
            return {
                "isAuthenticated": False,
                "isApproved": False,
                "loginUrl": f"/api/auth/login?next={request.args.get('next', settings.auth_post_login_path)}",
                "user": None,
            }

        return {
            "isAuthenticated": True,
            "isApproved": bool(user["approved"]) or user["role"] == "admin",
            "loginUrl": "/api/auth/login",
            "user": {
                "id": user["entra_object_id"],
                "email": user["email"],
                "displayName": user["display_name"],
                "role": user["role"],
                "storageSlug": user["storage_slug"],
                "privateContainerName": user["private_container_name"],
            },
        }

    def require_login(self, func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            user = self.get_current_user()
            if not user:
                next_path = request.headers.get("X-Requested-With")
                login_target = self._sanitize_next(request.args.get("next") or request.path)
                return (
                    jsonify(
                        {
                            "error": "authentication_required",
                            "login_url": f"/api/auth/login?next={login_target}",
                            "requested_with": next_path,
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
            if not user["approved"] and user["role"] != "admin":
                return jsonify({"error": "approval_required"}), 403
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]
