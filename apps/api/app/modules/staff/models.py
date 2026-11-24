from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, ForeignKeyConstraint, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.enums import SECTION, Section, pg_enum
from app.core.ids import uuid7


class UserStatus(StrEnum):
    INVITED = "invited"
    ACTIVE = "active"
    DEACTIVATED = "deactivated"


class Role(StrEnum):
    MANAGER = "manager"
    CHIEF_SCIENTIST = "chief_scientist"
    LAB_SCIENTIST = "lab_scientist"
    FRONT_DESK = "front_desk"


ROLE = pg_enum(Role, "staff_role")


class User(Base):
    """A member of one lab's staff. Email is unique per lab, stored lower-case."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("lab_id", "id"),  # target of tenant-safe composite FKs
        UniqueConstraint("lab_id", "email"),
        ForeignKeyConstraint(["lab_id", "created_by"], ["users.lab_id", "users.id"]),
        ForeignKeyConstraint(["lab_id", "updated_by"], ["users.lab_id", "users.id"]),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    lab_id: Mapped[UUID] = mapped_column(ForeignKey("labs.id"))
    full_name: Mapped[str]
    email: Mapped[str]
    phone: Mapped[str | None]
    password_hash: Mapped[str | None]
    status: Mapped[UserStatus] = mapped_column(
        pg_enum(UserStatus, "user_status"), server_default=UserStatus.INVITED.value
    )
    totp_secret_enc: Mapped[str | None]
    totp_required: Mapped[bool] = mapped_column(server_default="false")
    last_login_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())
    created_by: Mapped[UUID | None]
    updated_by: Mapped[UUID | None]


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (ForeignKeyConstraint(["lab_id", "user_id"], ["users.lab_id", "users.id"]),)

    lab_id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(primary_key=True)
    role: Mapped[Role] = mapped_column(ROLE, primary_key=True)


class UserSection(Base):
    __tablename__ = "user_sections"
    __table_args__ = (ForeignKeyConstraint(["lab_id", "user_id"], ["users.lab_id", "users.id"]),)

    lab_id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(primary_key=True)
    section: Mapped[Section] = mapped_column(SECTION, primary_key=True)
