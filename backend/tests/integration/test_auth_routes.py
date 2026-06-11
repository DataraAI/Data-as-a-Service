"""Integration tests for Flask auth routes (register, login, me, logout)."""

from __future__ import annotations

from tests.conftest import TEST_PASSWORD, make_user


def test_register_creates_account_and_session(client) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "displayName": "New User",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 201
    body = response.get_json()
    assert body["isAuthenticated"] is True
    assert body["user"]["email"] == "newuser@example.com"
    assert body["user"]["displayName"] == "New User"


def test_register_rejects_duplicate_email(client, approved_user: dict) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "email": approved_user["email"],
            "displayName": "Duplicate",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 409


def test_login_with_valid_credentials(client, approved_user: dict) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": approved_user["email"], "password": TEST_PASSWORD},
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["isAuthenticated"] is True
    assert body["isApproved"] is True
    assert body["user"]["email"] == approved_user["email"]


def test_login_rejects_invalid_password(client, approved_user: dict) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": approved_user["email"], "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_auth_me_unauthenticated(client) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    body = response.get_json()
    assert body["isAuthenticated"] is False
    assert body["user"] is None


def test_auth_me_returns_logged_in_user(client, approved_user: dict) -> None:
    login_response = client.post(
        "/api/auth/login",
        json={"email": approved_user["email"], "password": TEST_PASSWORD},
    )
    assert login_response.status_code == 200

    response = client.get("/api/auth/me")
    body = response.get_json()

    assert body["isAuthenticated"] is True
    assert body["user"]["id"] == approved_user["id"]
    assert body["user"]["email"] == approved_user["email"]


def test_logout_clears_session(client, approved_user: dict) -> None:
    client.post(
        "/api/auth/login",
        json={"email": approved_user["email"], "password": TEST_PASSWORD},
    )

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200

    me_response = client.get("/api/auth/me")
    assert me_response.get_json()["isAuthenticated"] is False


def test_register_then_login_flow(client) -> None:
    email = "flow@example.com"

    register_response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "displayName": "Flow User",
            "password": TEST_PASSWORD,
        },
    )
    assert register_response.status_code == 201

    client.post("/api/auth/logout")

    login_response = client.post(
        "/api/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
    )
    assert login_response.status_code == 200
    assert login_response.get_json()["isAuthenticated"] is True


def test_login_rejects_rejected_user(client, rejected_user: dict) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": rejected_user["email"], "password": TEST_PASSWORD},
    )

    assert response.status_code == 403


def test_protected_admin_route_requires_authentication(client) -> None:
    response = client.get("/api/admin/users")

    assert response.status_code == 401
    body = response.get_json()
    assert body["error"] == "authentication_required"


def test_protected_admin_route_requires_approved_account_manager(
    client, sql_store, approved_user: dict
) -> None:
    client.post(
        "/api/auth/login",
        json={"email": approved_user["email"], "password": TEST_PASSWORD},
    )

    response = client.get("/api/admin/users")
    assert response.status_code == 403
    assert response.get_json()["error"] == "account_manager_required"


def test_admin_can_list_users(client, sql_store) -> None:
    admin = make_user(
        sql_store,
        email="admin@example.com",
        display_name="Admin",
        approval_status="approved",
        role="admin",
    )
    make_user(sql_store, email="customer@example.com", display_name="Customer")

    client.post(
        "/api/auth/login",
        json={"email": admin["email"], "password": TEST_PASSWORD},
    )

    response = client.get("/api/admin/users")
    assert response.status_code == 200
    emails = {user["email"] for user in response.get_json()["users"]}
    assert "admin@example.com" in emails
    assert "customer@example.com" in emails
