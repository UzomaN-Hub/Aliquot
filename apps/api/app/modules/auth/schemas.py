from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import Section
from app.modules.staff.models import Role

LabSlug = Field(min_length=1, max_length=40, description="The lab's address, e.g. 'demo'.")


class SignInRequest(BaseModel):
    lab: str = LabSlug
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


class LabRequest(BaseModel):
    """Refresh and sign-out: the refresh token itself travels in the cookie."""

    lab: str = LabSlug


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    roles: list[Role]
    sections: list[Section]


class LabResponse(BaseModel):
    name: str
    slug: str
    timezone: str


class SessionResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105  # a token kind, not a secret
    expires_in: int = Field(description="Seconds until the access token expires.")
    user: UserResponse
    lab: LabResponse
