from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.enums import SECTION, LabStatus, Section, pg_enum
from app.core.ids import uuid7


class Lab(Base):
    """A tenant. Every lab-owned row points here through `lab_id`."""

    __tablename__ = "labs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    name: Mapped[str]
    slug: Mapped[str] = mapped_column(unique=True)
    legal_name: Mapped[str | None]
    address: Mapped[str | None]
    phone: Mapped[str | None]
    email: Mapped[str | None]
    logo_key: Mapped[str | None]
    timezone: Mapped[str] = mapped_column(server_default="Africa/Lagos")
    status: Mapped[LabStatus] = mapped_column(
        pg_enum(LabStatus, "lab_status"), server_default=LabStatus.ACTIVE.value
    )
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    suspended_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())


class LabSection(Base):
    __tablename__ = "lab_sections"

    lab_id: Mapped[UUID] = mapped_column(ForeignKey("labs.id"), primary_key=True)
    section: Mapped[Section] = mapped_column(SECTION, primary_key=True)
    enabled: Mapped[bool] = mapped_column(server_default="true")
