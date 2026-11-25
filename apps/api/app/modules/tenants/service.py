"""Tenants: finding a lab by its public address."""

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import transaction
from app.core.enums import LabStatus, Section
from app.core.errors import AppError
from app.core.ids import uuid7
from app.modules.tenants import repository
from app.modules.tenants.models import Lab
from app.modules.tenants.repository import PublicLab

_SLUG = re.compile(r"^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$")


def lab_not_found() -> AppError:
    return AppError(404, "lab_not_found", "We can't find this lab. Check the address.")


def lab_unavailable() -> AppError:
    return AppError(
        403, "lab_unavailable", "This lab is unavailable right now. Contact the lab for help."
    )


async def find_public_lab(session: AsyncSession, slug: str) -> PublicLab:
    """The lab at this address, active or suspended. Raises lab_not_found."""
    if not _SLUG.match(slug):
        raise lab_not_found()
    lab = await repository.get_public_lab_by_slug(session, slug)
    if lab is None:
        raise lab_not_found()
    return lab


async def find_active_lab(session: AsyncSession, slug: str) -> PublicLab:
    """The lab at this address if staff may sign in to it (FLOWS.md §1: suspended → no)."""
    lab = await find_public_lab(session, slug)
    if lab.status is not LabStatus.ACTIVE:
        raise lab_unavailable()
    return lab


async def get_branding(slug: str) -> PublicLab:
    async with transaction() as session:
        return await find_public_lab(session, slug)


# ── Console side (called by the platform module inside platform_transaction) ─
# Addresses that would clash with the platform's own pages once labs move to
# subdomains (TENANT_MODE=subdomain).
RESERVED_SLUGS = frozenset(
    {"admin", "api", "app", "assets", "console", "docs", "help", "mail", "static", "status", "www"}
)


@dataclass(frozen=True)
class LabSummary:
    id: UUID
    name: str
    slug: str
    status: LabStatus
    staff_count: int
    created_at: datetime
    suspended_at: datetime | None


@dataclass(frozen=True)
class LabDetail:
    id: UUID
    name: str
    slug: str
    status: LabStatus
    legal_name: str | None
    address: str | None
    phone: str | None
    email: str | None
    timezone: str
    sections: tuple[Section, ...]
    staff_count: int
    created_at: datetime
    suspended_at: datetime | None


@dataclass(frozen=True)
class NewLab:
    name: str
    slug: str
    legal_name: str | None
    address: str | None
    phone: str | None
    email: str | None
    timezone: str
    sections: tuple[Section, ...]


EDITABLE_FIELDS = ("name", "legal_name", "address", "phone", "email", "timezone")


def _detail(lab: Lab, sections: list[Section], staff: int) -> LabDetail:
    return LabDetail(
        id=lab.id,
        name=lab.name,
        slug=lab.slug,
        status=lab.status,
        legal_name=lab.legal_name,
        address=lab.address,
        phone=lab.phone,
        email=lab.email,
        timezone=lab.timezone,
        sections=tuple(sections),
        staff_count=staff,
        created_at=lab.created_at,
        suspended_at=lab.suspended_at,
    )


def _check_timezone(timezone: str) -> None:
    try:
        ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError) as error:
        raise AppError(
            422, "invalid_timezone", "Choose a timezone from the list.", "timezone"
        ) from error


async def list_labs_for_console(session: AsyncSession) -> list[LabSummary]:
    counts = await repository.staff_counts(session)
    return [
        LabSummary(
            id=lab.id,
            name=lab.name,
            slug=lab.slug,
            status=lab.status,
            staff_count=counts.get(lab.id, 0),
            created_at=lab.created_at,
            suspended_at=lab.suspended_at,
        )
        for lab in await repository.list_labs(session)
    ]


async def get_lab_for_console(
    session: AsyncSession, lab_id: UUID, *, lock: bool = False
) -> LabDetail:
    lab = await repository.get_lab(session, lab_id, lock=lock)
    if lab is None:
        raise lab_not_found()
    counts = await repository.staff_counts(session)
    return _detail(lab, await repository.get_sections(session, lab.id), counts.get(lab.id, 0))


async def create_lab(session: AsyncSession, new: NewLab) -> LabDetail:
    slug = new.slug.strip().lower()
    if not _SLUG.match(slug):
        raise AppError(
            422,
            "invalid_slug",
            "Use 1 to 40 lowercase letters, numbers or hyphens, starting and ending with a "
            "letter or number.",
            "slug",
        )
    if slug in RESERVED_SLUGS:
        raise AppError(422, "slug_reserved", "That address is reserved. Choose another.", "slug")
    if not new.sections:
        raise AppError(422, "no_sections", "Choose at least one section.", "sections")
    _check_timezone(new.timezone)

    lab = Lab(
        id=uuid7(),
        name=new.name.strip(),
        slug=slug,
        legal_name=new.legal_name,
        address=new.address,
        phone=new.phone,
        email=new.email,
        timezone=new.timezone,
    )
    try:
        async with session.begin_nested():  # a clash rolls back only this step
            await repository.add_lab(session, lab, sorted(set(new.sections)))
    except IntegrityError as error:
        raise AppError(
            409, "slug_taken", f"The address {slug} is already used by another lab.", "slug"
        ) from error
    return await get_lab_for_console(session, lab.id)


async def update_lab(
    session: AsyncSession, lab_id: UUID, changes: dict[str, str | None]
) -> tuple[dict[str, str | None], LabDetail]:
    """Apply branding changes. Returns (previous values of the changed fields, new detail)."""
    lab = await repository.get_lab(session, lab_id, lock=True)
    if lab is None:
        raise lab_not_found()
    if "timezone" in changes and changes["timezone"] is not None:
        _check_timezone(changes["timezone"])
    if "name" in changes and not (changes["name"] or "").strip():
        raise AppError(422, "validation_error", "Enter the lab's name.", "name")

    before: dict[str, str | None] = {}
    for field, value in changes.items():
        if field not in EDITABLE_FIELDS or getattr(lab, field) == value:
            continue
        before[field] = getattr(lab, field)
        setattr(lab, field, value)
    await session.flush()
    return before, await get_lab_for_console(session, lab_id)


async def set_lab_status(session: AsyncSession, lab_id: UUID, status: LabStatus) -> LabDetail:
    lab = await repository.get_lab(session, lab_id, lock=True)
    if lab is None:
        raise lab_not_found()
    if lab.status is status:
        word = "suspended" if status is LabStatus.SUSPENDED else "active"
        raise AppError(409, "no_change", f"This lab is already {word}.")
    lab.status = status
    lab.suspended_at = datetime.now(UTC) if status is LabStatus.SUSPENDED else None
    await session.flush()
    return await get_lab_for_console(session, lab_id)
