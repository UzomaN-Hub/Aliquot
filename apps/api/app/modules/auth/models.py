from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, ForeignKeyConstraint, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.ids import uuid7


class AuthSession(Base):
    """One signed-in device. Each refresh replaces the row with a new one in the
    same family; presenting a replaced token again revokes the whole family."""

    __tablename__ = "sessions"
    __table_args__ = (
        UniqueConstraint("lab_id", "id"),
        ForeignKeyConstraint(["lab_id", "user_id"], ["users.lab_id", "users.id"]),
        ForeignKeyConstraint(["lab_id", "replaced_by"], ["sessions.lab_id", "sessions.id"]),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    lab_id: Mapped[UUID] = mapped_column(ForeignKey("labs.id"))
    user_id: Mapped[UUID]
    family_id: Mapped[UUID]
    refresh_token_hash: Mapped[str] = mapped_column(unique=True)
    user_agent: Mapped[str | None]
    ip: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    last_used_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
    replaced_by: Mapped[UUID | None]
