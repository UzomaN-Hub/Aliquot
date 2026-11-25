from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import Section
from app.modules.staff.models import Role, User, UserRole, UserSection

# Every query here runs inside a lab-scoped transaction: RLS adds the lab filter.


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(select(User).where(User.email == email))


async def get_user(session: AsyncSession, user_id: UUID) -> User | None:
    return await session.get(User, user_id)


async def get_roles(session: AsyncSession, user_id: UUID) -> list[Role]:
    rows = await session.scalars(
        select(UserRole.role).where(UserRole.user_id == user_id).order_by(UserRole.role)
    )
    return list(rows)


async def get_sections(session: AsyncSession, user_id: UUID) -> list[Section]:
    rows = await session.scalars(
        select(UserSection.section)
        .where(UserSection.user_id == user_id)
        .order_by(UserSection.section)
    )
    return list(rows)


async def set_signed_in(
    session: AsyncSession, user_id: UUID, at: datetime, new_password_hash: str | None
) -> None:
    values: dict[str, object] = {"last_login_at": at}
    if new_password_hash is not None:
        values["password_hash"] = new_password_hash
    await session.execute(update(User).where(User.id == user_id).values(**values))
