"""Request dependencies other modules use: who is calling, and CSRF protection."""

from ipaddress import ip_address
from typing import Annotated

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError
from app.core.security import AccessClaims, decode_access_token
from app.modules.auth.service import ClientInfo

_bearer = HTTPBearer(auto_error=False)


async def current_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AccessClaims:
    """The signed-in user. `lab_id` comes ONLY from here (CLAUDE.md "Tenancy")."""
    if credentials is None:
        raise AppError(401, "not_signed_in", "Sign in to continue.")
    claims = decode_access_token(credentials.credentials)
    if claims is None:
        # The web app refreshes once on this code, then retries (FRONTEND.md §5).
        raise AppError(401, "token_expired", "Your sign-in has expired. Sign in again.")
    return claims


CurrentUser = Annotated[AccessClaims, Depends(current_claims)]


async def require_csrf_header(
    x_csrf_protection: Annotated[str | None, Header()] = None,
) -> None:
    """Cookie-authenticated routes need this custom header. A cross-site form can't
    send it, and a cross-site script would need CORS, which we don't grant."""
    if x_csrf_protection != "1":
        raise AppError(
            403, "csrf_check_failed", "This request was blocked. Reload the page and try again."
        )


def _valid_ip(value: str | None) -> str | None:
    try:
        return str(ip_address(value)) if value else None
    except ValueError:
        return None


def client_info(request: Request) -> ClientInfo:
    # Behind the web proxy every request comes from the proxy's IP; trusting
    # X-Forwarded-For safely arrives with rate limiting (PROGRESS.md, open item).
    user_agent = request.headers.get("user-agent")
    return ClientInfo(
        ip=_valid_ip(request.client.host if request.client else None),
        user_agent=user_agent[:300] if user_agent else None,
    )
