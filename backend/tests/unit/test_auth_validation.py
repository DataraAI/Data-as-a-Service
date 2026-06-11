"""Unit tests for AuthService email and password validation helpers."""

from __future__ import annotations

import pytest

from datara.services.auth_service import AuthService


@pytest.mark.parametrize(
    "email,expected",
    [
        ("user@example.com", True),
        ("User@Example.COM", True),
        ("name.with.dots@sub.example.com", True),
        ("", False),
        ("not-an-email", False),
        ("missing-at-sign.com", False),
        ("@no-local.com", False),
        ("local@nodot", False),
        ("local@.com", False),
        ("local@com.", False),
        (".local@example.com", False),
        ("local.@example.com", False),
        ("has space@example.com", False),
        ("two@@example.com", False),
    ],
)
def test_is_valid_email(email: str, expected: bool) -> None:
    assert AuthService._is_valid_email(email) is expected


def test_normalize_email_strips_and_lowercases() -> None:
    assert AuthService._normalize_email("  User@Example.COM  ") == "user@example.com"
    assert AuthService._normalize_email(None) == ""


def test_sanitize_display_name_uses_fallback() -> None:
    assert AuthService._sanitize_display_name("  Alice  ", "alice@example.com") == "Alice"
    assert AuthService._sanitize_display_name("", "alice@example.com") == "alice@example.com"
    assert AuthService._sanitize_display_name(None, "alice@example.com") == "alice@example.com"


def test_password_error_rejects_short_passwords(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("datara.services.auth_service.settings.auth_min_password_length", 10)

    auth_service = AuthService(sql_store=None)  # type: ignore[arg-type]
    assert auth_service._password_error("short") == "Password must be at least 10 characters long"
    assert auth_service._password_error("longenough") is None
