# Deployment — Docker image, Render and Vercel

## Docker image (the API)
**What it is:** a `Dockerfile` is a recipe that packs Python, our dependencies and our code into one **image**. Render runs that image; so could any other host.

**Why we use it:** the server runs exactly what we tested: same Python (3.13-slim), same packages (`uv.lock`), same code. Moving hosts later means running the same image somewhere else.

**Without it:** the host installs things its own way, versions drift, and "works in CI" stops meaning "works in production".

**Our `apps/api/Dockerfile`, line by line:**
| Line | Why |
| --- | --- |
| `FROM python:3.13-slim` | Small official Python image (STACK.md) |
| `COPY --from=ghcr.io/astral-sh/uv:0.13.9 …` | Takes just the uv binary, same version as laptop/CI |
| `UV_COMPILE_BYTECODE=1` | Pre-compiles `.pyc` files: faster cold start |
| `UV_PYTHON_DOWNLOADS=never` | Use the image's Python, never download another |
| `COPY pyproject.toml uv.lock …` then `uv sync --locked --no-dev --no-install-project` | Dependencies first, as their own **layer**. Docker reuses it until `uv.lock` changes, so code-only changes rebuild in seconds. `--no-dev`: no pytest/ruff/mypy in production |
| `COPY app ./app` | Our code, after the dependencies |
| `useradd … appuser` + `USER appuser` | Don't run as root: a bug in the app can't take over the container |
| `CMD … --port ${PORT:-8000}` | Render tells us the port in `$PORT`; locally it's 8000. `exec` makes the server receive shutdown signals directly |

`.dockerignore` keeps `.venv`, `.env`, caches and tests out of the image (smaller, no secrets).

**Try it (from `apps/api`):**
```powershell
docker build -t aliquot-api:local .
docker run --rm -p 127.0.0.1:8001:8000 -e ENVIRONMENT=local -e PLATFORM_NAME=Aliquot -e PLATFORM_DOMAIN=localhost -e TENANT_MODE=path aliquot-api:local
# open http://127.0.0.1:8001/health, then Ctrl+C
docker image rm aliquot-api:local   # free the disk space (~400 MB)
```

## Render (API) and Vercel (web)
| | Render | Vercel |
| --- | --- | --- |
| Runs | `apps/api` Docker image | `apps/web` Next.js build |
| Region | Frankfurt | Functions in `fra1` (Frankfurt), via `apps/web/vercel.json` |
| Deploys when | A commit lands on `main` **and CI passed** | A commit lands on `main` (production), every PR (preview URL) |
| Health check | `/health` — Render only switches traffic to a new deploy once it answers | `/api/health` |
| Settings | Environment tab in the dashboard | Project → Settings → Environment Variables |

**Free-tier note:** Render's free API sleeps after ~15 min without traffic; the next request takes ~30 s to wake it. Fine for now; production uses paid always-on instances (STACK.md).

**Environment variables are set on the host, never committed.** The `.env.example` files list every name; the dashboards hold the values (CONVENTIONS.md §8).

## Where it's used in Aliquot
- `apps/api/Dockerfile`, `apps/api/.dockerignore`
- `apps/web/vercel.json`
- CI job `api` → step "Docker image builds"
- Decision 007: auto-deploy via Git integrations for now.
