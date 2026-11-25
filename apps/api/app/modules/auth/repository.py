from datetime import datetime
from uuid import UUID

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import uuid7
from app.modules.auth.models import AuthSession, AuthToken, TokenPurpose

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


async def insert_token(
    session: AsyncSession,
    *,
    lab_id: UUID,
    user_id: UUID,
    purpose: TokenPurpose,
    token_hash: str,
    expires_at: datetime,
) -> None:
    # No RETURNING: the console's role may create tokens but not read them.
    await session.execute(
        insert(AuthToken).values(
            id=uuid7(),
            lab_id=lab_id,
            user_id=user_id,
            purpose=purpose,
            token_hash=token_hash,
            expires_at=expires_at,
        )
    )


async def get_token_by_hash(session: AsyncSession, token_hash: str) -> AuthToken | None:
    return await session.scalar(
        select(AuthToken).where(AuthToken.token_hash == token_hash).with_for_update()
    )
