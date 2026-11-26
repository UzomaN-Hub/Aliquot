"""Super-admin tokens and 2FA (decision 015).

Kept apart from lab tokens: a different audience ("platform"), no lab claim, so a lab
token can never open the console and a console token can never read a lab.
"""

import hmac
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
import pyotp
import segno
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

_ALGORITHM = "HS256"
PLATFORM_AUDIENCE = "platform"
_MFA_AUDIENCE = "platform-mfa"
MFA_CHALLENGE_MINUTES = 5
TOTP_PERIOD = 30


# ── Access token ─────────────────────────────────────────────────────────
@dataclass(frozen=True)
class PlatformClaims:
    admin_id: UUID
    session_id: UUID


def create_platform_access_token(claims: PlatformClaims, now: datetime | None = None) -> str:
    settings = get_settings()
    issued = now or datetime.now(UTC)
    payload = {
        "sub": str(claims.admin_id),
        "sid": str(claims.session_id),
        "aud": PLATFORM_AUDIENCE,
        "iss": settings.platform_domain,
        "iat": issued,
        "exp": issued + timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=_ALGORITHM)


def decode_platform_access_token(token: str) -> PlatformClaims | None:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[_ALGORITHM],
            audience=PLATFORM_AUDIENCE,
            issuer=settings.platform_domain,
            options={"require": ["sub", "sid", "exp", "iat", "aud", "iss"]},
        )
        return PlatformClaims(admin_id=UUID(payload["sub"]), session_id=UUID(payload["sid"]))
    except (jwt.PyJWTError, ValueError, KeyError):
        return None


# ── 2FA challenge: proves the password step passed, for 5 minutes ────────
@dataclass(frozen=True)
class MfaChallenge:
    admin_id: UUID
    # Set only during first-time setup: the new secret, ENCRYPTED, until confirmed.
    pending_secret_enc: str | None


def create_mfa_challenge(admin_id: UUID, pending_secret_enc: str | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, object] = {
        "sub": str(admin_id),
        "aud": _MFA_AUDIENCE,
        "iss": settings.platform_domain,
        "iat": now,
        "exp": now + timedelta(minutes=MFA_CHALLENGE_MINUTES),
    }
    if pending_secret_enc is not None:
        payload["pse"] = pending_secret_enc
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=_ALGORITHM)


def decode_mfa_challenge(token: str) -> MfaChallenge | None:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[_ALGORITHM],
            audience=_MFA_AUDIENCE,
            issuer=settings.platform_domain,
            options={"require": ["sub", "exp", "iat", "aud", "iss"]},
        )
        return MfaChallenge(admin_id=UUID(payload["sub"]), pending_secret_enc=payload.get("pse"))
    except (jwt.PyJWTError, ValueError, KeyError):
        return None


# ── TOTP secrets: encrypted at rest ──────────────────────────────────────
def _fernet() -> Fernet:
    return Fernet(get_settings().totp_encryption_key.get_secret_value().encode())


def new_totp_secret() -> str:
    return pyotp.random_base32()


def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(secret_enc: str) -> str | None:
    try:
        return _fernet().decrypt(secret_enc.encode()).decode()
    except InvalidToken:
        return None


def totp_provisioning(secret: str, email: str) -> tuple[str, str]:
    """(otpauth:// link for authenticator apps, QR code as an image data URI).

    A complete SVG with its namespace, so browsers can show it in an <img>; inline
    SVG (without xmlns) renders nothing there.
    """
    uri = pyotp.TOTP(secret).provisioning_uri(
        name=email, issuer_name=f"{get_settings().platform_name} console"
    )
    image = segno.make(uri, error="m").svg_data_uri(
        scale=5, border=2, dark="#1f1e1c", light="#fbf9f4"
    )
    return uri, image


def verify_totp(
    secret: str, code: str, last_step: int | None, now: float | None = None
) -> int | None:
    """The time step the code belongs to, or None. Accepts one step of clock drift either
    side, and never the same step twice (a code seen once can't be replayed)."""
    code = code.strip().replace(" ", "")
    if len(code) != 6 or not code.isdigit():
        return None
    totp = pyotp.TOTP(secret, interval=TOTP_PERIOD)
    current = int((now if now is not None else time.time()) // TOTP_PERIOD)
    for step in (current - 1, current, current + 1):
        if last_step is not None and step <= last_step:
            continue
        if hmac.compare_digest(totp.at(step * TOTP_PERIOD), code):
            return step
    return None
