from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.platform.models import PlatformAdmin, PlatformIdempotencyKey, PlatformSession

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
