"""Platform console API (/v1/platform). Super-admins only; tenant records only."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.modules.auth.dependencies import client_info, require_csrf_header
from app.modules.platform import service
from app.modules.platform.dependencies import CurrentAdmin, IdempotencyKey
from app.modules.platform.schemas import (
    AcceptInviteRequest,
    AccountResponse,
    AdminResponse,
    ChangePasswordRequest,
    ConfirmAuthenticatorRequest,
    CreateLabRequest,
    CreateLabResponse,
    InviteAdminRequest,
    InviteAdminResponse,
    InviteInfoResponse,
    InviteLinkResponse,
    InviteTokenRequest,
    LabDetailResponse,
    LabSummaryResponse,
    NewAuthenticatorResponse,
    PasswordAndCodeRequest,
    PasswordRequest,
    PlatformSessionResponse,
    PlatformSignInRequest,
    RecoveryCodesResponse,
    RecoveryVerifyRequest,
    SessionsEndedResponse,
    SignInStepResponse,
    StatusChangeRequest,
    TeamMemberResponse,
    UpdateLabRequest,
    VerifyRequest,
)

router = APIRouter(prefix="/v1/platform", tags=["platform"])

COOKIE_PATH = "/api/v1/platform/auth"


def _secure() -> bool:
    return get_settings().environment != "local"  # see auth/router.py


def _cookie_name() -> str:
    return "__Secure-refresh-console" if _secure() else "refresh-console"


def _with_cookie(
    signed_in: service.PlatformSignedIn, response: Response
) -> PlatformSessionResponse:
    max_age = int((signed_in.refresh_expires_at - datetime.now(UTC)).total_seconds())
    response.set_cookie(
        _cookie_name(),
        signed_in.refresh_token,
        max_age=max(max_age, 0),
        path=COOKIE_PATH,
        secure=_secure(),
        httponly=True,
        samesite="strict",  # the console never needs the cookie on a cross-site visit
    )
    response.headers["Cache-Control"] = "no-store"
    return signed_in.response


def _json(result: Any, status_code: int = 200, *, secret: bool = False) -> Response:
    """A fresh response model, or the stored body of a replayed idempotent request.
    `secret`: the body holds something shown once (codes, a QR secret): never cached."""
    body = result if isinstance(result, dict) else result.model_dump(mode="json")
    headers = {"Cache-Control": "no-store"} if secret else None
    return JSONResponse(body, status_code=status_code, headers=headers)


# ── Auth ──────────────────────────────────────────────────────────────────
@router.post("/auth/sign-in", summary="Super-admin sign-in, step 1: password")
async def sign_in(body: PlatformSignInRequest, request: Request) -> SignInStepResponse:
    return await service.sign_in(body.email, body.password, client_info(request))


@router.post("/auth/verify", summary="Step 2: the 6-digit code (sets up 2FA the first time)")
async def verify(
    body: VerifyRequest, request: Request, response: Response
) -> PlatformSessionResponse:
    signed_in = await service.verify(body.challenge, body.code, client_info(request))
    return _with_cookie(signed_in, response)


@router.post("/auth/recover", summary="Step 2 without the phone: a single-use recovery code")
async def recover(
    body: RecoveryVerifyRequest, request: Request, response: Response
) -> PlatformSessionResponse:
    signed_in = await service.verify_recovery(
        body.challenge, body.recovery_code, client_info(request)
    )
    return _with_cookie(signed_in, response)


@router.post(
    "/auth/refresh",
    summary="Swap the console refresh cookie for a new pair",
    dependencies=[Depends(require_csrf_header)],
)
async def refresh(request: Request, response: Response) -> PlatformSessionResponse:
    token = request.cookies.get(_cookie_name())
    if not token:
        raise service.session_ended()
    return _with_cookie(await service.refresh(token, client_info(request)), response)


@router.post(
    "/auth/sign-out",
    summary="End this console session",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf_header)],
)
async def sign_out(request: Request, response: Response) -> None:
    await service.sign_out(request.cookies.get(_cookie_name()), client_info(request))
    response.delete_cookie(
        _cookie_name(), path=COOKIE_PATH, secure=_secure(), httponly=True, samesite="strict"
    )


@router.get("/auth/me", summary="The signed-in super-admin")
async def me(claims: CurrentAdmin) -> AdminResponse:
    return await service.get_me(claims)


# ── Labs ──────────────────────────────────────────────────────────────────
@router.get("/labs", summary="All labs, newest first")
async def list_labs(_: CurrentAdmin) -> list[LabSummaryResponse]:
    return [
        LabSummaryResponse(
            id=lab.id,
            name=lab.name,
            slug=lab.slug,
            status=lab.status.value,
            staff_count=lab.staff_count,
            created_at=lab.created_at,
            suspended_at=lab.suspended_at,
        )
        for lab in await service.list_labs()
    ]


@router.post(
    "/labs",
    summary="Create a lab and invite its first Manager",
    status_code=status.HTTP_201_CREATED,
    response_model=CreateLabResponse,
)
async def create_lab(
    body: CreateLabRequest, request: Request, claims: CurrentAdmin, key: IdempotencyKey
) -> Response:
    result = await service.create_lab(claims, body, key, client_info(request))
    return _json(result, status.HTTP_201_CREATED)


@router.get("/labs/{lab_id}", summary="One lab")
async def get_lab(lab_id: UUID, _: CurrentAdmin) -> LabDetailResponse:
    return await service.get_lab(lab_id)


@router.patch(
    "/labs/{lab_id}", summary="Edit a lab's name and details", response_model=LabDetailResponse
)
async def update_lab(
    lab_id: UUID,
    body: UpdateLabRequest,
    request: Request,
    claims: CurrentAdmin,
    key: IdempotencyKey,
) -> Response:
    changes = body.model_dump(exclude_unset=True)
    return _json(await service.update_lab(claims, lab_id, changes, key, client_info(request)))


@router.post("/labs/{lab_id}/suspend", summary="Suspend a lab", response_model=LabDetailResponse)
async def suspend(
    lab_id: UUID,
    body: StatusChangeRequest,
    request: Request,
    claims: CurrentAdmin,
    key: IdempotencyKey,
) -> Response:
    result = await service.change_status(
        claims, lab_id, True, body.reason, key, client_info(request)
    )
    return _json(result)


@router.post(
    "/labs/{lab_id}/reactivate", summary="Reactivate a lab", response_model=LabDetailResponse
)
async def reactivate(
    lab_id: UUID,
    body: StatusChangeRequest,
    request: Request,
    claims: CurrentAdmin,
    key: IdempotencyKey,
) -> Response:
    result = await service.change_status(
        claims, lab_id, False, body.reason, key, client_info(request)
    )
    return _json(result)


# ── Platform team (decision 019) ─────────────────────────────────────────
@router.get("/admins", summary="Every super-admin, oldest first")
async def list_team(_: CurrentAdmin) -> list[TeamMemberResponse]:
    return await service.list_team()


@router.get("/admins/{admin_id}", summary="One super-admin's profile")
async def get_team_member(admin_id: UUID, _: CurrentAdmin) -> TeamMemberResponse:
    return await service.get_team_member(admin_id)


@router.post(
    "/admins",
    summary="Invite a super-admin (they choose a password, then set up 2FA)",
    status_code=status.HTTP_201_CREATED,
    response_model=InviteAdminResponse,
)
async def invite_admin(
    body: InviteAdminRequest, request: Request, claims: CurrentAdmin, key: IdempotencyKey
) -> Response:
    result = await service.invite_admin(claims, body, key, client_info(request))
    return _json(result, status.HTTP_201_CREATED)


@router.post(
    "/admins/{admin_id}/invite",
    summary="A new invite link (the old one stops working)",
    response_model=InviteLinkResponse,
)
async def resend_invite(
    admin_id: UUID, request: Request, claims: CurrentAdmin, key: IdempotencyKey
) -> Response:
    return _json(await service.resend_invite(claims, admin_id, key, client_info(request)))


@router.post(
    "/admins/{admin_id}/deactivate",
    summary="Deactivate a super-admin; their sessions end at once",
    response_model=TeamMemberResponse,
)
async def deactivate_admin(
    admin_id: UUID,
    body: StatusChangeRequest,
    request: Request,
    claims: CurrentAdmin,
    key: IdempotencyKey,
) -> Response:
    result = await service.set_admin_active(
        claims, admin_id, False, body.reason, key, client_info(request)
    )
    return _json(result)


@router.post(
    "/admins/{admin_id}/reactivate",
    summary="Let a deactivated super-admin sign in again",
    response_model=TeamMemberResponse,
)
async def reactivate_admin(
    admin_id: UUID,
    body: StatusChangeRequest,
    request: Request,
    claims: CurrentAdmin,
    key: IdempotencyKey,
) -> Response:
    result = await service.set_admin_active(
        claims, admin_id, True, body.reason, key, client_info(request)
    )
    return _json(result)


@router.post(
    "/admins/{admin_id}/reset-2fa",
    summary="Clear a super-admin's 2FA (lost phone); they set it up again at sign-in",
    response_model=TeamMemberResponse,
)
async def reset_admin_2fa(
    admin_id: UUID,
    body: StatusChangeRequest,
    request: Request,
    claims: CurrentAdmin,
    key: IdempotencyKey,
) -> Response:
    result = await service.reset_admin_2fa(claims, admin_id, body.reason, key, client_info(request))
    return _json(result)


@router.post("/auth/invite/check", summary="Who a super-admin invite link is for")
async def check_invite(body: InviteTokenRequest) -> InviteInfoResponse:
    return await service.check_invite(body.token)


@router.post(
    "/auth/invite/accept",
    summary="Choose a password from an invite link",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def accept_invite(body: AcceptInviteRequest, request: Request) -> None:
    await service.accept_invite(body.token, body.password, client_info(request))


# ── My account (decision 023) ────────────────────────────────────────────
@router.get("/account", summary="Your own account: security details and signed-in devices")
async def get_account(claims: CurrentAdmin) -> AccountResponse:
    return await service.get_account(claims)


@router.post(
    "/account/password",
    summary="Change your password (other devices are signed out)",
    response_model=AccountResponse,
)
async def change_password(
    body: ChangePasswordRequest, request: Request, claims: CurrentAdmin, key: IdempotencyKey
) -> Response:
    result = await service.change_password(
        claims, body.current_password, body.new_password, key, client_info(request)
    )
    return _json(result)


@router.post(
    "/account/sign-out-others",
    summary="Sign out every other device at once",
    response_model=SessionsEndedResponse,
)
async def sign_out_others(request: Request, claims: CurrentAdmin, key: IdempotencyKey) -> Response:
    return _json(await service.sign_out_others(claims, key, client_info(request)))


@router.post(
    "/account/recovery-codes",
    summary="Ten new recovery codes, shown once (older unused codes stop working)",
    status_code=status.HTTP_201_CREATED,
    response_model=RecoveryCodesResponse,
)
async def create_recovery_codes(
    body: PasswordAndCodeRequest, request: Request, claims: CurrentAdmin, key: IdempotencyKey
) -> Response:
    result = await service.create_recovery_codes(
        claims, body.password, body.code, key, client_info(request)
    )
    return _json(result, status.HTTP_201_CREATED, secret=True)


@router.post(
    "/account/authenticator",
    summary="Start moving two-step sign-in to a new phone (QR code, 5 minutes)",
    response_model=NewAuthenticatorResponse,
)
async def start_new_authenticator(
    body: PasswordRequest, request: Request, claims: CurrentAdmin
) -> Response:
    result = await service.start_new_authenticator(claims, body.password, client_info(request))
    return _json(result, secret=True)


@router.post(
    "/account/authenticator/confirm",
    summary="Finish with a code from the new phone (other devices are signed out)",
    response_model=SessionsEndedResponse,
)
async def confirm_new_authenticator(
    body: ConfirmAuthenticatorRequest, request: Request, claims: CurrentAdmin, key: IdempotencyKey
) -> Response:
    result = await service.confirm_new_authenticator(
        claims, body.challenge, body.code, key, client_info(request)
    )
    return _json(result)
