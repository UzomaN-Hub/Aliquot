from pydantic import BaseModel

from app.core.enums import LabStatus


class LabBrandingResponse(BaseModel):
    """Public: shown on the sign-in page and the 'Unavailable' page."""

    name: str
    slug: str
    status: LabStatus
