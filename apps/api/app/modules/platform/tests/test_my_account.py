"""My account for super-admins: password, devices, recovery codes, new phone (decision 023).

A 2FA code is accepted once, and only one step of clock drift is allowed, so each test
uses at most two codes from the same authenticator (now, and the next 30 seconds).
"""

import time

import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import Connection, text

from app.testing import ADMIN_EMAIL, PASSWORD, make_admin

SECRET = pyotp.random_base32()
NEW_PASSWORD = "a brand new passphrase for the console"  # test-only


def _code(secret: str = SECRET, *, next_code: bool = False) -> str:
    return pyotp.TOTP(secret).at(time.time() + (30 if next_code else 0))


def _challenge(client: TestClient, password: str = PASSWORD) -> str:
    response = client.post(
        "/v1/platform/auth/sign-in", json={"email": ADMIN_EMAIL, "password": password}
    )
    assert response.status_code == 200, response.text
    challenge: str = response.json()["challenge"]
    return challenge


def _sign_in(
    client: TestClient, secret: str = SECRET, *, next_code: bool = False
) -> dict[str, str]:
    response = client.post(
        "/v1/platform/auth/verify",
        json={"challenge": _challenge(client), "code": _code(secret, next_code=next_code)},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _me(client: TestClient, db: Connection) -> dict[str, str]:
    make_admin(db, totp_secret=SECRET)
    return _sign_in(client)


def _actions(db: Connection) -> list[str]:
    return list(db.execute(text("SELECT action FROM audit_log ORDER BY at, id")).scalars())


def _recovery_codes(client: TestClient, headers: dict[str, str]) -> list[str]:
    """Uses the NEXT code from the phone (the current one opened the session)."""
    response = client.post(
        "/v1/platform/account/recovery-codes",
        json={"password": PASSWORD, "code": _code(next_code=True)},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    codes: list[str] = response.json()["codes"]
    return codes


def _recover(client: TestClient, code: str) -> dict[str, object]:
    response = client.post(
        "/v1/platform/auth/recover",
        json={"challenge": _challenge(client), "recovery_code": code},
    )
    body: dict[str, object] = response.json() | {"status": response.status_code}
    return body


# ── The account page ─────────────────────────────────────────────────────
def test_the_account_shows_security_details_and_each_device(
    client: TestClient, db: Connection
) -> None:
    mine = _me(client, db)
    _sign_in(client, next_code=True)  # a second device

    body = client.get("/v1/platform/account", headers=mine).json()
    assert body["email"] == ADMIN_EMAIL and body["two_factor"] is True
    assert body["recovery_codes_left"] == 0 and body["recovery_codes_created_at"] is None
    assert body["password_changed_at"] is None
    assert len(body["sessions"]) == 2
    assert [s["current"] for s in body["sessions"]].count(True) == 1
    assert body["sessions"][0]["user_agent"] == "testclient"
    for secret_field in ("password_hash", "totp_secret_enc", "token_hash"):
        assert secret_field not in str(body)


def test_a_lab_token_cannot_open_my_account(client: TestClient, db: Connection) -> None:
    _me(client, db)
    response = client.get("/v1/platform/account", headers={"Authorization": "Bearer lab-token"})
    assert response.status_code == 401


# ── Change password ──────────────────────────────────────────────────────
def test_changing_the_password_signs_out_every_other_device(
    client: TestClient, db: Connection
) -> None:
    mine = _me(client, db)
    other = _sign_in(client, next_code=True)

    response = client.post(
        "/v1/platform/account/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers=mine,
    )
    assert response.status_code == 200, response.text
    assert response.json()["password_changed_at"] is not None
    assert len(response.json()["sessions"]) == 1

    assert client.get("/v1/platform/account", headers=other).status_code == 401
    assert client.get("/v1/platform/account", headers=mine).status_code == 200
    old = client.post(
        "/v1/platform/auth/sign-in", json={"email": ADMIN_EMAIL, "password": PASSWORD}
    )
    assert old.json()["code"] == "invalid_credentials"
    assert _challenge(client, NEW_PASSWORD)
    assert "platform.password_changed" in _actions(db)
    # Neither password is kept anywhere but the hash.
    stored = str(list(db.execute(text("SELECT * FROM audit_log")).all()))
    assert PASSWORD not in stored and NEW_PASSWORD not in stored


def test_change_password_checks(client: TestClient, db: Connection) -> None:
    mine = _me(client, db)
    url = "/v1/platform/account/password"
    cases = [
        ({"current_password": "not it at all", "new_password": NEW_PASSWORD}, "wrong_password"),
        ({"current_password": PASSWORD, "new_password": "fifteen chars!!"}, "password_too_short"),
        ({"current_password": PASSWORD, "new_password": PASSWORD}, "password_unchanged"),
        ({"current_password": PASSWORD, "new_password": ADMIN_EMAIL.upper()}, "password_is_email"),
    ]
    for body, code in cases:
        response = client.post(url, json=body, headers=mine)
        assert response.json()["code"] == code, body
    wrong = client.post(url, json=cases[0][0], headers=mine).json()
    assert wrong["field"] == "current_password"
    assert "platform.account_password_failed" in _actions(db)
    # Nothing changed.
    assert _challenge(client)


def test_change_password_is_idempotent(client: TestClient, db: Connection) -> None:
    headers = _me(client, db) | {"Idempotency-Key": "change-password-0001"}
    body = {"current_password": PASSWORD, "new_password": NEW_PASSWORD}
    first = client.post("/v1/platform/account/password", json=body, headers=headers)
    # The retry is answered from the record, even though PASSWORD is no longer current.
    retry = client.post("/v1/platform/account/password", json=body, headers=headers)
    assert first.status_code == retry.status_code == 200
    assert retry.json()["password_changed_at"] == first.json()["password_changed_at"]
    assert _actions(db).count("platform.password_changed") == 1


def test_five_wrong_passwords_lock_the_account_pages(client: TestClient, db: Connection) -> None:
    mine = _me(client, db)
    body = {"current_password": "guessing again", "new_password": NEW_PASSWORD}
    codes = [
        client.post("/v1/platform/account/password", json=body, headers=mine).json()["code"]
        for _ in range(5)
    ]
    assert codes == ["wrong_password"] * 4 + ["too_many_attempts"]
    right = client.post(
        "/v1/platform/account/password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers=mine,
    )
    assert right.status_code == 429  # even the right password waits out the lock


# ── Sign out everywhere else ─────────────────────────────────────────────
def test_sign_out_everywhere_else_keeps_this_device(client: TestClient, db: Connection) -> None:
    mine = _me(client, db)
    other = _sign_in(client, next_code=True)

    response = client.post(
        "/v1/platform/account/sign-out-others", headers=mine | {"Idempotency-Key": "sign-out-01"}
    )
    assert response.json() == {"ended": 1}
    assert client.get("/v1/platform/labs", headers=other).status_code == 401
    assert client.get("/v1/platform/labs", headers=mine).status_code == 200
    retry = client.post(
        "/v1/platform/account/sign-out-others", headers=mine | {"Idempotency-Key": "sign-out-01"}
    )
    assert retry.json() == {"ended": 1}
    assert _actions(db).count("platform.signed_out_elsewhere") == 1


# ── Recovery codes ───────────────────────────────────────────────────────
def test_recovery_codes_are_shown_once_and_stored_hashed(
    client: TestClient, db: Connection
) -> None:
    mine = _me(client, db) | {"Idempotency-Key": "recovery-codes-01"}
    response = client.post(
        "/v1/platform/account/recovery-codes",
        json={"password": PASSWORD, "code": _code(next_code=True)},
        headers=mine,
    )
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    codes = response.json()["codes"]
    assert len(codes) == 10 and len(set(codes)) == 10
    assert all(len(c) == 19 and c.count("-") == 3 for c in codes)  # XXXX-XXXX-XXXX-XXXX

    stored = list(db.execute(text("SELECT code_hash FROM platform_recovery_codes")).scalars())
    assert len(stored) == 10
    assert not any(c.replace("-", "") in h for c in codes for h in stored)
    assert client.get("/v1/platform/account", headers=mine).json()["recovery_codes_left"] == 10

    retry = client.post(
        "/v1/platform/account/recovery-codes",
        json={"password": PASSWORD, "code": _code(next_code=True)},
        headers=mine,
    )
    assert retry.status_code == 201 and retry.json()["codes"] is None  # never shown twice
    assert "platform.recovery_codes_created" in _actions(db)


def test_recovery_codes_need_the_password_and_the_phone(client: TestClient, db: Connection) -> None:
    mine = _me(client, db)
    url = "/v1/platform/account/recovery-codes"
    no_code = client.post(url, json={"password": PASSWORD, "code": "000000"}, headers=mine)
    assert no_code.json()["code"] == "code_invalid"
    # The code that opened this session is spent: a stolen session can't reuse it.
    spent = client.post(url, json={"password": PASSWORD, "code": _code()}, headers=mine)
    assert spent.json()["code"] == "code_invalid"
    wrong = client.post(
        url, json={"password": "not my password", "code": _code(next_code=True)}, headers=mine
    )
    assert wrong.json()["code"] == "wrong_password"
    assert db.execute(text("SELECT count(*) FROM platform_recovery_codes")).scalar() == 0


def test_a_new_set_of_recovery_codes_cancels_the_old_one(
    client: TestClient, db: Connection
) -> None:
    mine = _me(client, db)
    old = _recovery_codes(client, mine)
    # A real person would wait 30 seconds for a fresh code; the test rewinds the record.
    db.execute(text("UPDATE platform_admins SET totp_last_step = totp_last_step - 1"))
    new = client.post(
        "/v1/platform/account/recovery-codes",
        json={"password": PASSWORD, "code": _code(next_code=True)},
        headers=mine,
    )
    assert new.status_code == 201, new.text
    assert _recover(client, old[0])["code"] == "recovery_code_invalid"
    assert _recover(client, new.json()["codes"][0])["status"] == 200


# ── Signing in with a recovery code ──────────────────────────────────────
def test_a_recovery_code_signs_in_once(client: TestClient, db: Connection) -> None:
    codes = _recovery_codes(client, _me(client, db))

    # Typed by hand from paper: lower case and spaces are fine.
    typed = codes[0].lower().replace("-", " ")
    first = _recover(client, typed)
    assert first["status"] == 200 and first["recovery_codes_left"] == 9
    headers = {"Authorization": f"Bearer {first['access_token']}"}
    assert client.get("/v1/platform/labs", headers=headers).status_code == 200

    again = _recover(client, codes[0])
    assert again["code"] == "recovery_code_invalid" and again["field"] == "recovery_code"
    assert "platform.sign_in_recovery_code" in _actions(db)
    used = db.execute(
        text("SELECT count(*) FROM platform_recovery_codes WHERE used_at IS NOT NULL")
    )
    assert used.scalar() == 1


def test_wrong_recovery_codes_count_toward_the_lock(client: TestClient, db: Connection) -> None:
    codes = _recovery_codes(client, _me(client, db))
    tries = [_recover(client, "ABCD-EFGH-JKMN-PQRS")["code"] for _ in range(5)]
    assert tries == ["recovery_code_invalid"] * 4 + ["too_many_attempts"]
    assert _recover(client, codes[0])["status"] == 429  # locked, even with a good code


def test_no_recovery_code_before_2fa_is_set_up(client: TestClient, db: Connection) -> None:
    make_admin(db)  # no authenticator yet: sign-in asks for setup
    response = _recover(client, "ABCD-EFGH-JKMN-PQRS")
    assert response["code"] == "challenge_expired"


# ── Moving 2FA to a new phone ────────────────────────────────────────────
def test_moving_2fa_to_a_new_phone(client: TestClient, db: Connection) -> None:
    mine = _me(client, db)
    other = _sign_in(client, next_code=True)

    start = client.post(
        "/v1/platform/account/authenticator", json={"password": PASSWORD}, headers=mine
    )
    assert start.status_code == 200 and start.headers["cache-control"] == "no-store"
    challenge = start.json()["challenge"]
    new_secret = start.json()["setup"]["secret"]
    assert start.json()["setup"]["qr_image"].startswith("data:image/svg+xml")
    # Nothing has changed yet: the old phone still signs in on step 2.
    assert db.execute(text("SELECT totp_secret_enc FROM platform_admins")).scalar()

    wrong = client.post(
        "/v1/platform/account/authenticator/confirm",
        json={"challenge": challenge, "code": "123456"},
        headers=mine,
    )
    assert wrong.json()["code"] == "code_invalid"

    url = "/v1/platform/account/authenticator/confirm"
    body = {"challenge": challenge, "code": _code(new_secret)}
    done = client.post(url, json=body, headers=mine)
    assert done.json() == {"ended": 1}
    assert client.get("/v1/platform/labs", headers=other).status_code == 401
    assert client.get("/v1/platform/labs", headers=mine).status_code == 200
    # The same code can't switch again without a request key to replay.
    assert client.post(url, json=body, headers=mine).json()["code"] == "code_invalid"

    old_phone = client.post(
        "/v1/platform/auth/verify",
        json={"challenge": _challenge(client), "code": _code(next_code=True)},
    )
    assert old_phone.json()["code"] == "code_invalid"
    _sign_in(client, new_secret, next_code=True)
    assert "platform.2fa_moved" in _actions(db)


def test_a_new_phone_needs_the_password_and_this_session(
    client: TestClient, db: Connection
) -> None:
    mine = _me(client, db)
    other = _sign_in(client, next_code=True)
    refused = client.post(
        "/v1/platform/account/authenticator", json={"password": "not my password"}, headers=mine
    )
    assert refused.json()["code"] == "wrong_password"

    start = client.post(
        "/v1/platform/account/authenticator", json={"password": PASSWORD}, headers=mine
    ).json()
    # Another device can't finish a switch this one started.
    stolen = client.post(
        "/v1/platform/account/authenticator/confirm",
        json={"challenge": start["challenge"], "code": _code(start["setup"]["secret"])},
        headers=other,
    )
    assert stolen.json()["code"] == "challenge_expired"
    # Nor can the sign-in challenge stand in for it.
    sign_in_challenge = client.post(
        "/v1/platform/account/authenticator/confirm",
        json={"challenge": _challenge(client), "code": _code(start["setup"]["secret"])},
        headers=mine,
    )
    assert sign_in_challenge.json()["code"] == "challenge_expired"
