"""Platform console: 2FA sign-in, lab management, isolation from lab data (decision 015)."""

from typing import Any
from urllib.parse import unquote

import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, text

from app.testing import ADMIN_EMAIL, PASSWORD, make_admin, make_lab, make_user

SECRET = pyotp.random_base32()
NEW_LAB: dict[str, Any] = {
    "name": "Tavnit Labs",
    "slug": "tavnit",
    "address": "12 Example Road, Lagos",
    "timezone": "Africa/Lagos",
    "sections": ["chem_path", "haematology"],
    "manager": {"full_name": "Ifeoma Adeyemi", "email": "Ifeoma@Tavnit-Labs.example"},
}


def _sign_in(client: TestClient, password: str = PASSWORD) -> dict[str, Any]:
    response = client.post(
        "/v1/platform/auth/sign-in", json={"email": ADMIN_EMAIL, "password": password}
    )
    return {"status": response.status_code, **response.json()}


def _token(client: TestClient, db: Connection) -> dict[str, str]:
    make_admin(db, totp_secret=SECRET)
    challenge = _sign_in(client)["challenge"]
    response = client.post(
        "/v1/platform/auth/verify", json={"challenge": challenge, "code": pyotp.TOTP(SECRET).now()}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _actions(db: Connection) -> list[str]:
    return list(db.execute(text("SELECT action FROM audit_log ORDER BY at, id")).scalars())


# ── Sign-in with 2FA ──────────────────────────────────────────────────────
def test_first_sign_in_sets_up_2fa_then_opens_the_console(
    client: TestClient, db: Connection
) -> None:
    make_admin(db)  # no 2FA yet
    step = _sign_in(client)
    assert step["step"] == "setup"
    assert step["setup"]["otpauth_uri"].startswith("otpauth://totp/")
    qr = step["setup"]["qr_image"]
    assert qr.startswith("data:image/svg+xml")
    assert "xmlns" in unquote(qr)  # without the namespace, browsers show nothing

    code = pyotp.TOTP(step["setup"]["secret"]).now()
    response = client.post(
        "/v1/platform/auth/verify", json={"challenge": step["challenge"], "code": code}
    )
    assert response.status_code == 200
    assert response.json()["admin"]["email"] == ADMIN_EMAIL
    assert "refresh-console" in response.headers["set-cookie"]

    stored = db.execute(text("SELECT totp_secret_enc FROM platform_admins")).scalar()
    assert stored and step["setup"]["secret"] not in stored  # encrypted at rest
    assert "platform.2fa_enabled" in _actions(db)
    # Next time it asks for the code, not setup.
    assert _sign_in(client)["step"] == "verify"


def test_wrong_password_is_refused_and_audited_without_a_lab(
    client: TestClient, db: Connection
) -> None:
    make_admin(db, totp_secret=SECRET)
    assert _sign_in(client, password="wrong")["code"] == "invalid_credentials"
    row = db.execute(text("SELECT action, lab_id FROM audit_log")).one()
    assert row.action == "platform.sign_in_failed"
    assert row.lab_id is None


def test_a_code_cannot_be_used_twice(client: TestClient, db: Connection) -> None:
    make_admin(db, totp_secret=SECRET)
    code = pyotp.TOTP(SECRET).now()
    first = client.post(
        "/v1/platform/auth/verify", json={"challenge": _sign_in(client)["challenge"], "code": code}
    )
    replay = client.post(
        "/v1/platform/auth/verify", json={"challenge": _sign_in(client)["challenge"], "code": code}
    )
    assert first.status_code == 200
    assert replay.json()["code"] == "code_invalid"


def test_five_wrong_codes_lock_2fa_for_15_minutes(client: TestClient, db: Connection) -> None:
    make_admin(db, totp_secret=SECRET)
    challenge = _sign_in(client)["challenge"]
    codes = [
        client.post(
            "/v1/platform/auth/verify", json={"challenge": challenge, "code": "000000"}
        ).json()["code"]
        for _ in range(5)
    ]
    assert codes == ["code_invalid"] * 4 + ["too_many_attempts"]
    right = client.post(
        "/v1/platform/auth/verify",
        json={"challenge": challenge, "code": pyotp.TOTP(SECRET).now()},
    )
    assert right.status_code == 429  # even the right code waits out the lock


def test_lab_and_console_tokens_never_cross(client: TestClient, db: Connection) -> None:
    lab = make_lab(db, "demo")
    make_user(db, lab)
    lab_token = client.post(
        "/v1/auth/sign-in",
        json={"lab": "demo", "email": "ada@demo-lab.example", "password": PASSWORD},
    ).json()["access_token"]
    console = _token(client, db)

    assert (
        client.get(
            "/v1/platform/labs", headers={"Authorization": f"Bearer {lab_token}"}
        ).status_code
        == 401
    )
    assert client.get("/v1/auth/me", headers=console).status_code == 401


# ── Labs ──────────────────────────────────────────────────────────────────
def test_create_lab_with_its_first_manager_and_invite(client: TestClient, db: Connection) -> None:
    headers = _token(client, db)

    response = client.post("/v1/platform/labs", json=NEW_LAB, headers=headers)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["lab"]["slug"] == "tavnit"
    assert body["lab"]["sections"] == ["chem_path", "haematology"]
    assert body["lab"]["staff_count"] == 1
    assert body["invite_url"].startswith("http://localhost:3000/l/tavnit/set-password#token=")

    manager = db.execute(text("SELECT email, status, password_hash FROM users")).one()
    assert manager.email == "ifeoma@tavnit-labs.example"
    assert manager.status == "invited" and manager.password_hash is None
    token = body["invite_url"].split("#token=")[1]
    stored = db.execute(text("SELECT token_hash FROM auth_tokens")).scalar()
    assert stored and token not in stored  # stored hashed
    assert "platform.lab_created" in _actions(db)


def test_create_lab_is_idempotent(client: TestClient, db: Connection) -> None:
    headers = _token(client, db) | {"Idempotency-Key": "create-tavnit-0001"}
    first = client.post("/v1/platform/labs", json=NEW_LAB, headers=headers)
    retry = client.post("/v1/platform/labs", json=NEW_LAB, headers=headers)
    other = client.post("/v1/platform/labs", json=NEW_LAB | {"name": "Other"}, headers=headers)

    assert retry.json()["lab"]["id"] == first.json()["lab"]["id"]
    assert retry.json()["invite_url"] is None  # the one-time link isn't stored
    assert other.json()["code"] == "idempotency_key_reused"
    assert db.execute(text("SELECT count(*) FROM labs")).scalar() == 1


@pytest.mark.parametrize(
    ("change", "code"),
    [
        ({"slug": "console"}, "slug_reserved"),
        ({"slug": "Bad Slug!"}, "invalid_slug"),
        ({"timezone": "Mars/Olympus"}, "invalid_timezone"),
    ],
)
def test_create_lab_validation(
    client: TestClient, db: Connection, change: dict[str, str], code: str
) -> None:
    response = client.post("/v1/platform/labs", json=NEW_LAB | change, headers=_token(client, db))
    assert response.status_code == 422
    assert response.json()["code"] == code


def test_slug_must_be_unique(client: TestClient, db: Connection) -> None:
    make_lab(db, "tavnit")
    response = client.post("/v1/platform/labs", json=NEW_LAB, headers=_token(client, db))
    assert response.status_code == 409
    assert response.json()["code"] == "slug_taken"


def test_list_shows_staff_counts_without_staff_details(client: TestClient, db: Connection) -> None:
    lab = make_lab(db, "demo")
    make_user(db, lab, "a@demo-lab.example")
    make_user(db, lab, "b@demo-lab.example")
    labs = client.get("/v1/platform/labs", headers=_token(client, db)).json()
    assert [(item["slug"], item["staff_count"]) for item in labs] == [("demo", 2)]
    assert "email" not in labs[0]


def test_suspend_blocks_staff_sign_in_and_reactivate_restores_it(
    client: TestClient, db: Connection
) -> None:
    lab = make_lab(db, "demo")
    make_user(db, lab)
    headers = _token(client, db)
    lab_id = db.execute(text("SELECT id FROM labs")).scalar()

    suspended = client.post(
        f"/v1/platform/labs/{lab_id}/suspend", json={"reason": "Unpaid invoice"}, headers=headers
    )
    assert suspended.json()["status"] == "suspended"
    staff_sign_in = {"lab": "demo", "email": "ada@demo-lab.example", "password": PASSWORD}
    assert client.post("/v1/auth/sign-in", json=staff_sign_in).json()["code"] == "lab_unavailable"

    client.post(f"/v1/platform/labs/{lab_id}/reactivate", json={"reason": "Paid"}, headers=headers)
    assert client.post("/v1/auth/sign-in", json=staff_sign_in).status_code == 200
    assert {"platform.lab_suspended", "platform.lab_reactivated"} <= set(_actions(db))


def test_edit_lab_records_before_and_after(client: TestClient, db: Connection) -> None:
    make_lab(db, "demo")
    lab_id = db.execute(text("SELECT id FROM labs")).scalar()
    response = client.patch(
        f"/v1/platform/labs/{lab_id}", json={"name": "Demo Lab Ikeja"}, headers=_token(client, db)
    )
    assert response.json()["name"] == "Demo Lab Ikeja"
    entry = db.execute(
        text("SELECT before, after FROM audit_log WHERE action = 'platform.lab_updated'")
    ).one()
    assert entry.before == {"name": "Demo Laboratory"}
    assert entry.after == {"name": "Demo Lab Ikeja"}


# ── The invited Manager sets a password and signs in ─────────────────────
def test_invite_link_sets_the_first_password_once(client: TestClient, db: Connection) -> None:
    invite = client.post("/v1/platform/labs", json=NEW_LAB, headers=_token(client, db)).json()
    token = invite["invite_url"].split("#token=")[1]

    who = client.post("/v1/auth/link", json={"lab": "tavnit", "token": token}).json()
    assert who == {
        "purpose": "invite",
        "full_name": "Ifeoma Adeyemi",
        "email": "ifeoma@tavnit-labs.example",
        "lab_name": "Tavnit Labs",
    }

    short = client.post(
        "/v1/auth/set-password", json={"lab": "tavnit", "token": token, "password": "short"}
    )
    assert short.json()["code"] == "password_too_short"

    new_password = "a long first password for the lab"
    done = client.post(
        "/v1/auth/set-password", json={"lab": "tavnit", "token": token, "password": new_password}
    )
    assert done.status_code == 204
    again = client.post(
        "/v1/auth/set-password", json={"lab": "tavnit", "token": token, "password": new_password}
    )
    assert again.json()["code"] == "link_invalid"

    signed_in = client.post(
        "/v1/auth/sign-in",
        json={"lab": "tavnit", "email": "ifeoma@tavnit-labs.example", "password": new_password},
    )
    assert signed_in.status_code == 200
    assert signed_in.json()["user"]["roles"] == ["manager"]


def test_invite_link_only_works_on_its_own_lab(client: TestClient, db: Connection) -> None:
    make_lab(db, "other")
    invite = client.post("/v1/platform/labs", json=NEW_LAB, headers=_token(client, db)).json()
    token = invite["invite_url"].split("#token=")[1]
    response = client.post("/v1/auth/link", json={"lab": "other", "token": token})
    assert response.json()["code"] == "link_invalid"
