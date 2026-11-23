# Aliquot — Engineering Conventions

**Status:** Agreed · 18 Nov 2026

## 1. Learning mode (this project is also a course)
- Before introducing a new tool or pattern (Celery, RLS, SSE, outbox, CI job…), Claude Code explains it in plain words: what it is, why we use it, what would happen without it.
- Each new concept gets a short note in `docs/learning/<topic>.md` (≤ 1 page, with the exact place it's used in our code).
- Claude Code writes all code, including tests, migrations, services and CI. Uzoma learns by reading the learning notes, decision records and code, and asks questions.
- Every decision with a trade-off goes into `docs/decisions/NNN-title.md` (ADR: context, decision, alternatives, consequences). These are interview answers.

## 2. Repository layout
```
aliquot/
  apps/
    web/                 Next.js (App Router)
    api/                 FastAPI
      app/
        core/            config, db session, security, tenancy, errors
        modules/
          <module>/      router.py · service.py · repository.py · schemas.py · models.py · events.py · tests/
        workers/         Celery app, task registration
      migrations/        Alembic
  packages/
    api-types/           generated from OpenAPI
  infra/                 docker-compose.yml, render.yaml, seed scripts, k6 load tests
  docs/                  all planning docs, decisions/, learning/, performance.md, PROGRESS.md
  CLAUDE.md
```

## 3. Git workflow
- **Trunk-based:** `main` is always deployable. Work happens on short branches (`feat/samples-reception`, `fix/flag-rounding`) merged within a day.
- **Pull requests even when working alone:** CI must pass before merge; squash-merge.
- **Conventional Commits:** `feat(samples): add rejection reasons`, `fix(results): round eGFR to integer`, `test`, `refactor`, `docs`, `chore`, `ci`.
- One logical change per commit. Never commit secrets, `.env`, or generated files.
- Releases are git tags (`v1.0.0`) following semantic versioning; a tag triggers production deploy.

## 4. CI/CD pipeline (GitHub Actions)
Workflow files: `.github/workflows/ci.yml` (pull requests), `deploy-staging.yml` (merge to main), `release.yml` (tags `v*`).

**On every pull request**
1. Install with cache (pnpm, uv).
2. Lint and format check: Ruff (Python), ESLint + Prettier (TypeScript).
3. Type check: mypy (strict) and `tsc --noEmit`.
4. Architecture check: import-linter (modules can't reach into each other).
5. Tests: pytest with real Postgres + Redis service containers (RLS and migrations tested for real), Vitest for frontend logic.
6. Migrations: upgrade, downgrade, upgrade again on a fresh database.
7. Security: pip-audit, pnpm audit, CodeQL, gitleaks (secret scan).
8. Build web; fail if any route's first-load JS exceeds 150 KB.
9. Playwright end-to-end tests against the Vercel preview + API.

**On merge to `main`**
1. Run migrations on staging → deploy API and worker to Render staging → Vercel staging.
2. Smoke tests (health check, sign-in, create request).

**On tag `v*`**
1. Database backup check → migrations on production → deploy production.
2. Smoke tests; on failure, roll back to the previous Render deploy and Vercel deployment.

## 5. Code style
**Python**
- Ruff for lint + format; mypy strict; type hints everywhere.
- Business rules live in `service.py`; routers only parse input, call a service, return a schema.
- Repositories return models; no SQL outside repositories.
- No bare `except`; errors raise typed exceptions mapped to `{ code, message, field? }`.

**TypeScript / React**
- Strict mode; no `any`; no default exports except Next.js pages/layouts.
- Server Components by default; `"use client"` only where interaction needs it.
- State homes per FRONTEND.md §6: server data in TanStack Query, shareable view state in the URL (nuqs), forms in React Hook Form, local UI in `useState`, cross-component UI in small Zustand stores. No prop-drilling beyond two levels.
- Styling only through Tailwind tokens and `/styleguide` components; raw hex values fail lint.

**Naming**
- Python: `snake_case` functions/variables, `PascalCase` classes. TypeScript: `camelCase`, `PascalCase` components, files `kebab-case.tsx`.
- Database: plural `snake_case` tables, `snake_case` columns, `_at` for timestamps, `_by` for user references, `_kobo` for money.
- API: `/v1/<plural-resource>`, kebab-case paths, JSON `snake_case`.

## 6. Testing rules
Full strategy (every test type, when it runs, pass criteria): **TESTING.md**. Summary:

| Layer | Tool | Rule |
| --- | --- | --- |
| Services (business rules) | pytest | Every rule tested: state transitions, flagging edges (age/sex boundaries, critical limits), calculations |
| Permissions | pytest | One test per row of ROLES.md |
| Tenant isolation | pytest | Every table: lab A can't read or write lab B, even with a forged ID |
| API | pytest + httpx | Happy path + validation + permission denied per endpoint |
| Query count | pytest | No endpoint does more queries than its budget (catches N+1) |
| Frontend logic | Vitest | Formatters, flag display, form schemas |
| End to end | Playwright | One test per flow in FLOWS.md |
| Performance | k6 | Budgets in ARCHITECTURE.md, run before release |

- Coverage: 90% on `service.py` files, 80% overall; CI fails below.
- Tests use factories, never shared mutable fixtures; each test runs in a rolled-back transaction.
- A bug fix always starts with a failing test.

## 7. Database migrations
- One Alembic migration per change; never edit a merged migration.
- Every migration has a working downgrade.
- Destructive changes in two steps: add new → backfill → switch code → remove old in a later release.
- New tables ship with their `lab_id`, RLS policy, indexes and grants in the same migration.

## 8. Configuration and secrets
- All config from environment variables, validated at startup (Pydantic Settings); the app refuses to start if any are missing.
- `.env.example` lists every variable with a dummy value; real `.env` never committed.
- Platform name and domain come from config (`PLATFORM_NAME`, `PLATFORM_DOMAIN`, `TENANT_MODE`).

## 9. Documentation
- `docs/PROGRESS.md` updated at the end of each work session: done, next, blockers.
- `docs/decisions/` for every trade-off.
- Public functions and endpoints have short docstrings; OpenAPI descriptions on every endpoint.
- README: what it is, screenshots, architecture diagram, run locally in under 5 minutes, demo logins.

## 10. Definition of done (every feature)
- [ ] Matches FLOWS.md and ROLES.md
- [ ] All states designed: loading, empty, error, success
- [ ] Tests written and passing; CI green
- [ ] New queries checked with `EXPLAIN ANALYZE` on the 1M dataset
- [ ] Screenshot checked against DESIGN.md
- [ ] Audit log entries written for every change
- [ ] PROGRESS.md updated
