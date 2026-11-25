"""Platform console: super-admin sign-in (2FA required) and lab management.

Everything runs as aliquot_platform. The console creates labs and their first
Manager, but never reads staff, sessions or clinical data (ROLES.md, decision 015).
"""

import hashlib
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import platform_transaction
from app.core.enums import LabStatus
from app.core.errors import AppError
from app.core.ids import uuid7
from app.core.platform_security import (
    PlatformClaims,
    create_mfa_challenge,
    create_platform_access_token,
    decode_mfa_challenge,
    decrypt_secret,
    encrypt_secret,
    new_totp_secret,
    totp_provisioning,
    verify_totp,
)
from app.core.security import hash_token, new_refresh_token, verify_password
from app.modules.audit import service as audit
from app.modules.audit.models import ActorType
from app.modules.auth import service as auth
from app.modules.auth.service import ClientInfo
from app.modules.platform import repository
from app.modules.platform.models import PlatformAdmin, PlatformSession
from app.modules.platform.schemas import (
    AdminResponse,
    CreateLabRequest,
    CreateLabResponse,
    LabDetailResponse,
    PlatformSessionResponse,
    SignInStepResponse,
    TotpSetup,
)
from app.modules.staff import service as staff
from app.modules.tenants import service as tenants
from app.modules.tenants.service import LabDetail, LabSummary, NewLab

MAX_CODE_ATTEMPTS = 5
LOCK_MINUTES = 15


# ── Errors ────────────────────────────────────────────────────────────────
def invalid_credentials() -> AppError:
    return AppError(401, "invalid_credentials", "That email and password don't match. Try again.")


def challenge_expired() -> AppError:
    return AppError(401, "challenge_expired", "Sign-in took too long. Start again.")


def code_invalid() -> AppError:
    return AppError(
        401,
        "code_invalid",
        "That code didn't work. Check the time on your phone and try the newest code.",
        "code",
    )


def too_many_attempts() -> AppError:
    return AppError(
        429, "too_many_attempts", f"Too many wrong codes. Try again in {LOCK_MINUTES} minutes."
    )


def session_ended() -> AppError:
    return AppError(401, "session_ended", "Your session has ended. Sign in again.")


# ── Sign-in: password, then a 6-digit code ────────────────────────────────
async def sign_in(email: str, password: str, client: ClientInfo) -> SignInStepResponse:
    result: SignInStepResponse | None = None
    async with platform_transaction() as session:
        admin = await repository.get_admin_by_email(session, staff.normalise_email(email))
        usable = admin is not None and admin.active
        ok = verify_password(admin.password_hash if admin and usable else None, password)
        if admin is not None and usable and ok:
            if admin.totp_secret_enc is None:
                # First sign-in: 2FA is set up before the console opens (ARCHITECTURE §9).
                secret = new_totp_secret()
                uri, svg = totp_provisioning(secret, admin.email)
                result = SignInStepResponse(
                    step="setup",
                    challenge=create_mfa_challenge(admin.id, encrypt_secret(secret)),
                    setup=TotpSetup(secret=secret, otpauth_uri=uri, qr_svg=svg),
                )
            else:
                result = SignInStepResponse(step="verify", challenge=create_mfa_challenge(admin.id))
        else:
            await audit.record(
                session,
                lab_id=None,
                actor_type=ActorType.PLATFORM_ADMIN if admin else ActorType.SYSTEM,
                actor_id=admin.id if admin else None,
                action="platform.sign_in_failed",
                entity="platform_admin",
                entity_id=admin.id if admin else None,
                after={"email": staff.normalise_email(email)},
                ip=client.ip,
            )
    if result is None:
        raise invalid_credentials()
    return result


async def _start_session(
    session: AsyncSession,
    admin: PlatformAdmin,
    *,
    family_id: UUID,
    expires_at: datetime,
    now: datetime,
    client: ClientInfo,
) -> tuple[PlatformSession, PlatformSessionResponse, str]:
    token, token_hash = new_refresh_token()
    row = await repository.add_session(
        session,
        PlatformSession(
            id=uuid7(),
            admin_id=admin.id,
            family_id=family_id,
            refresh_token_hash=token_hash,
            user_agent=client.user_agent,
            ip=client.ip,
            last_used_at=now,
            expires_at=expires_at,
        ),
    )
    access = create_platform_access_token(PlatformClaims(admin_id=admin.id, session_id=row.id), now)
    response = PlatformSessionResponse(
        access_token=access,
        expires_in=get_settings().access_token_minutes * 60,
        admin=AdminResponse(id=admin.id, full_name=admin.full_name, email=admin.email),
    )
    return row, response, token


@dataclass(frozen=True)
class PlatformSignedIn:
    response: PlatformSessionResponse
    refresh_token: str
    refresh_expires_at: datetime


async def verify(challenge: str, code: str, client: ClientInfo) -> PlatformSignedIn:
    claim = decode_mfa_challenge(challenge)
    if claim is None:
        raise challenge_expired()
    now = datetime.now(UTC)
    outcome: PlatformSignedIn | AppError = code_invalid()

    async with platform_transaction() as session:
        admin = await repository.get_admin(session, claim.admin_id, lock=True)
        if admin is None or not admin.active:
            raise challenge_expired()
        if admin.totp_locked_until is not None and admin.totp_locked_until > now:
            raise too_many_attempts()
        setting_up = claim.pending_secret_enc is not None
        if setting_up and admin.totp_secret_enc is not None:
            raise challenge_expired()  # 2FA was set up meanwhile: start again
        secret_enc = claim.pending_secret_enc if setting_up else admin.totp_secret_enc
        secret = decrypt_secret(secret_enc) if secret_enc else None
        step = verify_totp(secret, code, admin.totp_last_step) if secret else None

        if step is None:
            # Committed even though the request fails: the counter must survive.
            admin.totp_failed_attempts += 1
            if admin.totp_failed_attempts >= MAX_CODE_ATTEMPTS:
                admin.totp_locked_until = now + timedelta(minutes=LOCK_MINUTES)
                admin.totp_failed_attempts = 0
                outcome = too_many_attempts()
            await audit.record(
                session,
                lab_id=None,
                actor_type=ActorType.PLATFORM_ADMIN,
                actor_id=admin.id,
                action="platform.code_failed",
                entity="platform_admin",
                entity_id=admin.id,
                ip=client.ip,
            )
        else:
            if setting_up:
                admin.totp_secret_enc = secret_enc
            admin.totp_last_step = step
            admin.totp_failed_attempts = 0
            admin.totp_locked_until = None
            admin.last_login_at = now
            expires_at = now + timedelta(days=get_settings().refresh_token_days)
            row, response, token = await _start_session(
                session, admin, family_id=uuid7(), expires_at=expires_at, now=now, client=client
            )
            await audit.record(
                session,
                lab_id=None,
                actor_type=ActorType.PLATFORM_ADMIN,
                actor_id=admin.id,
                action="platform.2fa_enabled" if setting_up else "platform.sign_in",
                entity="platform_session",
                entity_id=row.id,
                ip=client.ip,
            )
            outcome = PlatformSignedIn(response, token, expires_at)

    if isinstance(outcome, AppError):
        raise outcome
    return outcome


async def refresh(refresh_token: str, client: ClientInfo) -> PlatformSignedIn:
    now = datetime.now(UTC)
    result: PlatformSignedIn | None = None
    idle = timedelta(hours=get_settings().session_idle_hours)
    async with platform_transaction() as session:
        current = await repository.get_session_by_token_hash(session, hash_token(refresh_token))
        if current is None:
            pass
        elif current.revoked_at is not None:
            if current.replaced_by is not None:
                await repository.revoke_family(session, current.family_id, now)
                await audit.record(
                    session,
                    lab_id=None,
                    actor_type=ActorType.SYSTEM,
                    actor_id=None,
                    action="platform.refresh_token_reused",
                    entity="platform_session",
                    entity_id=current.id,
                    ip=client.ip,
                )
        elif now >= current.expires_at or now - current.last_used_at > idle:
            current.revoked_at = now
        else:
            admin = await repository.get_admin(session, current.admin_id)
            if admin is not None and admin.active:
                row, response, token = await _start_session(
                    session,
                    admin,
                    family_id=current.family_id,
                    expires_at=current.expires_at,
                    now=now,
                    client=client,
                )
                current.revoked_at = now
                current.replaced_by = row.id
                result = PlatformSignedIn(response, token, current.expires_at)
            else:
                current.revoked_at = now
    if result is None:
        raise session_ended()
    return result


async def sign_out(refresh_token: str | None, client: ClientInfo) -> None:
    if not refresh_token:
        return
    async with platform_transaction() as session:
        current = await repository.get_session_by_token_hash(session, hash_token(refresh_token))
        if current is None or current.revoked_at is not None:
            return
        await repository.revoke_family(session, current.family_id, datetime.now(UTC))
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=current.admin_id,
            action="platform.sign_out",
            entity="platform_session",
            entity_id=current.id,
            ip=client.ip,
        )


async def get_me(claims: PlatformClaims) -> AdminResponse:
    async with platform_transaction() as session:
        admin = await repository.get_admin(session, claims.admin_id)
    if admin is None or not admin.active:
        raise session_ended()
    return AdminResponse(id=admin.id, full_name=admin.full_name, email=admin.email)


# ── Idempotency (CLAUDE.md: every write accepts Idempotency-Key) ─────────
def request_hash(payload: object) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


async def _idempotent[T: BaseModel](
    session: AsyncSession,
    admin_id: UUID,
    key: str | None,
    fingerprint: str,
    action: Callable[[], Awaitable[tuple[T, dict[str, Any]]]],
) -> T | dict[str, Any]:
    """Run `action` once per key. A retry with the same key and body gets the stored
    answer; the same key with a different body is refused. `action` returns
    (response, the copy to store); the copy may leave out one-time secrets."""
    if key is None:
        response, _ = await action()
        return response
    stored = await repository.get_idempotent_response(session, admin_id, key)
    if stored is not None:
        if stored.request_hash != fingerprint:
            raise AppError(
                422,
                "idempotency_key_reused",
                "This request key was already used for a different request.",
            )
        return stored.response_body
    response, to_store = await action()
    await repository.save_idempotent_response(session, admin_id, key, fingerprint, 200, to_store)
    return response


# ── Labs ──────────────────────────────────────────────────────────────────
def _detail(lab: LabDetail) -> LabDetailResponse:
    return LabDetailResponse(
        id=lab.id,
        name=lab.name,
        slug=lab.slug,
        status=lab.status.value,
        staff_count=lab.staff_count,
        created_at=lab.created_at,
        suspended_at=lab.suspended_at,
        legal_name=lab.legal_name,
        address=lab.address,
        phone=lab.phone,
        email=lab.email,
        timezone=lab.timezone,
        sections=list(lab.sections),
    )


async def list_labs() -> list[LabSummary]:
    async with platform_transaction() as session:
        return await tenants.list_labs_for_console(session)


async def get_lab(lab_id: UUID) -> LabDetailResponse:
    async with platform_transaction() as session:
        return _detail(await tenants.get_lab_for_console(session, lab_id))


async def create_lab(
    claims: PlatformClaims, body: CreateLabRequest, key: str | None, client: ClientInfo
) -> CreateLabResponse | dict[str, Any]:
    """New lab + its sections + its first Manager (invited) + the invite link, in one
    transaction: all of it exists, or none of it does."""

    async def action() -> tuple[CreateLabResponse, dict[str, Any]]:
        lab = await tenants.create_lab(
            session,
            NewLab(
                name=body.name,
                slug=body.slug,
                legal_name=body.legal_name,
                address=body.address,
                phone=body.phone,
                email=body.email,
                timezone=body.timezone,
                sections=tuple(body.sections),
            ),
        )
        try:
            manager_id = await staff.create_first_manager(
                session, lab_id=lab.id, full_name=body.manager.full_name, email=body.manager.email
            )
        except IntegrityError as error:  # pragma: no cover: a brand-new lab has no staff
            raise AppError(409, "manager_exists", "That Manager already exists.") from error
        invite_url = await auth.create_invite(
            session, lab_id=lab.id, lab_slug=lab.slug, user_id=manager_id
        )
        lab = await tenants.get_lab_for_console(session, lab.id)  # now counts the Manager
        await audit.record(
            session,
            lab_id=lab.id,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=claims.admin_id,
            action="platform.lab_created",
            entity="lab",
            entity_id=lab.id,
            after={
                "name": lab.name,
                "slug": lab.slug,
                "sections": [section.value for section in lab.sections],
                "manager_email": staff.normalise_email(body.manager.email),
            },
            ip=client.ip,
        )
        response = CreateLabResponse(lab=_detail(lab), invite_url=invite_url)
        # The stored copy leaves the invite link out: the raw token must exist only
        # once, in this response (tokens are stored hashed, CLAUDE.md).
        stored = response.model_copy(update={"invite_url": None}).model_dump(mode="json")
        return response, stored

    async with platform_transaction() as session:
        return await _idempotent(
            session, claims.admin_id, key, request_hash(body.model_dump(mode="json")), action
        )


async def update_lab(
    claims: PlatformClaims,
    lab_id: UUID,
    changes: dict[str, str | None],
    key: str | None,
    client: ClientInfo,
) -> LabDetailResponse | dict[str, Any]:
    async def action() -> tuple[LabDetailResponse, dict[str, Any]]:
        before, lab = await tenants.update_lab(session, lab_id, changes)
        if before:
            await audit.record(
                session,
                lab_id=lab_id,
                actor_type=ActorType.PLATFORM_ADMIN,
                actor_id=claims.admin_id,
                action="platform.lab_updated",
                entity="lab",
                entity_id=lab_id,
                before=before,
                after={field: getattr(lab, field) for field in before},
                ip=client.ip,
            )
        response = _detail(lab)
        return response, response.model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(
            session, claims.admin_id, key, request_hash([str(lab_id), changes]), action
        )


async def change_status(
    claims: PlatformClaims,
    lab_id: UUID,
    suspend: bool,
    reason: str,
    key: str | None,
    client: ClientInfo,
) -> LabDetailResponse | dict[str, Any]:
    """Suspend: staff can't sign in, public links show 'unavailable', data is kept.
    Reactivate restores everything (FLOWS.md §1)."""

    async def action() -> tuple[LabDetailResponse, dict[str, Any]]:
        target = LabStatus.SUSPENDED if suspend else LabStatus.ACTIVE
        lab = await tenants.set_lab_status(session, lab_id, target)
        await audit.record(
            session,
            lab_id=lab_id,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=claims.admin_id,
            action="platform.lab_suspended" if suspend else "platform.lab_reactivated",
            entity="lab",
            entity_id=lab_id,
            after={"reason": reason.strip()},
            ip=client.ip,
        )
        response = _detail(lab)
        return response, response.model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(
            session,
            claims.admin_id,
            key,
            request_hash([str(lab_id), suspend, reason]),
            action,
        )
