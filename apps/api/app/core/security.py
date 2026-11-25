"""Passwords, access tokens and refresh tokens (ARCHITECTURE.md §9, decision 013)."""

import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings

# ── Passwords: Argon2id ──────────────────────────────────────────────────
# Deliberately slow (about 50 to 100 ms) so a stolen hash is expensive to crack.
_hasher = PasswordHasher()

# Verified against when the email is unknown, so "no such user" takes as long as
# "wrong password" and response time can't reveal which emails exist.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    """True when the hashing cost was raised since this hash was made."""
    return _hasher.check_needs_rehash(password_hash)


# ── Access tokens: short-lived JWT, kept in memory by the browser ────────
_ALGORITHM = "HS256"
_AUDIENCE = "lab"


@dataclass(frozen=True)
class AccessClaims:
    user_id: UUID
    lab_id: UUID
    session_id: UUID
    roles: tuple[str, ...]
    sections: tuple[str, ...]


def create_access_token(claims: AccessClaims, now: datetime | None = None) -> str:
    settings = get_settings()
    issued = now or datetime.now(UTC)
    payload = {
        "sub": str(claims.user_id),
        "lab": str(claims.lab_id),
        "sid": str(claims.session_id),
        "roles": list(claims.roles),
        "sections": list(claims.sections),
        "aud": _AUDIENCE,
        "iss": settings.platform_domain,
        "iat": issued,
        "exp": issued + timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=_ALGORITHM)


def decode_access_token(token: str) -> AccessClaims | None:
    """Return the claims, or None if the token is expired, forged or malformed."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[_ALGORITHM],  # never trust the token's own "alg" header
            audience=_AUDIENCE,
            issuer=settings.platform_domain,
            options={"require": ["sub", "lab", "sid", "exp", "iat", "aud", "iss"]},
        )
        return AccessClaims(
            user_id=UUID(payload["sub"]),
            lab_id=UUID(payload["lab"]),
            session_id=UUID(payload["sid"]),
            roles=tuple(payload.get("roles", [])),
            sections=tuple(payload.get("sections", [])),
        )
    except (jwt.PyJWTError, ValueError, KeyError):
        return None


# ── Refresh tokens: random, stored only as a hash ────────────────────────
def new_refresh_token() -> tuple[str, str]:
    """Return (token for the cookie, hash for the database)."""
    token = secrets.token_urlsafe(32)  # 256 bits
    return token, hash_token(token)


def hash_token(token: str) -> str:
    # SHA-256 is right here (not Argon2): the token is 256 random bits, so there is
    # nothing to brute-force, and the lookup must be an exact, indexed match.
    return hashlib.sha256(token.encode()).hexdigest()
