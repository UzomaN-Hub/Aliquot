"""Tenants: finding a lab by its public address."""

import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import transaction
from app.core.errors import AppError
from app.modules.tenants import repository
from app.modules.tenants.models import LabStatus
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
