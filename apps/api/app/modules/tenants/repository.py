from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenants.models import LabStatus


@dataclass(frozen=True)
class PublicLab:
    """Branding anyone may see: shown on the sign-in page before a token exists."""

    id: UUID
    name: str
    slug: str
    logo_key: str | None
    timezone: str
    status: LabStatus


async def get_public_lab_by_slug(session: AsyncSession, slug: str) -> PublicLab | None:
    # Through the SECURITY DEFINER function: the app role can't read `labs` directly
    # for any lab except the one set on the transaction (decision 012).
    row = (
        await session.execute(
            text(
                "SELECT id, name, slug, logo_key, timezone, status FROM public_lab_by_slug(:slug)"
            ),
            {"slug": slug},
        )
    ).first()
    if row is None:
        return None
    return PublicLab(
        id=row.id,
        name=row.name,
        slug=row.slug,
        logo_key=row.logo_key,
        timezone=row.timezone,
        status=LabStatus(row.status),
    )
