from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.config import get_settings
from app.modules.auth import service
from app.modules.auth.dependencies import CurrentUser, client_info, require_csrf_header
from app.modules.auth.schemas import (
    LabRequest,
    LabResponse,
    SessionResponse,
    SignInRequest,
    UserResponse,
)
from app.modules.staff.service import StaffAccount

router = APIRouter(prefix="/v1/auth", tags=["auth"])

# The browser reaches us through the web's same-origin proxy at /api/v1/auth
# (decision 003), so that is the cookie's path, not our own /v1/auth.
COOKIE_PATH = "/api/v1/auth"


def _secure() -> bool:
    # Local dev is plain http://localhost, where Safari (and older Firefox) drop
    # Secure cookies. Every deployed environment is HTTPS and keeps Secure.
    return get_settings().environment != "local"


def cookie_name(lab_slug: str) -> str:
    # One cookie per lab, so staff of two labs can be signed in to both.
    # `__Secure-` makes browsers refuse the cookie unless it is Secure.
    prefix = "__Secure-" if _secure() else ""
    return f"{prefix}refresh-{lab_slug}"


def _user(account: StaffAccount) -> UserResponse:
    return UserResponse(
        id=account.id,
        full_name=account.full_name,
        email=account.email,
        roles=list(account.roles),
        sections=list(account.sections),
    )


def _respond(signed_in: service.SignedIn, response: Response) -> SessionResponse:
    max_age = int((signed_in.refresh_expires_at - datetime.now(UTC)).total_seconds())
    response.set_cookie(
        cookie_name(signed_in.lab.slug),
        signed_in.refresh_token,
        max_age=max(max_age, 0),
        path=COOKIE_PATH,
        secure=_secure(),
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"
    return SessionResponse(
        access_token=signed_in.access_token,
        expires_in=signed_in.expires_in_seconds,
        user=_user(signed_in.account),
        lab=LabResponse(
            name=signed_in.lab.name, slug=signed_in.lab.slug, timezone=signed_in.lab.timezone
        ),
    )


@router.post("/sign-in", summary="Sign in with email and password")
async def sign_in(body: SignInRequest, request: Request, response: Response) -> SessionResponse:
    """Returns a 15-minute access token and sets the refresh cookie for this lab.

    Not idempotency-keyed on purpose: a replayed sign-in must not hand out stored tokens.
    """
    signed_in = await service.sign_in(body.lab, body.email, body.password, client_info(request))
    return _respond(signed_in, response)


@router.post(
    "/refresh",
    summary="Swap the refresh cookie for a new token pair",
    dependencies=[Depends(require_csrf_header)],
)
async def refresh(body: LabRequest, request: Request, response: Response) -> SessionResponse:
    token = request.cookies.get(cookie_name(body.lab))
    if not token:
        raise service.session_ended()
    signed_in = await service.refresh(body.lab, token, client_info(request))
    return _respond(signed_in, response)


@router.post(
    "/sign-out",
    summary="End this device's session",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf_header)],
)
async def sign_out(
    body: LabRequest,
    request: Request,
    response: Response,
) -> None:
    await service.sign_out(
        body.lab, request.cookies.get(cookie_name(body.lab)), client_info(request)
    )
    response.delete_cookie(
        cookie_name(body.lab), path=COOKIE_PATH, secure=_secure(), httponly=True, samesite="lax"
    )


@router.get("/me", summary="The signed-in user")
async def me(claims: CurrentUser) -> UserResponse:
    return _user(await service.get_me(claims))
