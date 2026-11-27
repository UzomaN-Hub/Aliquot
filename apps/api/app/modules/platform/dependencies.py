from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError
from app.core.platform_security import PlatformClaims, decode_platform_access_token
from app.modules.platform import service

_bearer = HTTPBearer(auto_error=False)


async def current_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> PlatformClaims:
    """The signed-in super-admin. A lab token never passes (different audience), and a
    token whose admin was deactivated or whose session was ended stops at once."""
    if credentials is None:
        raise AppError(401, "not_signed_in", "Sign in to continue.")
    claims = decode_platform_access_token(credentials.credentials)
    if claims is None:
        raise AppError(401, "token_expired", "Your sign-in has expired. Sign in again.")
    await service.require_live_session(claims)
    return claims


CurrentAdmin = Annotated[PlatformClaims, Depends(current_admin)]


async def idempotency_key(
    idempotency_key: Annotated[str | None, Header(min_length=8, max_length=200)] = None,
) -> str | None:
    """Optional `Idempotency-Key` header: the same key and body run once (CLAUDE.md)."""
    return idempotency_key


IdempotencyKey = Annotated[str | None, Depends(idempotency_key)]
