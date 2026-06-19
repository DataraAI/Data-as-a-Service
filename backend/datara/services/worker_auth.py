"""Authentication for private generation-worker endpoints."""

from __future__ import annotations

import hmac

from flask import jsonify, request

from datara.config import settings


def require_generation_worker() -> tuple[object, int] | None:
    configured = settings.generation_worker_token
    authorization = request.headers.get("Authorization", "")
    provided = authorization.removeprefix("Bearer ").strip() if authorization.startswith("Bearer ") else ""
    if not configured or not provided or not hmac.compare_digest(configured, provided):
        return jsonify({"error": "Worker authentication required"}), 401
    return None
