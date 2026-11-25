from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import LabStatus, Section
from app.modules.tenants.models import Lab, LabSection


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


# ── Console side: these run as aliquot_platform (platform_transaction) ─────
async def list_labs(session: AsyncSession) -> list[Lab]:
    return list(await session.scalars(select(Lab).order_by(Lab.created_at.desc())))


async def staff_counts(session: AsyncSession) -> dict[UUID, int]:
    # Counts only, through a definer function: the platform role can't read staff rows.
    rows = await session.execute(text("SELECT lab_id, staff FROM platform_lab_staff_counts()"))
    return {row.lab_id: int(row.staff) for row in rows}


async def get_lab(session: AsyncSession, lab_id: UUID, *, lock: bool = False) -> Lab | None:
    query = select(Lab).where(Lab.id == lab_id)
    if lock:
        query = query.with_for_update()
    return await session.scalar(query)


async def get_sections(session: AsyncSession, lab_id: UUID) -> list[Section]:
    rows = await session.scalars(
        select(LabSection.section)
        .where(LabSection.lab_id == lab_id, LabSection.enabled.is_(True))
        .order_by(LabSection.section)
    )
    return list(rows)


async def add_lab(session: AsyncSession, lab: Lab, sections: list[Section]) -> Lab:
    session.add(lab)
    await session.flush()
    session.add_all(LabSection(lab_id=lab.id, section=section) for section in sections)
    await session.flush()
    return lab
