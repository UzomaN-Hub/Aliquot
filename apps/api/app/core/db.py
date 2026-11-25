"""Database engine, sessions and the per-transaction tenant setting.

Services own their transactions (unit of work): `async with transaction() as session`.
Everything inside commits together, including audit entries, or nothing does.
Row-level security reads `app.current_lab_id`, set per transaction by `set_current_lab`
(ARCHITECTURE.md §8, decision 012).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime
from functools import lru_cache
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import DateTime, MetaData, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

# Predictable constraint names, so migrations can refer to them.
NAMING = {
    "ix": "%(table_name)s_%(column_0_N_name)s_idx",
    "uq": "%(table_name)s_%(column_0_N_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_N_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)
    # Every datetime is timestamptz: times are stored in UTC, shown in the lab's zone.
    # Without this, SQLAlchemy sends naive timestamps and the offset is lost.
    type_annotation_map: ClassVar[dict[Any, Any]] = {datetime: DateTime(timezone=True)}


def _engine(url: str) -> AsyncEngine:
    options: dict[str, Any] = {
        # Behind Supabase's transaction pooler one server connection serves many
        # clients, so server-side prepared statements must stay off (decision 011).
        "connect_args": {"prepare_threshold": None},
        "pool_pre_ping": True,
    }
    if get_settings().environment == "test":
        # Each test client runs its own event loop; pooled connections can't cross loops.
        options["poolclass"] = NullPool
    return create_async_engine(url, **options)


@lru_cache
def get_engine() -> AsyncEngine:
    """The lab app's connection: role aliquot_app (decision 012)."""
    return _engine(get_settings().database_url)


@lru_cache
def get_platform_engine() -> AsyncEngine:
    """The console's connection: role aliquot_platform (decision 015)."""
    return _engine(get_settings().platform_database_url)


@lru_cache
def _sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


@lru_cache
def _platform_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_platform_engine(), expire_on_commit=False)


@asynccontextmanager
async def platform_transaction() -> AsyncIterator[AsyncSession]:
    """A console transaction, as aliquot_platform: tenant records, never staff or clinical."""
    async with _platform_sessionmaker()() as session, session.begin():
        yield session


@asynccontextmanager
async def transaction() -> AsyncIterator[AsyncSession]:
    """One database transaction: commit on success, roll back on any exception."""
    async with _sessionmaker()() as session, session.begin():
        yield session


async def set_current_lab(session: AsyncSession, lab_id: UUID) -> None:
    """Scope the rest of this transaction to one lab. RLS then hides every other lab.

    `set_config(..., true)` is `SET LOCAL`: it ends with the transaction, so a pooled
    connection can never carry one lab's setting into another request.
    """
    await session.execute(
        text("SELECT set_config('app.current_lab_id', :lab_id, true)"),
        {"lab_id": str(lab_id)},
    )


@asynccontextmanager
async def lab_transaction(lab_id: UUID) -> AsyncIterator[AsyncSession]:
    """A transaction that only sees one lab's rows. `lab_id` must come from the token."""
    async with transaction() as session:
        await set_current_lab(session, lab_id)
        yield session
