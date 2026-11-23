# 006 — `apps/web` is a standalone pnpm project until a shared package exists

**Date:** 2026-11-23 · **Status:** Accepted

## Context
The repo is a monorepo (`apps/web`, `apps/api`, `packages/`). JavaScript monorepos usually use a **pnpm workspace**: one `pnpm-workspace.yaml` and one lock file at the repo root, with each app as a member. Right now there is only one JavaScript project (`apps/web`); `packages/api-types` comes later.

## Decision
Keep `apps/web` standalone for now: its own `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` (which only holds pnpm settings). Convert to a root workspace when `packages/api-types` is added.

## Alternatives considered
- **Root workspace now:** ready for later, but adds a root `package.json` and lock file that the CI path filter (`apps/web/**`) wouldn't see, so lock-file changes at the root would need extra filter rules. No benefit until a second package exists.

## Consequences
- Run pnpm commands from `apps/web`.
- The CI web job's path filter and cache key stay simple (`apps/web/**`, `apps/web/pnpm-lock.yaml`).
- When `packages/api-types` arrives: add root `pnpm-workspace.yaml` listing `apps/web` and `packages/*`, move the lock file to the root, and add `pnpm-lock.yaml` + `packages/**` to the web path filter.
