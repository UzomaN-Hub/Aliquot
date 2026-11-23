from fastapi import FastAPI

from app.core.config import get_settings
from app.modules.health.router import router as health_router


def create_app() -> FastAPI:
    """Build the FastAPI app. Fails fast if a required setting is missing."""
    settings = get_settings()
    app = FastAPI(title=f"{settings.platform_name} API", version="0.1.0")
    app.include_router(health_router)
    return app


app = create_app()
