# 011 — psycopg 3 as the Postgres driver

**Date:** 2026-11-24 · **Status:** Accepted

## Context
SQLAlchemy needs a driver to talk to Postgres. The two serious async options are **asyncpg** and **psycopg 3**. Production goes through Supabase's connection pooler in transaction mode, where one server connection is shared between clients, so server-side prepared statements must be turned off with either driver.

## Decision
psycopg 3 (`postgresql+psycopg://`), with `prepare_threshold=None` (prepared statements off).

## Alternatives considered
- **asyncpg:** faster in benchmarks and works with Windows' default event loop. But it is async-only, and the Celery worker (Stage 9) runs ordinary sync code. With asyncpg, the API and worker would use two different drivers with two sets of quirks. Behind the pooler it needs two cache settings plus unique statement names; psycopg needs one setting.
- **psycopg 2:** sync only, in maintenance mode.

*Correction:* when proposing this choice I said asyncpg "breaks" behind the pooler and psycopg doesn't. Both need prepared statements switched off. The deciding reasons are the ones above.

## Consequences
- One driver for the API (async), migrations and dev scripts (sync), and later the Celery worker (sync).
- **Windows:** psycopg's async mode needs the selector event loop. `fastapi dev` (reload mode) already uses it. Tests pass `loop_factory=SelectorEventLoop` to the TestClient (`app/conftest.py`). Production runs on Linux, where this doesn't apply.
- Speed difference is small next to network time; checked in the performance stage.
