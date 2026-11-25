from fastapi import APIRouter

from app.modules.tenants import service
from app.modules.tenants.schemas import LabBrandingResponse

router = APIRouter(prefix="/v1/labs", tags=["labs"])


@router.get("/{slug}/branding", summary="Public branding of a lab")
async def get_branding(slug: str) -> LabBrandingResponse:
    """Lab name and status for the sign-in page. No sign-in needed; no private data."""
    lab = await service.get_branding(slug)
    return LabBrandingResponse(name=lab.name, slug=lab.slug, status=lab.status)
