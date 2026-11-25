from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.enums import pg_enum
from app.core.ids import uuid7


class ActorType(StrEnum):
    USER = "user"
    PLATFORM_ADMIN = "platform_admin"
    SYSTEM = "system"
    DOCTOR_LINK = "doctor_link"


class AuditEntry(Base):
    """Append-only (no UPDATE/DELETE grants), partitioned by month on `at`."""

    __tablename__ = "audit_log"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    at: Mapped[datetime] = mapped_column(primary_key=True, server_default=func.now())
    lab_id: Mapped[UUID | None]  # None only for platform events (decision 015)
    actor_type: Mapped[ActorType] = mapped_column(pg_enum(ActorType, "audit_actor"))
    actor_id: Mapped[UUID | None]
    action: Mapped[str]
    entity: Mapped[str]
    entity_id: Mapped[UUID | None]
    before: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    after: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    ip: Mapped[str | None] = mapped_column(INET)
