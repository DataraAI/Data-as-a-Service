import pytest
from datara.services.auth_service import AuthService

def test_is_valid_email():
    assert AuthService._is_valid_email("user@example.com") is True
    assert AuthService._is_valid_email("user.name@sub.domain.org") is True
    assert AuthService._is_valid_email("invalid-email") is False
    assert AuthService._is_valid_email("no@domain") is False
    assert AuthService._is_valid_email("space @domain.com") is False

def test_sanitize_display_name():
    assert AuthService._sanitize_display_name("John Doe", "fallback@example.com") == "John Doe"
    assert AuthService._sanitize_display_name("", "fallback@example.com") == "fallback@example.com"
    assert AuthService._sanitize_display_name("   ", "fallback@example.com") == "fallback@example.com"
    assert AuthService._sanitize_display_name(None, "fallback@example.com") == "fallback@example.com"

def test_normalize_email():
    assert AuthService._normalize_email(" User@Example.com ") == "user@example.com"
    assert AuthService._normalize_email(None) == ""

def test_user_can_manage_accounts():
    assert AuthService.user_can_manage_accounts(None) is False
    assert AuthService.user_can_manage_accounts({"role": "customer", "approval_status": "approved"}) is False
    assert AuthService.user_can_manage_accounts({"role": "admin", "approval_status": "pending"}) is False
    assert AuthService.user_can_manage_accounts({"role": "admin", "approval_status": "approved"}) is True
    assert AuthService.user_can_manage_accounts({"role": "analyst", "approval_status": "approved"}) is True
