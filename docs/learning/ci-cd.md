# CI/CD with GitHub Actions

**What it is:** **CI** (continuous integration) = a robot that runs our checks on every pull request. **CD** (continuous deployment) = a robot that deploys after a merge or a release tag. GitHub Actions runs both, from YAML files in `.github/workflows/`.

**Why we use it:** `main` must always be deployable (CONVENTIONS.md §3). The ruleset blocks a merge until CI is green, so a broken lint, type error or failing test can't reach `main`, even when you're tired or in a hurry.

**Without it:** "I'll run the tests later", then a broken `main` gets deployed to a lab.

## Words
| Word | Meaning |
| --- | --- |
| Workflow | One YAML file (`ci.yml`). Started by **triggers** (`on:`) |
| Job | A group of steps on one fresh virtual machine (the **runner**). Jobs run in parallel unless one `needs:` another |
| Step | One command (`run:`) or one reusable **action** (`uses:`) |
| Action | A packaged step someone published, e.g. `actions/checkout` (download our code) |
| Runner | The machine: `ubuntu-24.04` = a clean Linux VM, thrown away after the job |
| Status check | A job's result shown on the PR. The ruleset can require it |

## `ci.yml`, part by part
**Triggers (`on:`)**
- `pull_request: branches: [main]` — every PR into `main`.
- `push: branches: [main]` — again after merge. Checks `main` itself and saves caches there (PRs can reuse `main`'s caches, not each other's).
- `workflow_dispatch` — a "Run workflow" button on the Actions tab; runs every job.

**`permissions: contents: read`** — the job's token can only read code. If a dependency were ever malicious, it couldn't push code or edit the repo.

**`concurrency`** — push twice to a PR and the first run is cancelled (saves minutes). On `main` nothing is cancelled.

**Job `changes` (path filter)** — compares the PR's files with its base commit and outputs `api=true/false`.
- `fetch-depth: 0` downloads full history so the diff has both commits.
- Values from GitHub (`${{ … }}`) go into `env:` first and the script reads `$PR_BASE`. Pasting `${{ … }}` straight into a script lets a crafted branch name inject commands.
- Changing `ci.yml` itself also counts, so a CI edit is tested by CI.
- *Why not `on: pull_request: paths:`?* A workflow skipped that way reports nothing, and a required check then waits forever. A skipped **job** reports "skipped", which the gate treats as fine (decision 005).

**Job `api`**
- `needs: changes` + `if: needs.changes.outputs.api == 'true'` — runs only when the API changed.
- `working-directory: apps/api` — every `run:` starts there.
- `env:` — the four settings the app requires, with dummy values. CI has no `.env` file.
- `actions/checkout@<sha> # v7.0.1` — pinned to an exact **commit**, not a tag. A tag can be moved to other code by whoever controls the action; a commit hash can't. The comment says which version it is.
- `persist-credentials: false` — don't leave the Git token on the disk for later steps.
- `astral-sh/setup-uv` — installs uv `0.13.9` (same as the laptop). `enable-cache` keeps downloaded packages between runs, keyed on `uv.lock`: same lock = cache hit = fast install. `cache-python` caches Python 3.13 too.
- `uv sync --locked` — installs exactly `uv.lock`; **fails** if `pyproject.toml` and `uv.lock` disagree (you forgot to commit the lock).
- Then the same checks as on the laptop: `ruff check` (`--output-format=github` puts errors as comments on the PR's lines), `ruff format --check`, `mypy`, `pytest`.
- `timeout-minutes` — a stuck job is killed instead of burning minutes for 6 hours.
- `services: postgres` — a **service container**: GitHub starts `postgres:17-alpine` next to the job, waits for its health check, and exposes it on `127.0.0.1:5432`. Tests run against real Postgres, so RLS, roles and migrations are proven, not mocked. It's thrown away after the job.
- `env:` database lines — dummy credentials that only exist inside that throwaway container. `TEST_DB_ADMIN_URL` lets pytest create its own `aliquot_test` database.
- "Migrations up, down, up" — applies every migration, rolls all of them back, applies again. Catches a broken `downgrade()` before it's needed in an emergency.

**Job `web`** — same shape as `api`, for `apps/web/**`.
- `pnpm/action-setup` installs the pnpm version named in `apps/web/package.json` (`packageManager`), so CI and laptop match.
- `actions/setup-node` installs Node 22 and caches pnpm's downloads, keyed on `apps/web/pnpm-lock.yaml`.
- `pnpm install --frozen-lockfile` — fails if `package.json` and the lock file disagree (like `uv sync --locked`).
- Then `lint`, `format:check`, `typecheck`, `test`, `build`. The build needs the four config variables (dummy values in `env:`); `NEXT_TELEMETRY_DISABLED` stops Next.js sending usage stats from CI.

**Job `ci-ok` ("CI passed")** — the only check the ruleset requires.
- `if: always()` runs it even when others fail or are skipped.
- It fails if any job in `needs:` failed or was cancelled; "skipped" counts as fine.
- Adding a job later = add it to `needs:`; the ruleset never changes.

**Job `e2e`** (browser tests, decision 016): runs when the API or the web changes.
- A Postgres service container, the API's and web's dependencies, then `playwright install --with-deps` for Chromium, Firefox and WebKit. The browsers (~400 MB) are cached with **`actions/cache`**, keyed on the lock file.
- `e2e_seed` prepares the database, `pnpm build` builds the web, and `pnpm e2e` makes Playwright start the API and `next start` itself.
- `ENVIRONMENT=local` here means "plain http on localhost", so cookies work in every engine.
- `if: failure()` + **`actions/upload-artifact`** keeps the report (screenshots, traces) for 7 days, downloadable from the run's page.

## `deploy-staging.yml`, part by part
**Trigger `workflow_run`** — runs when the **CI** workflow *finishes* on `main`; the first job checks it *passed*. A red `main` never deploys. `workflow_dispatch` adds a manual "Run workflow" button.
**`head_sha`** — every job checks out the exact commit CI tested, not whatever `main` has become since.
**`concurrency` with `cancel-in-progress: false`** — two quick merges deploy one after the other; a migration is never killed halfway.
**Job `changes`** — squash merges make one commit per PR, so `git diff HEAD~1 HEAD` is the whole PR. It reports two answers, `api` and `web`. Web-only merges skip the API deploy (Vercel handles the web).
**Job `migrate`** — `alembic upgrade head` against Supabase **before** the new code starts, so new code never meets an old schema. `--no-dev` installs only runtime packages. The connection string comes from the secret `STAGING_MIGRATION_DATABASE_URL` (owner role, Session pooler).
**Job `deploy-api`**
- Calls Render's **deploy hook** (secret `RENDER_DEPLOY_HOOK_URL`) with `ref=<sha>`.
- Polls `/health` until it reports that commit (Render sets `RENDER_GIT_COMMIT`), so the job never "passes" against the old version.
- **Smoke test:** asks for a lab that doesn't exist. A clean `404 lab_not_found` proves the API reached Postgres; a 500 means it can't.
**Job `verify-web`** (decision 022) — runs when the web app changed. Vercel deploys the web on its own, so this job only *checks* it:
- `sparse-checkout` fetches just `globals.css`; the job needs nothing else.
- It polls the web's `/api/health` until `commit` matches this merge. Vercel sets `VERCEL_GIT_COMMIT_SHA`, and the health route reports it. This way the job never tests the old version.
- It downloads the live page's stylesheet(s). Then it checks that every class defined in `globals.css` (lines starting with `.name`) appears in them.
- Why: on 27 Nov, Vercel's build cache served the *old* compiled `globals.css` with the *new* pages. The new classes had no styles, so the wordmark showed at 14px and the pill had no colour. Our own CI tests passed because CI builds from scratch. This check fails loudly instead of letting Uzoma find it.
**`environment: staging`** — groups the deploy jobs on GitHub's Environments page; protection rules (for example, required approval) can be added later without changing the YAML.

**Secrets** live in GitHub → Settings → Secrets and variables → Actions. A workflow reads them as `${{ secrets.NAME }}`; GitHub hides them in logs. They never appear in the repo.

## Coming next in this file
Redis service container (with the worker), the 150 KB bundle budget, E2E, security scans. Then `deploy-staging.yml` (migrate staging, then deploy) and `release.yml` (CONVENTIONS.md §4).

## Where it's used in Aliquot
- `.github/workflows/ci.yml`
- Ruleset `protect-main` → "Require status checks to pass" → `CI passed`.
- Decision 005: job-level path filters + one gate check.
