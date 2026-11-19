# 002 — Named Docker volumes for local data

**Date:** 2026-11-19 · **Status:** Accepted

## Context
Local Postgres and Redis run in Docker Desktop (WSL 2 backend) on Windows. Their data must survive restarts. Docker can store it in a **named volume** (managed by Docker inside WSL) or a **bind mount** (a folder in the repo, e.g. `infra/data/`).

## Decision
Use named volumes (`postgres-data`, `redis-data`) in `infra/docker-compose.yml`.

## Alternatives considered
- **Bind mount to `infra/data/`:** you can see the files in Explorer, but on Windows every disk read crosses from WSL to NTFS (much slower), and Postgres refuses or breaks on Windows file permissions. `infra/data/` stays in `.gitignore` in case a tool writes there later.

## Consequences
- Fast and no permission errors.
- The data isn't visible as files in the repo; use `psql` or a DB client to look at it.
- `docker compose ... down -v` deletes it. That's the way to reset to a clean database.
- It counts against Docker's disk use; `docker system df` shows the size.
