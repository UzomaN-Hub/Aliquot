"""Sign in, refresh, sign out and /me against a real database (TESTING.md §4, §11)."""

from datetime import timedelta
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response
from sqlalchemy import Connection, text

from app.core.security import decode_access_token
from app.testing import PASSWORD, make_lab, make_user

CSRF = {"X-CSRF-Protection": "1"}
COOKIE = "__Secure-refresh-demo"


def _sign_in(client: TestClient, email: str = "ada@demo-lab.example", **body: str) -> Response:
    return client.post(
        "/v1/auth/sign-in", json={"lab": "demo", "email": email, "password": PASSWORD} | body
    )


def _refresh(client: TestClient, token: str, lab: str = "demo") -> Response:
    return client.post(
        "/v1/auth/refresh",
        json={"lab": lab},
        headers=CSRF | {"Cookie": f"__Secure-refresh-{lab}={token}"},
    )


def _actions(db: Connection) -> list[str]:
    return list(db.execute(text("SELECT action FROM audit_log ORDER BY at, id")).scalars())


@pytest.fixture
def lab(db: Connection) -> UUID:
    lab_id = make_lab(db, "demo")
    make_user(db, lab_id, roles=("chief_scientist",), sections=("chem_path", "haematology"))
    return lab_id


# ── Sign in ───────────────────────────────────────────────────────────────
def test_sign_in_returns_tokens_and_a_locked_down_cookie(
    client: TestClient, db: Connection, lab: UUID
) -> None:
    response = _sign_in(client)

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["roles"] == ["chief_scientist"]
    assert body["user"]["sections"] == ["chem_path", "haematology"]
    assert body["lab"] == {"name": "Demo Laboratory", "slug": "demo", "timezone": "Africa/Lagos"}
    assert body["expires_in"] == 15 * 60

    claims = decode_access_token(body["access_token"])
    assert claims is not None and claims.lab_id == lab

    cookie = response.headers["set-cookie"]
    for part in (f"{COOKIE}=", "HttpOnly", "Secure", "Path=/api/v1/auth", "SameSite=lax"):
        assert part in cookie
    assert response.headers["cache-control"] == "no-store"

    assert db.execute(text("SELECT count(*) FROM sessions")).scalar() == 1
    assert db.execute(text("SELECT last_login_at IS NOT NULL FROM users")).scalar()
    assert _actions(db) == ["auth.sign_in"]


def test_email_is_case_insensitive(client: TestClient, lab: UUID) -> None:
    assert _sign_in(client, email="  ADA@Demo-Lab.example ").status_code == 200


@pytest.mark.parametrize("email", ["ada@demo-lab.example", "nobody@demo-lab.example"])
def test_wrong_password_and_unknown_email_look_identical(
    client: TestClient, db: Connection, lab: UUID, email: str
) -> None:
    response = _sign_in(client, email=email, password="wrong password")

    assert response.status_code == 401
    assert response.json() == {
        "code": "invalid_credentials",
        "message": "That email and password don't match. Try again or reset your password.",
    }
    assert "set-cookie" not in response.headers
    assert db.execute(text("SELECT count(*) FROM sessions")).scalar() == 0
    assert _actions(db) == ["auth.sign_in_failed"]  # kept although the request failed


@pytest.mark.parametrize("status", ["invited", "deactivated"])
def test_only_active_staff_can_sign_in(client: TestClient, db: Connection, status: str) -> None:
    make_user(db, make_lab(db, "demo"), status=status)
    assert _sign_in(client).json()["code"] == "invalid_credentials"


def test_credentials_from_another_lab_do_not_work(client: TestClient, db: Connection) -> None:
    make_lab(db, "demo")
    make_user(db, make_lab(db, "other"))  # same email, other lab
    assert _sign_in(client).status_code == 401


@pytest.mark.parametrize("slug", ["missing", "../etc", "UPPER"])
def test_unknown_lab(client: TestClient, db: Connection, slug: str) -> None:
    response = _sign_in(client, lab=slug)
    assert response.status_code == 404
    assert response.json()["code"] == "lab_not_found"


def test_suspended_lab_cannot_sign_in(client: TestClient, db: Connection) -> None:
    make_user(db, make_lab(db, "demo", status="suspended"))
    response = _sign_in(client)
    assert response.status_code == 403
    assert response.json()["code"] == "lab_unavailable"


def test_validation_errors_use_the_one_error_shape(client: TestClient) -> None:
    response = client.post("/v1/auth/sign-in", json={"lab": "demo", "password": "x"})
    assert response.status_code == 422
    assert response.json() == {
        "code": "validation_error",
        "message": "Check email.",
        "field": "email",
    }


# ── Refresh ───────────────────────────────────────────────────────────────
def test_refresh_rotates_the_token(client: TestClient, db: Connection, lab: UUID) -> None:
    first = _sign_in(client).cookies[COOKIE]

    response = _refresh(client, first)

    assert response.status_code == 200
    second = response.cookies[COOKIE]
    assert second != first
    rows = db.execute(
        text("SELECT revoked_at IS NOT NULL AS revoked, replaced_by FROM sessions ORDER BY id")
    ).all()
    assert [row.revoked for row in rows] == [True, False]
    assert rows[0].replaced_by is not None


def test_reusing_a_rotated_token_ends_the_whole_family(
    client: TestClient, db: Connection, lab: UUID
) -> None:
    first = _sign_in(client).cookies[COOKIE]
    second = _refresh(client, first).cookies[COOKIE]

    assert _refresh(client, first).status_code == 401  # the stolen copy
    assert _refresh(client, second).status_code == 401  # and the real user's, too
    assert db.execute(text("SELECT count(*) FROM sessions WHERE revoked_at IS NULL")).scalar() == 0
    assert "auth.refresh_token_reused" in _actions(db)


def test_refresh_needs_the_csrf_header(client: TestClient, lab: UUID) -> None:
    token = _sign_in(client).cookies[COOKIE]
    response = client.post(
        "/v1/auth/refresh", json={"lab": "demo"}, headers={"Cookie": f"{COOKIE}={token}"}
    )
    assert response.status_code == 403
    assert response.json()["code"] == "csrf_check_failed"


def test_refresh_token_is_bound_to_its_lab(client: TestClient, db: Connection, lab: UUID) -> None:
    make_lab(db, "other")
    token = _sign_in(client).cookies[COOKIE]
    assert _refresh(client, token, lab="other").status_code == 401


def test_idle_session_expires(client: TestClient, db: Connection, lab: UUID) -> None:
    token = _sign_in(client).cookies[COOKIE]
    db.execute(
        text("UPDATE sessions SET last_used_at = now() - :idle"), {"idle": timedelta(hours=9)}
    )
    response = _refresh(client, token)
    assert response.status_code == 401
    assert response.json()["code"] == "session_ended"


# ── Sign out and /me ──────────────────────────────────────────────────────
def test_sign_out_revokes_the_session_and_clears_the_cookie(
    client: TestClient, db: Connection, lab: UUID
) -> None:
    token = _sign_in(client).cookies[COOKIE]

    response = client.post(
        "/v1/auth/sign-out", json={"lab": "demo"}, headers=CSRF | {"Cookie": f"{COOKIE}={token}"}
    )

    assert response.status_code == 204
    assert "Max-Age=0" in response.headers["set-cookie"]
    assert _refresh(client, token).status_code == 401
    assert "auth.sign_out" in _actions(db)


def test_me_returns_the_signed_in_user(client: TestClient, lab: UUID) -> None:
    token = _sign_in(client).json()["access_token"]
    response = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "ada@demo-lab.example"


@pytest.mark.parametrize(
    ("headers", "code"),
    [({}, "not_signed_in"), ({"Authorization": "Bearer not-a-token"}, "token_expired")],
)
def test_me_rejects_missing_or_bad_tokens(
    client: TestClient, headers: dict[str, str], code: str
) -> None:
    response = client.get("/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["code"] == code
