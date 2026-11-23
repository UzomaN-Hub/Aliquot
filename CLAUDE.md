# CLAUDE.md — Aliquot

You are building **Aliquot**, a multi-tenant Laboratory Information System for Chemical Pathology, Haematology and Medical Microbiology. The owner is Uzoma: junior full-stack developer and medical lab scientist. This project is his flagship portfolio piece **and** a learning course. Quality, safety and clarity beat speed.

## 1. Read before any work
All decisions live in `docs/`. Read the ones relevant to the task before writing code; if a request conflicts with them, say so before doing anything.

| File | Use it for |
| --- | --- |
| `docs/SCOPE.md` | What's in v1 and what isn't |
| `docs/ROLES.md` | Who may do what (permission matrix) |
| `docs/FLOWS.md` | Step-by-step behaviour of every flow |
| `docs/PAGES.md` | The 38 pages and 6 templates |
| `docs/DESIGN.md` | Colours, fonts, components, states, guardrails |
| `docs/FRONTEND.md` | Web app structure, rendering, state, API client, performance, security |
| `docs/ANIMATION.md` | Landing hero only |
| `docs/STACK.md` | Tools and services (don't swap without asking) |
| `docs/COSTS.md` | Monthly costs (local only; never put prices in public docs) |
| `docs/ARCHITECTURE.md` | Modules, tenancy, speed, security, jobs, environments |
| `docs/SCHEMA.md` | Tables, indexes, relationships |
| `docs/CONVENTIONS.md` | Git, CI/CD, code style, migrations, definition of done |
| `docs/TESTING.md` | Every test type and the release gate |
| `docs/BUILD_PLAN.md` | Stages in order with done-when gates; check the current stage in PROGRESS.md. No dates: never schedule or count days |
| `docs/PROGRESS.md` | What's done, what's next, blockers |
| `docs/designs/` | Approved reference screens + required fixes |

## 2. Non-negotiable rules
**Tenancy and security**
- Every lab-owned table has `lab_id`, composite tenant-safe foreign keys, RLS enabled **and forced**. A new table ships with its policy, indexes and grants in the same migration.
- `lab_id` comes only from the signed token, never from the URL or request body.
- The super-admin has **no access to clinical data**, by API design and by database grants.
- No patient data in URLs, logs, error messages or Sentry.
- Tokens (refresh, invite, reset, patient links) are stored hashed.

**Clinical correctness**
- Results are versioned; never update a result in place. Amendments add a version with a reason.
- Units, reference ranges and prices are snapshotted onto results/requests at the time of use.
- Only Chief Scientists of a section verify and release (including their own entries). Lab Scientists never verify.
- Flags always show their letters (H, L, CH, CL), never colour alone.
- Nothing clinical is hard-deleted. The audit log is append-only and written in the same transaction as the change.

**Architecture**
- Modular monolith. Business rules only in `service.py`; routers parse, call a service, return a schema; SQL only in repositories.
- Modules never import another module's repository or models; use its service or an outbox event.
- Messages, PDFs and other side effects go through the outbox and Celery, never inside a request.
- Every write accepts `Idempotency-Key`. Every job is idempotent.
- Money in integer kobo. Times stored in UTC, shown in the lab's timezone.
- Platform name and domain come from config (`PLATFORM_NAME`, `PLATFORM_DOMAIN`, `TENANT_MODE=path|subdomain`). Never hard-code "Aliquot".

**Design**
- Only the three colours and their tints from DESIGN.md exist in Tailwind; no raw hex in app code.
- Fonts: `font-serif` Instrument Serif, `font-sans` Atkinson Hyperlegible Next, `font-mono` Atkinson Hyperlegible Mono. Nothing else.
- Pages use components from `/styleguide` only. One primary button per screen. No decorative badges, pills, eyebrow labels, gradients, icons-as-decoration or emoji.
- Every screen ships with loading, empty, error and success states (DESIGN.md "Feedback & states").
- Animation exists only on the landing hero.

## 3. Learning mode (always on)
- Before introducing a tool, library or pattern for the first time, explain in plain words: what it is, why we use it, what goes wrong without it. Keep it short.
- Add a one-page note for each new concept in `docs/learning/<topic>.md`, pointing to where it's used in our code.
- Record every decision with a trade-off in `docs/decisions/NNN-title.md` (context, decision, alternatives, consequences).
- Claude writes all code, including tests, migrations, services and CI. Uzoma learns by reading the learning notes, decision records and code, and asks questions; keep those notes complete enough to study from.
- Uzoma is new to uv. Show the uv command and its pip equivalent the first few times.
- **CI/CD:** Claude writes `.github/workflows/ci.yml`, `deploy-staging.yml` and `release.yml`, adding one job per commit, and explains every line (triggers, path filters, jobs, caching, services, secrets) in `docs/learning/ci-cd.md`. Path filters: backend jobs run only when `apps/api/**` changes, frontend jobs only when `apps/web/**` changes, E2E when either changes.

## 4. How to work on a task
1. Restate the task in one or two lines and name the docs it touches.
2. Backend first: migration → models → repository → service → schemas → router → tests.
3. Frontend: components from /styleguide → screen → all states → tests.
4. Run the checks (section 6). Fix everything before saying it's done.
5. Show a short summary: what changed, how to try it, anything left open.
6. Update `docs/PROGRESS.md` at the end of each work session.
- Keep changes minimal and matching existing patterns; don't refactor beyond the task.
- Never commit secrets or `.env`. Ask before adding a dependency not in STACK.md.
- The GitHub repo is **public from day one**. Never remove the private entries from `.gitignore` (PROJECT_INSTRUCTIONS, COSTS, BUILD_PLAN, PROGRESS, docs/pdf, design PNGs, _upload-to-claude-project); they stay local even though you read them.
- Because the repo is public: before every commit, check `git status` and the diff for secrets, real patient data, personal phone numbers or emails. Seed data uses fictional people only.
- Commit messages: Conventional Commits (`feat(samples): …`). Small branches, PRs even when working alone.

## 5. Environment
- Windows 11, PowerShell, VS Code. Docker Desktop (WSL 2 backend) runs Postgres and Redis; the API and web run natively.
- Python 3.13 managed by **uv** (`uv add`, `uv sync`, `uv run`). Node 22 with **pnpm**.
- Laptop: 16 GB RAM (Docker capped at 6 GB). Keep at least 40 GB disk free; prune Docker images and the large performance dataset when done with them.
- Use PowerShell-compatible commands in instructions (no bash-only syntax unless running inside a container).

## 6. Commands
*(Fill in during the Setup stage; keep this list current.)*
| Task | Command |
| --- | --- |
| Start database + Redis | `docker compose -f infra/docker-compose.yml up -d` (from repo root; first time: copy `infra/.env.example` to `infra/.env`) |
| Stop database + Redis | `docker compose -f infra/docker-compose.yml down` (add `-v` to wipe local data) |
| API first time | `uv sync`, then copy `.env.example` to `.env` (from `apps/api`) |
| Run API | `uv run fastapi dev` (from `apps/api`) → http://localhost:8000/health |
| Run worker | `uv run celery -A app.workers worker --pool=solo -l info` (Windows dev) |
| Run web | `pnpm dev` (from `apps/web`) |
| Migrate | `uv run alembic upgrade head` |
| Backend tests | `uv run pytest` |
| Frontend tests | `pnpm test` |
| End-to-end | `pnpm e2e` |
| Lint + types | `uv run ruff check .; uv run ruff format --check .; uv run mypy .` · `pnpm lint; pnpm typecheck` (PowerShell 5.1 has no `&&`) |

## 7. Definition of done
- [ ] Matches FLOWS.md and ROLES.md
- [ ] Loading, empty, error, success states built
- [ ] Tests written and passing (see TESTING.md for the type), CI green
- [ ] New queries checked with `EXPLAIN ANALYZE`
- [ ] Screenshot checked against DESIGN.md
- [ ] Audit entries written for every change
- [ ] PROGRESS.md updated
