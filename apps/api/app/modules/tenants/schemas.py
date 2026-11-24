from pydantic import BaseModel

from app.modules.tenants.models import LabStatus


class LabBrandingResponse(BaseModel):
    """Public: shown on the sign-in page and the 'Unavailable' page."""

    name: str
    slug: str
    status: LabStatus
