# 007 — Deploy through Render and Vercel Git integrations until migrations exist

**Date:** 2026-11-23 · **Status:** Accepted. API part superseded on 2026-11-25: with the first migration, `deploy-staging.yml` (migrate → Render deploy hook → health + smoke) replaced Render's auto-deploy. Vercel still deploys the web through its Git integration.

## Context
CONVENTIONS.md §4 plans `deploy-staging.yml`: on merge to `main`, run migrations on staging, then deploy API and worker, then the web, then smoke tests. Today there is no database, no migration and no worker; just an empty web and an API with `/health`.

## Decision
For now, both hosts deploy from their own GitHub integration:
- **Render** (API, free tier, Frankfurt): auto-deploy on `main` set to **"After CI checks pass"**, health check `/health`.
- **Vercel** (web, Hobby, functions in `fra1`): deploys `main` to production and every PR to a preview URL.

`deploy-staging.yml` replaces Render's auto-deploy when the first migration lands (migrations must run before the new API starts).

## Alternatives considered
- **Write `deploy-staging.yml` now:** it would only call Render's deploy hook; extra secrets and YAML for no extra safety yet.
- **Infrastructure as code (`infra/render.yaml` Blueprint) now:** worth it once there are several services (API, worker, Redis); for one free web service the dashboard is simpler to learn. Added with the worker.

## Consequences
- A red CI never reaches Render (it waits for CI). Vercel doesn't wait for CI, but `next build` still type-checks, and `main` only receives merged PRs whose CI was green (ruleset).
- Service settings live in the dashboards for now; PROGRESS.md records them until `render.yaml` exists.
- When migrations arrive: switch Render auto-deploy off, add `deploy-staging.yml` with migrate → deploy hook → smoke test.
