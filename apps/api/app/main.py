from fastapi import FastAPI

from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.modules.auth.router import router as auth_router
from app.modules.health.router import router as health_router
from app.modules.tenants.router import router as tenants_router


def create_app() -> FastAPI:
    """Build the FastAPI app. Fails fast if a required setting is missing."""
    settings = get_settings()
    app = FastAPI(title=f"{settings.platform_name} API", version="0.1.0")
    install_error_handlers(app)
    app.include_router(health_router)
    app.include_router(tenants_router)
    app.include_router(auth_router)
    return app


app = create_app()
