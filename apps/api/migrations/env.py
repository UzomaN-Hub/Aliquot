"""Alembic environment: runs migrations as the database OWNER role.

Synchronous on purpose: migrations are short scripts, and psycopg's sync mode
works on every OS without event-loop setup.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

import app.models  # noqa: F401  # registers every table on Base.metadata
from app.core.config import get_settings
from app.core.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations() -> None:
    url = get_settings().migration_database_url
    if url is None:
        raise RuntimeError("Set MIGRATION_DATABASE_URL (the owner role) to run migrations.")
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    raise RuntimeError("Offline (SQL script) mode isn't used; run against a database.")
run_migrations()
