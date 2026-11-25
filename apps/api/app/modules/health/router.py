from fastapi import APIRouter

from app.core.config import get_settings
from app.modules.health.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness check")
def health() -> HealthResponse:
    """Return ok when the API process is up, and which commit is running.

    Used by Render, UptimeRobot and the deploy workflow. Later this also checks
    Postgres and Redis.
    """
    return HealthResponse(status="ok", commit=get_settings().git_commit)
