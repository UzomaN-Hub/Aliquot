from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.modules.platform.models import (
    PlatformAdmin,
    PlatformIdempotencyKey,
    PlatformInvite,
    PlatformRecoveryCode,
    PlatformSession,
)

# Runs inside platform_transaction() (role aliquot_platform).


async def get_admin_by_email(session: AsyncSession, email: str) -> PlatformAdmin | None:
    return await session.scalar(select(PlatformAdmin).where(PlatformAdmin.email == email))


async def get_admin(
    session: AsyncSession, admin_id: UUID, *, lock: bool = False
) -> PlatformAdmin | None:
    query = select(PlatformAdmin).where(PlatformAdmin.id == admin_id)
    if lock:
        query = query.with_for_update()
    return await session.scalar(query)


async def add_session(session: AsyncSession, row: PlatformSession) -> PlatformSession:
    session.add(row)
    await session.flush()
    return row


async def get_session_by_token_hash(
    session: AsyncSession, token_hash: str
) -> PlatformSession | None:
    return await session.scalar(
        select(PlatformSession)
        .where(PlatformSession.refresh_token_hash == token_hash)
        .with_for_update()
    )


async def revoke_family(session: AsyncSession, family_id: UUID, at: datetime) -> None:
    await session.execute(
        update(PlatformSession)
        .where(PlatformSession.family_id == family_id, PlatformSession.revoked_at.is_(None))
        .values(revoked_at=at)
    )


async def get_idempotent_response(
    session: AsyncSession, admin_id: UUID, key: str
) -> PlatformIdempotencyKey | None:
    return await session.get(PlatformIdempotencyKey, (admin_id, key))


async def save_idempotent_response(
    session: AsyncSession,
    admin_id: UUID,
    key: str,
    request_hash: str,
    status: int,
    body: dict[str, Any],
) -> None:
    session.add(
        PlatformIdempotencyKey(
            admin_id=admin_id,
            key=key,
            request_hash=request_hash,
            response_status=status,
            response_body=body,
        )
    )
    await session.flush()


# ── Team ─────────────────────────────────────────────────────────────────
async def list_admins_with_inviter(
    session: AsyncSession, admin_id: UUID | None = None
) -> list[tuple[PlatformAdmin, str | None, datetime | None]]:
    """Each admin with who invited them and when their open invite expires (if any)."""
    inviter = aliased(PlatformAdmin)
    open_invite = (
        select(func.max(PlatformInvite.expires_at))
        .where(
            PlatformInvite.admin_id == PlatformAdmin.id,
            PlatformInvite.used_at.is_(None),
            PlatformInvite.revoked_at.is_(None),
        )
        .correlate(PlatformAdmin)
        .scalar_subquery()
    )
    query = (
        select(PlatformAdmin, inviter.full_name, open_invite)
        .outerjoin(inviter, inviter.id == PlatformAdmin.invited_by)
        .order_by(PlatformAdmin.created_at, PlatformAdmin.id)
    )
    if admin_id is not None:
        query = query.where(PlatformAdmin.id == admin_id)
    rows = await session.execute(query)
    return [(row[0], row[1], row[2]) for row in rows]


async def lock_active_admins(session: AsyncSession) -> list[PlatformAdmin]:
    """Every active admin who can sign in, locked: two people deactivating the last
    two admins at once must not both succeed."""
    return list(
        await session.scalars(
            select(PlatformAdmin)
            .where(PlatformAdmin.active.is_(True), PlatformAdmin.password_hash.is_not(None))
            .order_by(PlatformAdmin.id)
            .with_for_update()
        )
    )


async def add_admin(session: AsyncSession, row: PlatformAdmin) -> PlatformAdmin:
    session.add(row)
    await session.flush()
    return row


async def revoke_admin_sessions(session: AsyncSession, admin_id: UUID, at: datetime) -> int:
    result = await session.execute(
        update(PlatformSession)
        .where(PlatformSession.admin_id == admin_id, PlatformSession.revoked_at.is_(None))
        .values(revoked_at=at)
    )
    return int(getattr(result, "rowcount", 0) or 0)


async def get_live_session(session: AsyncSession, session_id: UUID) -> PlatformSession | None:
    return await session.scalar(
        select(PlatformSession).where(
            PlatformSession.id == session_id, PlatformSession.revoked_at.is_(None)
        )
    )


async def add_invite(session: AsyncSession, row: PlatformInvite) -> None:
    session.add(row)
    await session.flush()


async def revoke_open_invites(session: AsyncSession, admin_id: UUID, at: datetime) -> None:
    await session.execute(
        update(PlatformInvite)
        .where(
            PlatformInvite.admin_id == admin_id,
            PlatformInvite.used_at.is_(None),
            PlatformInvite.revoked_at.is_(None),
        )
        .values(revoked_at=at)
    )


async def get_invite_by_hash(session: AsyncSession, token_hash: str) -> PlatformInvite | None:
    return await session.scalar(
        select(PlatformInvite).where(PlatformInvite.token_hash == token_hash).with_for_update()
    )


# ── My account (decision 023) ────────────────────────────────────────────
async def live_sessions(
    session: AsyncSession, admin_id: UUID, now: datetime
) -> list[tuple[PlatformSession, datetime]]:
    """Each signed-in device (one live row per refresh family), with when that device
    first signed in. Most recently used first."""
    first = aliased(PlatformSession)
    signed_in_at = (
        select(func.min(first.created_at))
        .where(first.family_id == PlatformSession.family_id)
        .correlate(PlatformSession)
        .scalar_subquery()
    )
    rows = await session.execute(
        select(PlatformSession, signed_in_at)
        .where(
            PlatformSession.admin_id == admin_id,
            PlatformSession.revoked_at.is_(None),
            PlatformSession.expires_at > now,
        )
        .order_by(PlatformSession.last_used_at.desc())
    )
    return [(row[0], row[1]) for row in rows]


async def revoke_other_sessions(
    session: AsyncSession, admin_id: UUID, keep_family: UUID, at: datetime
) -> int:
    """End every session of this admin except the device asking (its refresh family)."""
    result = await session.execute(
        update(PlatformSession)
        .where(
            PlatformSession.admin_id == admin_id,
            PlatformSession.revoked_at.is_(None),
            PlatformSession.family_id != keep_family,
        )
        .values(revoked_at=at)
    )
    return int(getattr(result, "rowcount", 0) or 0)


async def get_session(session: AsyncSession, session_id: UUID) -> PlatformSession | None:
    return await session.get(PlatformSession, session_id)


async def usable_recovery_codes(
    session: AsyncSession, admin_id: UUID
) -> tuple[int, datetime | None]:
    """How many unused codes are left, and when the current set was made."""
    row = (
        await session.execute(
            select(func.count(), func.max(PlatformRecoveryCode.created_at)).where(
                PlatformRecoveryCode.admin_id == admin_id,
                PlatformRecoveryCode.used_at.is_(None),
                PlatformRecoveryCode.revoked_at.is_(None),
            )
        )
    ).one()
    return int(row[0]), row[1]


async def revoke_recovery_codes(session: AsyncSession, admin_id: UUID, at: datetime) -> None:
    await session.execute(
        update(PlatformRecoveryCode)
        .where(
            PlatformRecoveryCode.admin_id == admin_id,
            PlatformRecoveryCode.used_at.is_(None),
            PlatformRecoveryCode.revoked_at.is_(None),
        )
        .values(revoked_at=at)
    )


async def add_recovery_codes(session: AsyncSession, rows: list[PlatformRecoveryCode]) -> None:
    session.add_all(rows)
    await session.flush()


async def get_usable_recovery_code(
    session: AsyncSession, admin_id: UUID, code_hash: str
) -> PlatformRecoveryCode | None:
    return await session.scalar(
        select(PlatformRecoveryCode)
        .where(
            PlatformRecoveryCode.admin_id == admin_id,
            PlatformRecoveryCode.code_hash == code_hash,
            PlatformRecoveryCode.used_at.is_(None),
            PlatformRecoveryCode.revoked_at.is_(None),
        )
        .with_for_update()
    )
