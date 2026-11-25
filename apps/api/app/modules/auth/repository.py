from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthSession

# Every query runs inside a lab-scoped transaction: RLS adds the lab filter, so a
# refresh token from another lab is simply not found.


async def add_session(session: AsyncSession, row: AuthSession) -> AuthSession:
    session.add(row)
    await session.flush()
    return row


async def get_by_token_hash(session: AsyncSession, token_hash: str) -> AuthSession | None:
    # FOR UPDATE: two refreshes with the same token are handled one after the other,
    # so the second one sees the first one's rotation (reuse detection).
    return await session.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == token_hash).with_for_update()
    )


async def revoke_family(session: AsyncSession, family_id: UUID, at: datetime) -> None:
    await session.execute(
        update(AuthSession)
        .where(AuthSession.family_id == family_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=at)
    )
