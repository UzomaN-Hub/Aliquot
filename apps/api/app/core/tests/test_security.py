import uuid
from datetime import UTC, datetime, timedelta

import jwt

from app.core.ids import uuid7
from app.core.security import (
    AccessClaims,
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)

CLAIMS = AccessClaims(
    user_id=uuid7(),
    lab_id=uuid7(),
    session_id=uuid7(),
    roles=("chief_scientist",),
    sections=("chem_path",),
)


def test_uuid7_is_version_7_and_time_ordered() -> None:
    first = uuid7()
    later = [uuid7() for _ in range(50)]
    assert first.version == 7
    assert first.variant == uuid.RFC_4122
    assert first.int >> 80 <= min(u.int >> 80 for u in later)  # same or later millisecond


def test_password_hash_verifies_only_the_right_password() -> None:
    stored = hash_password("s3cret-pass")
    assert stored.startswith("$argon2id$")
    assert verify_password(stored, "s3cret-pass")
    assert not verify_password(stored, "wrong")
    assert not verify_password(None, "s3cret-pass")
    assert not verify_password("not-a-hash", "s3cret-pass")


def test_access_token_round_trip() -> None:
    assert decode_access_token(create_access_token(CLAIMS)) == CLAIMS


def test_expired_token_is_rejected() -> None:
    old = datetime.now(UTC) - timedelta(minutes=16)
    assert decode_access_token(create_access_token(CLAIMS, now=old)) is None


def test_tampered_or_unsigned_tokens_are_rejected() -> None:
    token = create_access_token(CLAIMS)
    header, payload, signature = token.split(".")
    assert decode_access_token(f"{header}.{payload}.{signature[::-1]}") is None

    unsigned = jwt.encode(
        {"sub": str(CLAIMS.user_id), "lab": str(CLAIMS.lab_id)}, key=None, algorithm="none"
    )
    assert decode_access_token(unsigned) is None


def test_refresh_tokens_are_random_and_stored_hashed() -> None:
    token, stored = new_refresh_token()
    other, _ = new_refresh_token()
    assert token != other
    assert stored == hash_token(token) != token
    assert len(stored) == 64
