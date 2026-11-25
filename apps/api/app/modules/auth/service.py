"""Auth: sign in, refresh, sign out (ARCHITECTURE.md §9, decision 013).

The lab comes from the sign-in page's address only at sign-in and refresh, where no
token exists yet. It is checked against the database (the refresh token must belong
to that lab under RLS). Every other request takes `lab_id` from the signed token.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import lab_transaction, set_current_lab, transaction
from app.core.errors import AppError
from app.core.ids import uuid7
from app.core.security import (
    AccessClaims,
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    password_needs_rehash,
    verify_password,
)
from app.modules.audit import service as audit
from app.modules.audit.models import ActorType
from app.modules.auth import repository
from app.modules.auth.models import AuthSession, AuthToken, TokenPurpose
from app.modules.staff import service as staff
from app.modules.staff.service import StaffAccount
from app.modules.tenants import service as tenants
from app.modules.tenants.repository import PublicLab


@dataclass(frozen=True)
class ClientInfo:
    ip: str | None
    user_agent: str | None


@dataclass(frozen=True)
class SignedIn:
    access_token: str
    expires_in_seconds: int
    refresh_token: str
    refresh_expires_at: datetime
    account: StaffAccount
    lab: PublicLab


def invalid_credentials() -> AppError:
    return AppError(
        401,
        "invalid_credentials",
        "That email and password don't match. Try again or reset your password.",
    )


def session_ended() -> AppError:
    return AppError(401, "session_ended", "Your session has ended. Sign in again.")


async def _issue(
    session: AsyncSession,
    *,
    lab: PublicLab,
    account: StaffAccount,
    family_id: UUID,
    expires_at: datetime,
    now: datetime,
    client: ClientInfo,
) -> tuple[AuthSession, SignedIn]:
    token, token_hash = new_refresh_token()
    row = await repository.add_session(
        session,
        AuthSession(
            id=uuid7(),
            lab_id=lab.id,
            user_id=account.id,
            family_id=family_id,
            refresh_token_hash=token_hash,
            user_agent=client.user_agent,
            ip=client.ip,
            last_used_at=now,
            expires_at=expires_at,
        ),
    )
    claims = AccessClaims(
        user_id=account.id,
        lab_id=lab.id,
        session_id=row.id,
        roles=tuple(account.roles),
        sections=tuple(account.sections),
    )
    signed_in = SignedIn(
        access_token=create_access_token(claims, now),
        expires_in_seconds=get_settings().access_token_minutes * 60,
        refresh_token=token,
        refresh_expires_at=expires_at,
        account=account,
        lab=lab,
    )
    return row, signed_in


async def sign_in(lab_slug: str, email: str, password: str, client: ClientInfo) -> SignedIn:
    now = datetime.now(UTC)
    result: SignedIn | None = None

    async with transaction() as session:
        lab = await tenants.find_active_lab(session, lab_slug)
        await set_current_lab(session, lab.id)
        account = await staff.find_account_by_email(session, email)
        usable = account is not None and account.is_active and account.password_hash is not None
        # Always run the slow hash check, even for unknown emails (timing stays equal).
        password_ok = verify_password(
            account.password_hash if account and usable else None, password
        )

        if account is not None and usable and password_ok:
            family_id = uuid7()
            expires_at = now + timedelta(days=get_settings().refresh_token_days)
            row, result = await _issue(
                session,
                lab=lab,
                account=account,
                family_id=family_id,
                expires_at=expires_at,
                now=now,
                client=client,
            )
            stored_hash = account.password_hash or ""
            rehash = hash_password(password) if password_needs_rehash(stored_hash) else None
            await staff.record_sign_in(session, account.id, now, rehash)
            await audit.record(
                session,
                lab_id=lab.id,
                actor_type=ActorType.USER,
                actor_id=account.id,
                action="auth.sign_in",
                entity="session",
                entity_id=row.id,
                ip=client.ip,
            )
        else:
            # Committed with the transaction even though sign-in fails: the record of
            # failed attempts is what later lockout notices are built on.
            await audit.record(
                session,
                lab_id=lab.id,
                actor_type=ActorType.USER if account else ActorType.SYSTEM,
                actor_id=account.id if account else None,
                action="auth.sign_in_failed",
                entity="user",
                entity_id=account.id if account else None,
                after={"email": staff.normalise_email(email)},
                ip=client.ip,
            )

    if result is None:
        raise invalid_credentials()
    return result


def _expired(row: AuthSession, now: datetime) -> bool:
    idle_limit = timedelta(hours=get_settings().session_idle_hours)
    return now >= row.expires_at or now - row.last_used_at > idle_limit


async def refresh(lab_slug: str, refresh_token: str, client: ClientInfo) -> SignedIn:
    """Swap a refresh token for a new pair. The old one stops working at once."""
    now = datetime.now(UTC)
    result: SignedIn | None = None

    async with transaction() as session:
        lab = await tenants.find_active_lab(session, lab_slug)
        await set_current_lab(session, lab.id)
        current = await repository.get_by_token_hash(session, hash_token(refresh_token))

        if current is None:
            pass
        elif current.revoked_at is not None:
            if current.replaced_by is not None:
                # An already-rotated token came back: someone has a copy. End the
                # whole family so neither the thief nor the victim keeps a session.
                await repository.revoke_family(session, current.family_id, now)
                await audit.record(
                    session,
                    lab_id=lab.id,
                    actor_type=ActorType.SYSTEM,
                    actor_id=None,
                    action="auth.refresh_token_reused",
                    entity="session",
                    entity_id=current.id,
                    ip=client.ip,
                )
        elif _expired(current, now):
            current.revoked_at = now
        else:
            account = await staff.get_account(session, current.user_id)
            if account is not None and account.is_active:
                row, result = await _issue(
                    session,
                    lab=lab,
                    account=account,
                    family_id=current.family_id,
                    expires_at=current.expires_at,  # rotation never extends the 7 days
                    now=now,
                    client=client,
                )
                current.revoked_at = now
                current.replaced_by = row.id
            else:
                current.revoked_at = now

    if result is None:
        raise session_ended()
    return result


async def sign_out(lab_slug: str, refresh_token: str | None, client: ClientInfo) -> None:
    """End this device's session. Always succeeds from the caller's point of view."""
    if not refresh_token:
        return
    try:
        async with transaction() as session:
            lab = await tenants.find_public_lab(session, lab_slug)
            await set_current_lab(session, lab.id)
            current = await repository.get_by_token_hash(session, hash_token(refresh_token))
            if current is None or current.revoked_at is not None:
                return
            now = datetime.now(UTC)
            await repository.revoke_family(session, current.family_id, now)
            await audit.record(
                session,
                lab_id=lab.id,
                actor_type=ActorType.USER,
                actor_id=current.user_id,
                action="auth.sign_out",
                entity="session",
                entity_id=current.id,
                ip=client.ip,
            )
    except AppError:
        return  # unknown lab: nothing to sign out of


async def get_me(claims: AccessClaims) -> StaffAccount:
    async with lab_transaction(claims.lab_id) as session:
        account = await staff.get_account(session, claims.user_id)
    if account is None or not account.is_active:
        raise session_ended()
    return account


# ── Invite and reset links (FLOWS.md §1, §10) ─────────────────────────────
INVITE_HOURS = 72
MIN_PASSWORD_LENGTH = 12


def link_invalid() -> AppError:
    return AppError(
        400,
        "link_invalid",
        "This link has expired or was already used. Ask your lab manager for a new one.",
    )


def link_url(lab_slug: str, token: str) -> str:
    # The token rides in the #fragment: browsers never send it to any server, so it
    # can't land in access logs, proxies or Referer headers. The page reads it locally.
    return f"{get_settings().public_web_url}/l/{lab_slug}/set-password#token={token}"


async def create_invite(
    session: AsyncSession, *, lab_id: UUID, lab_slug: str, user_id: UUID
) -> str:
    """A single-use, 72-hour invite link. Called inside the caller's transaction."""
    token, token_hash = new_refresh_token()  # 256 random bits, stored hashed
    await repository.insert_token(
        session,
        lab_id=lab_id,
        user_id=user_id,
        purpose=TokenPurpose.INVITE,
        token_hash=token_hash,
        expires_at=datetime.now(UTC) + timedelta(hours=INVITE_HOURS),
    )
    return link_url(lab_slug, token)


@dataclass(frozen=True)
class LinkInfo:
    purpose: TokenPurpose
    full_name: str
    email: str
    lab_name: str


async def _usable_token(session: AsyncSession, token: str) -> AuthToken:
    row = await repository.get_token_by_hash(session, hash_token(token))
    if row is None or row.used_at is not None or row.expires_at <= datetime.now(UTC):
        raise link_invalid()
    return row


async def check_link(lab_slug: str, token: str) -> LinkInfo:
    async with transaction() as session:
        lab = await tenants.find_active_lab(session, lab_slug)
        await set_current_lab(session, lab.id)
        row = await _usable_token(session, token)
        account = await staff.get_account(session, row.user_id)
        if account is None:
            raise link_invalid()
        return LinkInfo(
            purpose=row.purpose, full_name=account.full_name, email=account.email, lab_name=lab.name
        )


async def set_password(lab_slug: str, token: str, password: str, client: ClientInfo) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise AppError(
            422,
            "password_too_short",
            f"Use at least {MIN_PASSWORD_LENGTH} characters. A short sentence works well.",
            "password",
        )
    async with transaction() as session:
        lab = await tenants.find_active_lab(session, lab_slug)
        await set_current_lab(session, lab.id)
        row = await _usable_token(session, token)
        account = await staff.get_account(session, row.user_id)
        if account is None:
            raise link_invalid()
        if password.strip().lower() == account.email:
            raise AppError(
                422, "password_is_email", "Choose a password that isn't your email.", "password"
            )
        now = datetime.now(UTC)
        await staff.activate(session, account.id, hash_password(password))
        row.used_at = now
        await audit.record(
            session,
            lab_id=lab.id,
            actor_type=ActorType.USER,
            actor_id=account.id,
            action=f"auth.password_set.{row.purpose.value}",
            entity="user",
            entity_id=account.id,
            ip=client.ip,
        )
