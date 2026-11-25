"""Test setup: a real, separate Postgres database (`aliquot_test`), never the dev one.

Database tests ask for the `db` fixture. It builds the test database once per run
(fresh, from migrations), then empties every table after each test. Tests that
don't need a database never touch one. Factories live in app/testing.py.
"""

import asyncio
import os
import sys
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, create_engine, make_url, text

# ── Settings for the whole run, set BEFORE any app module reads them ─────
_ADMIN_URL = make_url(
    os.environ.get(
        "TEST_DB_ADMIN_URL", "postgresql+psycopg://aliquot:aliquot_dev@127.0.0.1:5432/postgres"
    )
)
_TEST_DB = "aliquot_test"
_OWNER_URL = _ADMIN_URL.set(database=_TEST_DB)
_APP_URL = _OWNER_URL.set(username="aliquot_app", password="aliquot_app_dev")
_PLATFORM_URL = _OWNER_URL.set(username="aliquot_platform", password="aliquot_platform_dev")

os.environ.update(
    {
        "ENVIRONMENT": "test",
        "PLATFORM_NAME": "Test Platform",
        "PLATFORM_DOMAIN": "localhost",
        "TENANT_MODE": "path",
        "DATABASE_URL": _APP_URL.render_as_string(hide_password=False),
        "PLATFORM_DATABASE_URL": _PLATFORM_URL.render_as_string(hide_password=False),
        "PUBLIC_WEB_URL": "http://localhost:3000",
        # Test-only key; protects nothing real.
        "TOTP_ENCRYPTION_KEY": "mb6PcIuROO_Su8c0V4l5kFex_g3-6AhGVXsnVWUOIMM=",
        "MIGRATION_DATABASE_URL": _OWNER_URL.render_as_string(hide_password=False),
        "JWT_SECRET": "test-secret-that-is-long-enough-0123456789",
    }
)

from app.main import app  # noqa: E402  # must import after the settings above
from app.scripts.dev_db import migrate, set_app_role_password  # noqa: E402

_TABLES = (
    "audit_log, auth_tokens, sessions, user_sections, user_roles, users, lab_sections, labs, "
    "platform_idempotency_keys, platform_sessions, platform_admins"
)


@pytest.fixture(scope="session")
def _database() -> Iterator[None]:
    admin = create_engine(_ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.execute(text(f'DROP DATABASE IF EXISTS "{_TEST_DB}" WITH (FORCE)'))
        connection.execute(text(f'CREATE DATABASE "{_TEST_DB}"'))
    admin.dispose()

    migrate()
    owner = create_engine(_OWNER_URL)
    with owner.begin() as connection:
        set_app_role_password(connection, os.environ["DATABASE_URL"])
        set_app_role_password(connection, os.environ["PLATFORM_DATABASE_URL"])
    owner.dispose()
    yield


@pytest.fixture
def db(_database: None) -> Iterator[Connection]:
    """An OWNER connection (bypasses RLS) for arranging data and checking results."""
    engine = create_engine(_OWNER_URL, isolation_level="AUTOCOMMIT")
    with engine.connect() as connection:
        yield connection
        connection.execute(text(f"TRUNCATE {_TABLES} CASCADE"))
    engine.dispose()


@pytest.fixture
def app_db(db: Connection) -> Iterator[Connection]:
    """A connection AS THE APP ROLE: exactly what the API can see. RLS applies."""
    engine = create_engine(_APP_URL)
    with engine.connect() as connection:
        yield connection
    engine.dispose()


@pytest.fixture
def client() -> Iterator[TestClient]:
    # psycopg's async mode needs the selector event loop on Windows (decision 011).
    options: dict[str, Any] = (
        {"loop_factory": asyncio.SelectorEventLoop} if sys.platform == "win32" else {}
    )
    with TestClient(app, backend_options=options) as test_client:
        yield test_client
