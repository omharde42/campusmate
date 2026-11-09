"""Authentication and authorisation."""

import pytest


def test_login_with_valid_credentials(client):
    resp = client.post(
        "/auth/login",
        json={"email": "admin@campusmate.demo", "password": "campusmate-demo"},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_with_bad_password_is_rejected(client):
    resp = client.post(
        "/auth/login",
        json={"email": "admin@campusmate.demo", "password": "wrong"},
    )
    assert resp.status_code == 401


def test_me_requires_authentication(client):
    assert client.get("/auth/me").status_code == 401


def test_me_returns_current_admin(client, auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@campusmate.demo"
    assert resp.json()["role"] == "admin"


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/admin/notices"),
        ("get", "/admin/overview"),
        ("get", "/admin/tickets"),
    ],
)
def test_admin_endpoints_require_auth(client, method, path):
    assert getattr(client, method)(path).status_code == 401


def test_upload_requires_publisher_role(client):
    # No auth at all -> 401 (never a 200).
    files = {"file": ("x.pdf", b"%PDF-1.4", "application/pdf")}
    resp = client.post(
        "/admin/notices",
        data={"title": "x", "category": "Fees", "doc_type": "pdf"},
        files=files,
    )
    assert resp.status_code == 401
