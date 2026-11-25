"""Application settings, read from environment variables (or apps/api/.env).

Every setting without a default is required: the app refuses to start if one
is missing (CONVENTIONS.md §8). Never hard-code the platform name or domain.
"""

from functools import lru_cache
from typing import Literal

from cryptography.fernet import Fernet
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DRIVER = "postgresql+psycopg://"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "test", "staging", "production"]
    platform_name: str
    platform_domain: str
    tenant_mode: Literal["path", "subdomain"]

    # The running API connects as `aliquot_app`: a role that can never bypass
    # row-level security (decision 012).
    database_url: str
    # The console connects as `aliquot_platform`: tenant records only, no staff reads,
    # nothing clinical (decision 015).
    platform_database_url: str
    # The owner role. Used only by Alembic migrations and dev scripts, never by the API.
    migration_database_url: str | None = None

    # Where people open the web app; used to build invite and reset links.
    public_web_url: str
    # Encrypts super-admin 2FA secrets at rest (a Fernet key: 44 url-safe base64 chars).
    totp_encryption_key: SecretStr

    # Signs access tokens. At least 32 random characters; different per environment.
    jwt_secret: SecretStr
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    session_idle_hours: int = 8

    # Set by Render on every deploy; /health reports it so the deploy workflow can
    # tell when the new version is live. The repo is public, so this reveals nothing.
    git_commit: str | None = Field(default=None, validation_alias="RENDER_GIT_COMMIT")

    @field_validator("public_web_url")
    @classmethod
    def _no_trailing_slash(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError("must start with http:// or https://")
        return value.rstrip("/")

    @field_validator("totp_encryption_key")
    @classmethod
    def _fernet_key(cls, value: SecretStr) -> SecretStr:
        try:
            Fernet(value.get_secret_value().encode())
        except (ValueError, TypeError) as error:
            raise ValueError("must be a Fernet key (see .env.example)") from error
        return value

    @field_validator("database_url", "platform_database_url", "migration_database_url")
    @classmethod
    def _uses_psycopg(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith(_DRIVER):
            raise ValueError(f"must start with {_DRIVER} (decision 011)")
        return value

    @field_validator("jwt_secret")
    @classmethod
    def _long_enough(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("must be at least 32 characters")
        return value


@lru_cache
def get_settings() -> Settings:
    """Load settings once and reuse them (also a FastAPI dependency)."""
    return Settings()
