"""Application settings, read from environment variables (or apps/api/.env).

Every setting without a default is required: the app refuses to start if one
is missing (CONVENTIONS.md §8). Never hard-code the platform name or domain.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "test", "staging", "production"]
    platform_name: str
    platform_domain: str
    tenant_mode: Literal["path", "subdomain"]


@lru_cache
def get_settings() -> Settings:
    """Load settings once and reuse them (also a FastAPI dependency)."""
    return Settings()
