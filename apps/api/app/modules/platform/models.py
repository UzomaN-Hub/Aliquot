from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.ids import uuid7


class PlatformAdmin(Base):
    """A super-admin: the landlord, never an occupant (ROLES.md). No lab_id."""

    __tablename__ = "platform_admins"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    email: Mapped[str] = mapped_column(unique=True)
    full_name: Mapped[str]
    # None until an invited admin opens their link and chooses a password.
    password_hash: Mapped[str | None]
    totp_secret_enc: Mapped[str | None]
    totp_last_step: Mapped[int | None]
    totp_failed_attempts: Mapped[int] = mapped_column(server_default="0")
    totp_locked_until: Mapped[datetime | None]
    active: Mapped[bool] = mapped_column(server_default="true")
    invited_by: Mapped[UUID | None] = mapped_column(ForeignKey("platform_admins.id"))
    deactivated_at: Mapped[datetime | None]
    last_login_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())


class PlatformSession(Base):
    __tablename__ = "platform_sessions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    admin_id: Mapped[UUID] = mapped_column(ForeignKey("platform_admins.id"))
    family_id: Mapped[UUID]
    refresh_token_hash: Mapped[str] = mapped_column(unique=True)
    user_agent: Mapped[str | None]
    ip: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    last_used_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
    replaced_by: Mapped[UUID | None] = mapped_column(ForeignKey("platform_sessions.id"))


class PlatformInvite(Base):
    """A link that lets an invited super-admin choose their password. Stored hashed."""

    __tablename__ = "platform_invites"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    admin_id: Mapped[UUID] = mapped_column(ForeignKey("platform_admins.id"))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("platform_admins.id"))
    token_hash: Mapped[str] = mapped_column(unique=True)
    expires_at: Mapped[datetime]
    used_at: Mapped[datetime | None]
    revoked_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class PlatformIdempotencyKey(Base):
    """A finished console write, kept so a retried request gets the same answer."""

    __tablename__ = "platform_idempotency_keys"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("platform_admins.id"), primary_key=True)
    key: Mapped[str] = mapped_column(primary_key=True)
    request_hash: Mapped[str]
    response_status: Mapped[int]
    response_body: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
