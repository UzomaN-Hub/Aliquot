from fastapi import APIRouter

from app.modules.health.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness check")
def health() -> HealthResponse:
    """Return ok when the API process is up. Used by Render and UptimeRobot.

    Later this also checks Postgres and Redis.
    """
    return HealthResponse(status="ok")
