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
    RECOVERY_CODE_COUNT,
    PlatformClaims,
    create_mfa_challenge,
    create_platform_access_token,
    create_rebind_challenge,
    decode_mfa_challenge,
    decode_rebind_challenge,
    decrypt_secret,
    encrypt_secret,
    new_recovery_code,
    new_totp_secret,
    normalise_recovery_code,
    totp_provisioning,
    verify_totp,
)
from app.core.security import hash_password, hash_token, new_refresh_token, verify_password
from app.modules.audit import service as audit
from app.modules.audit.models import ActorType
from app.modules.auth import service as auth
from app.modules.auth.service import ClientInfo
from app.modules.platform import repository
from app.modules.platform.models import (
    PlatformAdmin,
    PlatformInvite,
    PlatformRecoveryCode,
    PlatformSession,
)
from app.modules.platform.schemas import (
    AccountResponse,
    AccountSessionResponse,
    AdminResponse,
    AdminStatusName,
    CreateLabRequest,
    CreateLabResponse,
    InviteAdminRequest,
    InviteAdminResponse,
    InviteInfoResponse,
    InviteLinkResponse,
    LabDetailResponse,
    NewAuthenticatorResponse,
    PlatformSessionResponse,
    RecoveryCodesResponse,
    SessionsEndedResponse,
    SignInStepResponse,
    TeamMemberResponse,
    TotpSetup,
)
from app.modules.staff import service as staff
from app.modules.tenants import service as tenants
from app.modules.tenants.service import LabDetail, LabSummary, NewLab

MAX_CODE_ATTEMPTS = 5
LOCK_MINUTES = 15
INVITE_HOURS = 72
MIN_PASSWORD_LENGTH = 16  # super-admins hold the keys to every lab (as the CLI)


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
        429, "too_many_attempts", f"Too many wrong tries. Try again in {LOCK_MINUTES} minutes."
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
                uri, image = totp_provisioning(secret, admin.email)
                result = SignInStepResponse(
                    step="setup",
                    challenge=create_mfa_challenge(admin.id, encrypt_secret(secret)),
                    setup=TotpSetup(secret=secret, otpauth_uri=uri, qr_image=image),
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
            outcome = await _wrong_code(session, admin, now, client, "platform.code_failed")
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


async def _wrong_code(
    session: AsyncSession, admin: PlatformAdmin, now: datetime, client: ClientInfo, action: str
) -> AppError:
    """Count a wrong code (authenticator or recovery). The caller lets the transaction
    commit and raises afterwards, so the counter survives the failed request. Five in a
    row lock codes for 15 minutes."""
    error = code_invalid()
    admin.totp_failed_attempts += 1
    if admin.totp_failed_attempts >= MAX_CODE_ATTEMPTS:
        admin.totp_locked_until = now + timedelta(minutes=LOCK_MINUTES)
        admin.totp_failed_attempts = 0
        error = too_many_attempts()
    await audit.record(
        session,
        lab_id=None,
        actor_type=ActorType.PLATFORM_ADMIN,
        actor_id=admin.id,
        action=action,
        entity="platform_admin",
        entity_id=admin.id,
        ip=client.ip,
    )
    return error


def recovery_code_invalid() -> AppError:
    return AppError(
        401,
        "recovery_code_invalid",
        "That recovery code didn't work. Check it, or use one you haven't used before.",
        "recovery_code",
    )


async def verify_recovery(
    challenge: str, recovery_code: str, client: ClientInfo
) -> PlatformSignedIn:
    """Step 2 without the phone: one recovery code, used once (decision 023). Wrong
    codes count toward the same 5-try lock as authenticator codes."""
    claim = decode_mfa_challenge(challenge)
    if claim is None or claim.pending_secret_enc is not None:
        raise challenge_expired()  # no recovery codes exist before 2FA is set up
    now = datetime.now(UTC)
    outcome: PlatformSignedIn | AppError = recovery_code_invalid()

    async with platform_transaction() as session:
        admin = await repository.get_admin(session, claim.admin_id, lock=True)
        if admin is None or not admin.active or admin.totp_secret_enc is None:
            raise challenge_expired()
        if admin.totp_locked_until is not None and admin.totp_locked_until > now:
            raise too_many_attempts()
        normalised = normalise_recovery_code(recovery_code)
        code = (
            await repository.get_usable_recovery_code(session, admin.id, hash_token(normalised))
            if normalised
            else None
        )
        if code is None:
            error = await _wrong_code(session, admin, now, client, "platform.recovery_code_failed")
            outcome = recovery_code_invalid() if error.code == "code_invalid" else error
        else:
            code.used_at = now
            admin.totp_failed_attempts = 0
            admin.totp_locked_until = None
            admin.last_login_at = now
            expires_at = now + timedelta(days=get_settings().refresh_token_days)
            row, response, token = await _start_session(
                session, admin, family_id=uuid7(), expires_at=expires_at, now=now, client=client
            )
            left, _ = await repository.usable_recovery_codes(session, admin.id)
            await audit.record(
                session,
                lab_id=None,
                actor_type=ActorType.PLATFORM_ADMIN,
                actor_id=admin.id,
                action="platform.sign_in_recovery_code",
                entity="platform_session",
                entity_id=row.id,
                after={"recovery_codes_left": left},
                ip=client.ip,
            )
            response = response.model_copy(update={"recovery_codes_left": left})
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


async def require_live_session(claims: PlatformClaims) -> None:
    """A console token is honoured only while its admin is active and its session is
    live, so deactivating someone (or signing out everywhere) takes effect at once,
    not when their 15-minute token runs out."""
    async with platform_transaction() as session:
        admin = await repository.get_admin(session, claims.admin_id)
        live = await repository.get_live_session(session, claims.session_id)
    if admin is None or not admin.active or live is None or live.admin_id != admin.id:
        raise session_ended()


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


# ── Platform team (decision 019) ─────────────────────────────────────────
# Super-admins invite, deactivate and reset each other. Two rules keep the platform
# reachable: nobody acts on themselves here (My account is for that), and the last
# active super-admin can't be deactivated. The CLI stays the break-glass way in.
def admin_not_found() -> AppError:
    return AppError(404, "admin_not_found", "That super-admin doesn't exist.")


def not_on_yourself() -> AppError:
    return AppError(
        409, "not_on_yourself", "You can't do this to your own account. Ask another super-admin."
    )


def invite_invalid() -> AppError:
    return AppError(
        400,
        "link_invalid",
        "This link has expired or was already used. Ask a super-admin for a new one.",
    )


def _status(admin: PlatformAdmin) -> AdminStatusName:
    if not admin.active:
        return "deactivated"
    return "invited" if admin.password_hash is None else "active"


def _member(
    admin: PlatformAdmin, inviter: str | None, invite_expires: datetime | None
) -> TeamMemberResponse:
    return TeamMemberResponse(
        id=admin.id,
        full_name=admin.full_name,
        email=admin.email,
        status=_status(admin),
        two_factor=admin.totp_secret_enc is not None,
        last_login_at=admin.last_login_at,
        created_at=admin.created_at,
        invited_by_name=inviter,
        deactivated_at=admin.deactivated_at,
        invite_expires_at=invite_expires if admin.active and admin.password_hash is None else None,
    )


async def _load_member(session: AsyncSession, admin_id: UUID) -> TeamMemberResponse:
    rows = await repository.list_admins_with_inviter(session, admin_id)
    if not rows:
        raise admin_not_found()
    return _member(*rows[0])


def invite_link(token: str) -> str:
    # In the #fragment, never sent to a server (decision 015).
    return f"{get_settings().public_web_url}/console/accept-invite#token={token}"


async def _new_invite(session: AsyncSession, admin_id: UUID, created_by: UUID) -> str:
    token, token_hash = new_refresh_token()  # 256 random bits, stored hashed
    await repository.add_invite(
        session,
        PlatformInvite(
            id=uuid7(),
            admin_id=admin_id,
            created_by=created_by,
            token_hash=token_hash,
            expires_at=datetime.now(UTC) + timedelta(hours=INVITE_HOURS),
        ),
    )
    return invite_link(token)


async def list_team() -> list[TeamMemberResponse]:
    async with platform_transaction() as session:
        return [_member(*row) for row in await repository.list_admins_with_inviter(session)]


async def get_team_member(admin_id: UUID) -> TeamMemberResponse:
    async with platform_transaction() as session:
        return await _load_member(session, admin_id)


async def invite_admin(
    claims: PlatformClaims, body: InviteAdminRequest, key: str | None, client: ClientInfo
) -> InviteAdminResponse | dict[str, Any]:
    email = staff.normalise_email(body.email)

    async def action() -> tuple[InviteAdminResponse, dict[str, Any]]:
        if await repository.get_admin_by_email(session, email) is not None:
            raise AppError(
                409, "email_taken", "A super-admin with that email already exists.", "email"
            )
        admin = await repository.add_admin(
            session,
            PlatformAdmin(
                id=uuid7(),
                email=email,
                full_name=body.full_name.strip(),
                password_hash=None,
                invited_by=claims.admin_id,
            ),
        )
        url = await _new_invite(session, admin.id, claims.admin_id)
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=claims.admin_id,
            action="platform.admin_invited",
            entity="platform_admin",
            entity_id=admin.id,
            after={"email": email, "full_name": admin.full_name},
            ip=client.ip,
        )
        response = InviteAdminResponse(admin=await _load_member(session, admin.id), invite_url=url)
        # The stored replay leaves the link out: the raw token exists only once.
        stored = response.model_copy(update={"invite_url": None}).model_dump(mode="json")
        return response, stored

    async with platform_transaction() as session:
        try:
            return await _idempotent(
                session,
                claims.admin_id,
                key,
                request_hash(["invite", email, body.full_name.strip()]),
                action,
            )
        except IntegrityError as error:  # two invites for the same email at once
            raise AppError(
                409, "email_taken", "A super-admin with that email already exists.", "email"
            ) from error


async def resend_invite(
    claims: PlatformClaims, admin_id: UUID, key: str | None, client: ClientInfo
) -> InviteLinkResponse | dict[str, Any]:
    """A fresh link for someone who hasn't accepted yet; the old link stops working."""

    async def action() -> tuple[InviteLinkResponse, dict[str, Any]]:
        admin = await repository.get_admin(session, admin_id, lock=True)
        if admin is None:
            raise admin_not_found()
        if _status(admin) != "invited":
            raise AppError(
                409, "not_invited", "Only someone still waiting on their invite gets a new link."
            )
        await repository.revoke_open_invites(session, admin.id, datetime.now(UTC))
        url = await _new_invite(session, admin.id, claims.admin_id)
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=claims.admin_id,
            action="platform.admin_invite_resent",
            entity="platform_admin",
            entity_id=admin.id,
            ip=client.ip,
        )
        return InviteLinkResponse(invite_url=url), {"invite_url": None}

    async with platform_transaction() as session:
        return await _idempotent(
            session, claims.admin_id, key, request_hash(["resend", str(admin_id)]), action
        )


async def set_admin_active(
    claims: PlatformClaims,
    admin_id: UUID,
    active: bool,
    reason: str,
    key: str | None,
    client: ClientInfo,
) -> TeamMemberResponse | dict[str, Any]:
    """Deactivate: their sessions and any open invite end at once; nothing is deleted.
    Reactivate: they can sign in again with their own password and 2FA."""
    if admin_id == claims.admin_id:
        raise not_on_yourself()

    async def action() -> tuple[TeamMemberResponse, dict[str, Any]]:
        now = datetime.now(UTC)
        signers = await repository.lock_active_admins(session)
        admin = await repository.get_admin(session, admin_id, lock=True)
        if admin is None:
            raise admin_not_found()
        if admin.active != active:
            if not active:
                if [a.id for a in signers] == [admin.id]:  # pragma: no cover: you're active too
                    raise AppError(409, "last_admin", "The last active super-admin stays active.")
                admin.active = False
                admin.deactivated_at = now
                await repository.revoke_admin_sessions(session, admin.id, now)
                await repository.revoke_open_invites(session, admin.id, now)
            else:
                admin.active = True
                admin.deactivated_at = None
            await audit.record(
                session,
                lab_id=None,
                actor_type=ActorType.PLATFORM_ADMIN,
                actor_id=claims.admin_id,
                action="platform.admin_reactivated" if active else "platform.admin_deactivated",
                entity="platform_admin",
                entity_id=admin.id,
                after={"reason": reason.strip()},
                ip=client.ip,
            )
        response = await _load_member(session, admin.id)
        return response, response.model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(
            session,
            claims.admin_id,
            key,
            request_hash(["active", str(admin_id), active, reason]),
            action,
        )


async def reset_admin_2fa(
    claims: PlatformClaims, admin_id: UUID, reason: str, key: str | None, client: ClientInfo
) -> TeamMemberResponse | dict[str, Any]:
    """For a lost phone: their 2FA is cleared and their sessions end. Their next sign-in
    asks for their password, then shows a new QR code. Never on yourself."""
    if admin_id == claims.admin_id:
        raise not_on_yourself()

    async def action() -> tuple[TeamMemberResponse, dict[str, Any]]:
        now = datetime.now(UTC)
        admin = await repository.get_admin(session, admin_id, lock=True)
        if admin is None:
            raise admin_not_found()
        if _status(admin) != "active":
            raise AppError(409, "not_active", "Only an active super-admin's 2FA can be reset.")
        admin.totp_secret_enc = None
        admin.totp_last_step = None
        admin.totp_failed_attempts = 0
        admin.totp_locked_until = None
        await repository.revoke_admin_sessions(session, admin.id, now)
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=claims.admin_id,
            action="platform.admin_2fa_reset",
            entity="platform_admin",
            entity_id=admin.id,
            after={"reason": reason.strip()},
            ip=client.ip,
        )
        response = await _load_member(session, admin.id)
        return response, response.model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(
            session, claims.admin_id, key, request_hash(["reset2fa", str(admin_id), reason]), action
        )


# ── Accepting an invite (public: the link is the proof) ──────────────────
async def _usable_invite(session: AsyncSession, token: str) -> tuple[PlatformInvite, PlatformAdmin]:
    invite = await repository.get_invite_by_hash(session, hash_token(token))
    now = datetime.now(UTC)
    if invite is None or invite.used_at or invite.revoked_at or invite.expires_at <= now:
        raise invite_invalid()
    admin = await repository.get_admin(session, invite.admin_id, lock=True)
    if admin is None or _status(admin) != "invited":
        raise invite_invalid()
    return invite, admin


async def check_invite(token: str) -> InviteInfoResponse:
    async with platform_transaction() as session:
        _, admin = await _usable_invite(session, token)
        return InviteInfoResponse(full_name=admin.full_name, email=admin.email)


async def accept_invite(token: str, password: str, client: ClientInfo) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise AppError(
            422,
            "password_too_short",
            f"Use at least {MIN_PASSWORD_LENGTH} characters. A short sentence works well.",
            "password",
        )
    async with platform_transaction() as session:
        invite, admin = await _usable_invite(session, token)
        if password.strip().lower() == admin.email:
            raise AppError(
                422, "password_is_email", "Choose a password that isn't your email.", "password"
            )
        admin.password_hash = hash_password(password)
        invite.used_at = datetime.now(UTC)
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=admin.id,
            action="platform.admin_invite_accepted",
            entity="platform_admin",
            entity_id=admin.id,
            ip=client.ip,
        )


# ── My account (decision 023) ────────────────────────────────────────────
# Your own account, behind proof that it's you: the current password for everything,
# plus a code from the phone when the change touches how you sign in. The session
# alone is never enough, so a stolen or unattended session can't take the account.
async def _replayed(admin_id: UUID, key: str | None, fingerprint: str) -> dict[str, Any] | None:
    """A finished request retried with the same key gets its stored answer straight
    away, before the password and code are checked again (the code is spent by then)."""
    if key is None:
        return None
    async with platform_transaction() as session:
        stored = await repository.get_idempotent_response(session, admin_id, key)
    if stored is None:
        return None
    if stored.request_hash != fingerprint:
        raise AppError(
            422,
            "idempotency_key_reused",
            "This request key was already used for a different request.",
        )
    return stored.response_body


async def _prove_identity(
    claims: PlatformClaims,
    password: str,
    client: ClientInfo,
    *,
    code: str | None = None,
    error_field: str = "password",
) -> None:
    """Check the password (and the code, when given) in a transaction of its own, so a
    failure is audited and counted even though the request is refused. Wrong passwords
    count toward the same 5-try lock as wrong codes: an unattended, signed-in laptop
    can't be used to guess the password."""
    now = datetime.now(UTC)
    error: AppError | None = None
    async with platform_transaction() as session:
        admin = await repository.get_admin(session, claims.admin_id, lock=True)
        if admin is None or not admin.active:
            raise session_ended()
        if admin.totp_locked_until is not None and admin.totp_locked_until > now:
            raise too_many_attempts()
        if not verify_password(admin.password_hash, password):
            counted = await _wrong_code(
                session, admin, now, client, "platform.account_password_failed"
            )
            error = (
                counted
                if counted.code == "too_many_attempts"
                else AppError(
                    401, "wrong_password", "That isn't your current password.", error_field
                )
            )
        elif code is not None:
            secret = decrypt_secret(admin.totp_secret_enc) if admin.totp_secret_enc else None
            step = verify_totp(secret, code, admin.totp_last_step) if secret else None
            if step is None:
                error = await _wrong_code(session, admin, now, client, "platform.code_failed")
            else:
                admin.totp_last_step = step  # spent: this code can't be used again
                admin.totp_failed_attempts = 0
                admin.totp_locked_until = None
    if error is not None:
        raise error


async def _current_family(session: AsyncSession, claims: PlatformClaims) -> UUID:
    current = await repository.get_session(session, claims.session_id)
    if current is None or current.revoked_at is not None:
        raise session_ended()
    return current.family_id


async def _account(session: AsyncSession, claims: PlatformClaims) -> AccountResponse:
    now = datetime.now(UTC)
    admin = await repository.get_admin(session, claims.admin_id)
    if admin is None or not admin.active:
        raise session_ended()
    family = await _current_family(session, claims)
    left, created = await repository.usable_recovery_codes(session, admin.id)
    devices = await repository.live_sessions(session, admin.id, now)
    return AccountResponse(
        id=admin.id,
        full_name=admin.full_name,
        email=admin.email,
        created_at=admin.created_at,
        last_login_at=admin.last_login_at,
        password_changed_at=admin.password_changed_at,
        two_factor=admin.totp_secret_enc is not None,
        recovery_codes_left=left,
        recovery_codes_created_at=created if left else None,
        sessions=[
            AccountSessionResponse(
                id=row.id,
                user_agent=row.user_agent,
                signed_in_at=signed_in_at,
                last_used_at=row.last_used_at,
                current=row.family_id == family,
            )
            for row, signed_in_at in devices
        ],
    )


async def get_account(claims: PlatformClaims) -> AccountResponse:
    async with platform_transaction() as session:
        return await _account(session, claims)


async def change_password(
    claims: PlatformClaims,
    current_password: str,
    new_password: str,
    key: str | None,
    client: ClientInfo,
) -> AccountResponse | dict[str, Any]:
    """New password; every OTHER device is signed out (this one stays). Neither password
    goes into the idempotency record."""
    fingerprint = request_hash(["change_password"])
    replay = await _replayed(claims.admin_id, key, fingerprint)
    if replay is not None:
        return replay
    if len(new_password) < MIN_PASSWORD_LENGTH:
        raise AppError(
            422,
            "password_too_short",
            f"Use at least {MIN_PASSWORD_LENGTH} characters. A short sentence works well.",
            "new_password",
        )
    if new_password == current_password:
        raise AppError(
            422, "password_unchanged", "Choose a password you haven't been using.", "new_password"
        )
    await _prove_identity(claims, current_password, client, error_field="current_password")

    async def action() -> tuple[AccountResponse, dict[str, Any]]:
        now = datetime.now(UTC)
        admin = await repository.get_admin(session, claims.admin_id, lock=True)
        if admin is None:  # pragma: no cover: checked a moment ago
            raise session_ended()
        if new_password.strip().lower() == admin.email:
            raise AppError(
                422, "password_is_email", "Choose a password that isn't your email.", "new_password"
            )
        admin.password_hash = hash_password(new_password)
        admin.password_changed_at = now
        family = await _current_family(session, claims)
        ended = await repository.revoke_other_sessions(session, admin.id, family, now)
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=admin.id,
            action="platform.password_changed",
            entity="platform_admin",
            entity_id=admin.id,
            after={"other_sessions_ended": ended},
            ip=client.ip,
        )
        response = await _account(session, claims)
        return response, response.model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(session, claims.admin_id, key, fingerprint, action)


async def sign_out_others(
    claims: PlatformClaims, key: str | None, client: ClientInfo
) -> SessionsEndedResponse | dict[str, Any]:
    """Every other device is signed out at once (decision 019's live-session check)."""

    async def action() -> tuple[SessionsEndedResponse, dict[str, Any]]:
        now = datetime.now(UTC)
        family = await _current_family(session, claims)
        ended = await repository.revoke_other_sessions(session, claims.admin_id, family, now)
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=claims.admin_id,
            action="platform.signed_out_elsewhere",
            entity="platform_admin",
            entity_id=claims.admin_id,
            after={"ended": ended},
            ip=client.ip,
        )
        response = SessionsEndedResponse(ended=ended)
        return response, response.model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(
            session, claims.admin_id, key, request_hash(["sign_out_others"]), action
        )


async def create_recovery_codes(
    claims: PlatformClaims, password: str, code: str, key: str | None, client: ClientInfo
) -> RecoveryCodesResponse | dict[str, Any]:
    """Ten new single-use codes, shown once; any older unused codes stop working."""
    fingerprint = request_hash(["recovery_codes"])
    replay = await _replayed(claims.admin_id, key, fingerprint)
    if replay is not None:
        return replay
    await _prove_identity(claims, password, client, code=code)

    async def action() -> tuple[RecoveryCodesResponse, dict[str, Any]]:
        now = datetime.now(UTC)
        await repository.revoke_recovery_codes(session, claims.admin_id, now)
        codes = [new_recovery_code() for _ in range(RECOVERY_CODE_COUNT)]
        await repository.add_recovery_codes(
            session,
            [
                PlatformRecoveryCode(
                    id=uuid7(),
                    admin_id=claims.admin_id,
                    code_hash=hash_token(normalise_recovery_code(c) or ""),
                    created_at=now,
                )
                for c in codes
            ],
        )
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=claims.admin_id,
            action="platform.recovery_codes_created",
            entity="platform_admin",
            entity_id=claims.admin_id,
            after={"count": RECOVERY_CODE_COUNT},
            ip=client.ip,
        )
        response = RecoveryCodesResponse(codes=codes, created_at=now)
        # The stored replay leaves the codes out: they exist only once, in this answer.
        return response, response.model_copy(update={"codes": None}).model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(session, claims.admin_id, key, fingerprint, action)


async def start_new_authenticator(
    claims: PlatformClaims, password: str, client: ClientInfo
) -> NewAuthenticatorResponse:
    """Step 1 of moving 2FA to a new phone: the password only (the old phone may be
    gone, and this session may have begun with a recovery code). Nothing changes yet."""
    await _prove_identity(claims, password, client)
    async with platform_transaction() as session:
        admin = await repository.get_admin(session, claims.admin_id)
    if admin is None:  # pragma: no cover: checked a moment ago
        raise session_ended()
    secret = new_totp_secret()
    uri, image = totp_provisioning(secret, admin.email)
    return NewAuthenticatorResponse(
        challenge=create_rebind_challenge(claims, encrypt_secret(secret)),
        setup=TotpSetup(secret=secret, otpauth_uri=uri, qr_image=image),
    )


def setup_expired() -> AppError:
    return AppError(401, "challenge_expired", "Setting up took too long. Start again.")


async def confirm_new_authenticator(
    claims: PlatformClaims, challenge: str, code: str, key: str | None, client: ClientInfo
) -> SessionsEndedResponse | dict[str, Any]:
    """Step 2: a code from the NEW phone switches 2FA over. The old phone stops working
    and every other device is signed out. Recovery codes stay valid."""
    claim = decode_rebind_challenge(challenge)
    if claim is None or claim.admin_id != claims.admin_id or claim.session_id != claims.session_id:
        raise setup_expired()
    fingerprint = request_hash(["new_authenticator", hash_token(challenge)])
    replay = await _replayed(claims.admin_id, key, fingerprint)
    if replay is not None:
        return replay

    now = datetime.now(UTC)
    error: AppError | None = None
    step: int | None = None
    async with platform_transaction() as session:
        admin = await repository.get_admin(session, claims.admin_id, lock=True)
        if admin is None or not admin.active:
            raise session_ended()
        if admin.totp_locked_until is not None and admin.totp_locked_until > now:
            raise too_many_attempts()
        secret = decrypt_secret(claim.pending_secret_enc)
        # Already switched by this same challenge: the code it used can't be sent again.
        last = admin.totp_last_step if admin.totp_secret_enc == claim.pending_secret_enc else None
        step = verify_totp(secret, code, last) if secret else None
        if step is None:
            error = await _wrong_code(session, admin, now, client, "platform.code_failed")
    if error is not None:
        raise error

    async def action() -> tuple[SessionsEndedResponse, dict[str, Any]]:
        admin = await repository.get_admin(session, claims.admin_id, lock=True)
        if admin is None:  # pragma: no cover: checked a moment ago
            raise session_ended()
        admin.totp_secret_enc = claim.pending_secret_enc
        admin.totp_last_step = step
        admin.totp_failed_attempts = 0
        admin.totp_locked_until = None
        family = await _current_family(session, claims)
        ended = await repository.revoke_other_sessions(session, admin.id, family, now)
        await audit.record(
            session,
            lab_id=None,
            actor_type=ActorType.PLATFORM_ADMIN,
            actor_id=admin.id,
            action="platform.2fa_moved",
            entity="platform_admin",
            entity_id=admin.id,
            after={"other_sessions_ended": ended},
            ip=client.ip,
        )
        response = SessionsEndedResponse(ended=ended)
        return response, response.model_dump(mode="json")

    async with platform_transaction() as session:
        return await _idempotent(session, claims.admin_id, key, fingerprint, action)
