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

**Job `ci-ok` ("CI passed")** — the only check the ruleset requires.
- `if: always()` runs it even when others fail or are skipped.
- It fails if any job in `needs:` failed or was cancelled; "skipped" counts as fine.
- Adding a job later = add it to `needs:`; the ruleset never changes.

## Coming next in this file
Postgres + Redis **service containers** (when the first migration lands), the web job (`apps/web/**`), E2E, security scans. Then `deploy-staging.yml` and `release.yml` (CONVENTIONS.md §4).

## Where it's used in Aliquot
- `.github/workflows/ci.yml`
- Ruleset `protect-main` → "Require status checks to pass" → `CI passed`.
- Decision 005: job-level path filters + one gate check.
