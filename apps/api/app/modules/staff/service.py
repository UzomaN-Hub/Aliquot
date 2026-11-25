"""Staff: who works in a lab, with which roles and sections.

Other modules (auth) call these functions; they never touch staff tables directly.
All functions expect a lab-scoped transaction.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import Section
from app.core.ids import uuid7
from app.modules.staff import repository
from app.modules.staff.models import Role, UserStatus


@dataclass(frozen=True)
class StaffAccount:
    id: UUID
    lab_id: UUID
    full_name: str
    email: str
    password_hash: str | None
    is_active: bool
    roles: tuple[Role, ...]
    sections: tuple[Section, ...]


async def _account(
    session: AsyncSession, user_id: UUID | None, email: str | None
) -> StaffAccount | None:
    user = (
        await repository.get_user(session, user_id)
        if user_id is not None
        else await repository.get_user_by_email(session, email or "")
    )
    if user is None:
        return None
    return StaffAccount(
        id=user.id,
        lab_id=user.lab_id,
        full_name=user.full_name,
        email=user.email,
        password_hash=user.password_hash,
        is_active=user.status is UserStatus.ACTIVE,
        roles=tuple(await repository.get_roles(session, user.id)),
        sections=tuple(await repository.get_sections(session, user.id)),
    )


async def find_account_by_email(session: AsyncSession, email: str) -> StaffAccount | None:
    return await _account(session, None, normalise_email(email))


async def get_account(session: AsyncSession, user_id: UUID) -> StaffAccount | None:
    return await _account(session, user_id, None)


async def record_sign_in(
    session: AsyncSession, user_id: UUID, at: datetime, new_password_hash: str | None = None
) -> None:
    await repository.set_signed_in(session, user_id, at, new_password_hash)


def normalise_email(email: str) -> str:
    return email.strip().lower()


async def create_first_manager(
    session: AsyncSession, *, lab_id: UUID, full_name: str, email: str
) -> UUID:
    """A new lab's first Manager, status invited (no password until they set one).
    Called by the console inside its platform transaction."""
    user_id = uuid7()
    await repository.insert_user(
        session,
        user_id=user_id,
        lab_id=lab_id,
        full_name=full_name.strip(),
        email=normalise_email(email),
        roles=[Role.MANAGER],
    )
    return user_id


async def activate(session: AsyncSession, user_id: UUID, password_hash: str) -> None:
    """Set the first password from an invite (or a new one from a reset) and activate."""
    await repository.activate_with_password(session, user_id, password_hash)
