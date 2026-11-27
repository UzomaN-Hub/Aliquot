from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import Section

# ── Console auth ──────────────────────────────────────────────────────────


class PlatformSignInRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


class TotpSetup(BaseModel):
    secret: str = Field(description="For typing into an authenticator app by hand.")
    otpauth_uri: str
    qr_image: str = Field(description="QR code of otpauth_uri, as an SVG data: URI for <img>.")


class SignInStepResponse(BaseModel):
    step: Literal["verify", "setup"]
    challenge: str = Field(description="Proof the password step passed; valid 5 minutes.")
    setup: TotpSetup | None = None


class VerifyRequest(BaseModel):
    challenge: str = Field(min_length=20, max_length=2000)
    code: str = Field(min_length=6, max_length=12)


class AdminResponse(BaseModel):
    id: UUID
    full_name: str
    email: str


class PlatformSessionResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105  # a token kind, not a secret
    expires_in: int
    admin: AdminResponse


# ── Labs ──────────────────────────────────────────────────────────────────
LabStatusName = Literal["active", "suspended"]


class LabSummaryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    status: LabStatusName
    staff_count: int
    created_at: datetime
    suspended_at: datetime | None


class LabDetailResponse(LabSummaryResponse):
    legal_name: str | None
    address: str | None
    phone: str | None
    email: str | None
    timezone: str
    sections: list[Section]


class ManagerInput(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CreateLabRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=40)
    legal_name: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=254)
    timezone: str = Field(default="Africa/Lagos", max_length=64)
    sections: list[Section] = Field(min_length=1)
    manager: ManagerInput


class CreateLabResponse(BaseModel):
    lab: LabDetailResponse
    invite_url: str | None = Field(
        description="The first Manager's invite link. Shown once; null on a replayed request."
    )


class UpdateLabRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    legal_name: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=254)
    timezone: str | None = Field(default=None, max_length=64)


class StatusChangeRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500, description="Kept in the audit log.")


# ── Platform team (decision 019) ─────────────────────────────────────────
AdminStatusName = Literal["invited", "active", "deactivated"]
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class TeamMemberResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    status: AdminStatusName
    two_factor: bool = Field(description="2FA is set up.")
    last_login_at: datetime | None
    created_at: datetime
    invited_by_name: str | None = Field(description="Null for admins created from the CLI.")
    deactivated_at: datetime | None
    invite_expires_at: datetime | None = Field(
        description="When the open invite link expires; null if none is open."
    )


class InviteAdminRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=254, pattern=EMAIL_PATTERN)


class InviteAdminResponse(BaseModel):
    admin: TeamMemberResponse
    invite_url: str | None = Field(description="Shown once; null on a replayed request.")


class InviteLinkResponse(BaseModel):
    invite_url: str | None = Field(description="Shown once; null on a replayed request.")


class InviteTokenRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class InviteInfoResponse(BaseModel):
    full_name: str
    email: str


class AcceptInviteRequest(InviteTokenRequest):
    password: str = Field(min_length=1, max_length=1024)
