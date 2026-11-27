"""Platform team: super-admins invite, deactivate and reset each other (decision 019)."""

import time
from typing import Any

import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import Connection, text

from app.testing import ADMIN_EMAIL, PASSWORD, make_admin

SECRET = pyotp.random_base32()
OTHER_SECRET = pyotp.random_base32()
OTHER_EMAIL = "bola@platform.example"
NEW_ADMIN = {"full_name": "Chidi Okafor", "email": "Chidi@Platform.example"}
NEW_PASSWORD = "a long passphrase for the console"  # test-only


def _sign_in(
    client: TestClient, email: str, secret: str, *, next_code: bool = False
) -> dict[str, str]:
    """Signs in with 2FA. A code is accepted once, so a second sign-in in the same
    30 seconds uses the next one (allowed: one step of clock drift)."""
    code = pyotp.TOTP(secret).at(time.time() + (30 if next_code else 0))
    challenge = client.post(
        "/v1/platform/auth/sign-in", json={"email": email, "password": PASSWORD}
    ).json()["challenge"]
    response = client.post(
        "/v1/platform/auth/verify",
        json={"challenge": challenge, "code": code},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _me(client: TestClient, db: Connection) -> dict[str, str]:
    make_admin(db, totp_secret=SECRET)
    return _sign_in(client, ADMIN_EMAIL, SECRET)


def _other(db: Connection) -> str:
    return str(make_admin(db, email=OTHER_EMAIL, full_name="Bola Ade", totp_secret=OTHER_SECRET))


def _actions(db: Connection) -> list[str]:
    return list(db.execute(text("SELECT action FROM audit_log ORDER BY at, id")).scalars())


def _token(invite_url: str) -> str:
    return invite_url.split("#token=")[1]


def _invite(client: TestClient, headers: dict[str, str]) -> dict[str, Any]:
    response = client.post("/v1/platform/admins", json=NEW_ADMIN, headers=headers)
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


# ── Invite → choose a password → sign in and set up 2FA ─────────────────
def test_an_invited_admin_chooses_a_password_then_sets_up_2fa(
    client: TestClient, db: Connection
) -> None:
    body = _invite(client, _me(client, db))
    admin = body["admin"]
    assert admin["status"] == "invited"
    assert admin["email"] == "chidi@platform.example"
    assert admin["invited_by_name"] == "Platform Admin"
    assert admin["two_factor"] is False and admin["invite_expires_at"] is not None
    assert body["invite_url"].startswith("http://localhost:3000/console/accept-invite#token=")
    token = _token(body["invite_url"])
    stored = db.execute(text("SELECT token_hash FROM platform_invites")).scalar()
    assert stored and token not in stored  # stored hashed

    # Can't sign in before choosing a password.
    early = client.post(
        "/v1/platform/auth/sign-in", json={"email": NEW_ADMIN["email"], "password": "anything"}
    )
    assert early.json()["code"] == "invalid_credentials"

    who = client.post("/v1/platform/auth/invite/check", json={"token": token}).json()
    assert who == {"full_name": "Chidi Okafor", "email": "chidi@platform.example"}
    short = client.post(
        "/v1/platform/auth/invite/accept", json={"token": token, "password": "fifteen chars!!"}
    )
    assert short.json()["code"] == "password_too_short"  # 16 for super-admins
    done = client.post(
        "/v1/platform/auth/invite/accept", json={"token": token, "password": NEW_PASSWORD}
    )
    assert done.status_code == 204
    again = client.post(
        "/v1/platform/auth/invite/accept", json={"token": token, "password": NEW_PASSWORD}
    )
    assert again.json()["code"] == "link_invalid"

    step = client.post(
        "/v1/platform/auth/sign-in",
        json={"email": "chidi@platform.example", "password": NEW_PASSWORD},
    ).json()
    assert step["step"] == "setup"  # 2FA is never skipped
    assert {"platform.admin_invited", "platform.admin_invite_accepted"} <= set(_actions(db))


def test_inviting_an_existing_email_is_refused(client: TestClient, db: Connection) -> None:
    response = client.post(
        "/v1/platform/admins",
        json={"full_name": "Someone", "email": ADMIN_EMAIL.upper()},
        headers=_me(client, db),
    )
    assert response.status_code == 409
    assert response.json()["code"] == "email_taken"
    assert response.json()["field"] == "email"


def test_invite_is_idempotent_and_the_replay_hides_the_link(
    client: TestClient, db: Connection
) -> None:
    headers = _me(client, db) | {"Idempotency-Key": "invite-chidi-0001"}
    first = client.post("/v1/platform/admins", json=NEW_ADMIN, headers=headers)
    retry = client.post("/v1/platform/admins", json=NEW_ADMIN, headers=headers)
    assert retry.json()["admin"]["id"] == first.json()["admin"]["id"]
    assert retry.json()["invite_url"] is None
    assert db.execute(text("SELECT count(*) FROM platform_admins")).scalar() == 2


def test_a_new_invite_link_replaces_the_old_one(client: TestClient, db: Connection) -> None:
    headers = _me(client, db)
    body = _invite(client, headers)
    old = _token(body["invite_url"])
    fresh = client.post(f"/v1/platform/admins/{body['admin']['id']}/invite", headers=headers)
    new = _token(fresh.json()["invite_url"])

    assert client.post("/v1/platform/auth/invite/check", json={"token": old}).status_code == 400
    assert client.post("/v1/platform/auth/invite/check", json={"token": new}).status_code == 200


def test_only_a_pending_admin_gets_a_new_link(client: TestClient, db: Connection) -> None:
    headers = _me(client, db)
    other = _other(db)
    response = client.post(f"/v1/platform/admins/{other}/invite", headers=headers)
    assert response.json()["code"] == "not_invited"


# ── Team list and profiles ───────────────────────────────────────────────
def test_the_team_lists_every_admin_with_their_status(client: TestClient, db: Connection) -> None:
    headers = _me(client, db)
    _other(db)
    _invite(client, headers)
    team = client.get("/v1/platform/admins", headers=headers).json()
    assert [(member["email"], member["status"], member["two_factor"]) for member in team] == [
        (ADMIN_EMAIL, "active", True),
        (OTHER_EMAIL, "active", True),
        ("chidi@platform.example", "invited", False),
    ]
    assert "password_hash" not in team[0] and "totp_secret_enc" not in team[0]


# ── Deactivate and reactivate ────────────────────────────────────────────
def test_deactivating_an_admin_ends_their_session_at_once(
    client: TestClient, db: Connection
) -> None:
    headers = _me(client, db)
    other = _other(db)
    theirs = _sign_in(client, OTHER_EMAIL, OTHER_SECRET)
    assert client.get("/v1/platform/labs", headers=theirs).status_code == 200

    response = client.post(
        f"/v1/platform/admins/{other}/deactivate",
        json={"reason": "Left the company"},
        headers=headers,
    )
    assert response.json()["status"] == "deactivated"
    # Their 15-minute token is still unexpired, but it stops working now.
    assert client.get("/v1/platform/labs", headers=theirs).status_code == 401
    refused = client.post(
        "/v1/platform/auth/sign-in", json={"email": OTHER_EMAIL, "password": PASSWORD}
    )
    assert refused.json()["code"] == "invalid_credentials"

    client.post(
        f"/v1/platform/admins/{other}/reactivate", json={"reason": "Came back"}, headers=headers
    )
    again = _sign_in(client, OTHER_EMAIL, OTHER_SECRET, next_code=True)
    assert client.get("/v1/platform/labs", headers=again).status_code == 200
    assert {"platform.admin_deactivated", "platform.admin_reactivated"} <= set(_actions(db))


def test_deactivating_a_pending_admin_cancels_their_link(
    client: TestClient, db: Connection
) -> None:
    headers = _me(client, db)
    body = _invite(client, headers)
    client.post(
        f"/v1/platform/admins/{body['admin']['id']}/deactivate",
        json={"reason": "Invited by mistake"},
        headers=headers,
    )
    check = client.post(
        "/v1/platform/auth/invite/check", json={"token": _token(body["invite_url"])}
    )
    assert check.json()["code"] == "link_invalid"


def test_nobody_deactivates_or_resets_themselves(client: TestClient, db: Connection) -> None:
    headers = _me(client, db)
    me = client.get("/v1/platform/auth/me", headers=headers).json()["id"]
    for action in ("deactivate", "reset-2fa"):
        response = client.post(
            f"/v1/platform/admins/{me}/{action}", json={"reason": "Testing"}, headers=headers
        )
        assert response.status_code == 409
        assert response.json()["code"] == "not_on_yourself"
    # So the platform always keeps at least one active super-admin: the one acting.
    assert db.execute(text("SELECT active FROM platform_admins")).scalar() is True


# ── Reset 2FA (lost phone) ───────────────────────────────────────────────
def test_resetting_2fa_makes_them_set_it_up_again(client: TestClient, db: Connection) -> None:
    headers = _me(client, db)
    other = _other(db)
    theirs = _sign_in(client, OTHER_EMAIL, OTHER_SECRET)

    response = client.post(
        f"/v1/platform/admins/{other}/reset-2fa", json={"reason": "Lost phone"}, headers=headers
    )
    assert response.json()["two_factor"] is False
    assert client.get("/v1/platform/labs", headers=theirs).status_code == 401
    step = client.post(
        "/v1/platform/auth/sign-in", json={"email": OTHER_EMAIL, "password": PASSWORD}
    ).json()
    assert step["step"] == "setup"
    assert "platform.admin_2fa_reset" in _actions(db)


def test_a_lab_token_cannot_see_the_team(client: TestClient, db: Connection) -> None:
    _me(client, db)
    response = client.get("/v1/platform/admins", headers={"Authorization": "Bearer not-a-token"})
    assert response.status_code == 401
