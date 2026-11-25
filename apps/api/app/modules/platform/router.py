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
    AdminResponse,
    CreateLabRequest,
    CreateLabResponse,
    LabDetailResponse,
    LabSummaryResponse,
    PlatformSessionResponse,
    PlatformSignInRequest,
    SignInStepResponse,
    StatusChangeRequest,
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


def _json(result: Any, status_code: int = 200) -> Response:
    """A fresh response model, or the stored body of a replayed idempotent request."""
    if isinstance(result, dict):
        return JSONResponse(result, status_code=status_code)
    return JSONResponse(result.model_dump(mode="json"), status_code=status_code)


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
