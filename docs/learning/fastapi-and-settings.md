# FastAPI app and settings

## FastAPI
**What it is:** a Python web framework. You write a function with type hints; FastAPI turns it into an HTTP endpoint, validates input and output with Pydantic, and writes the OpenAPI docs for you (`/docs`).

**Why we use it:** type hints do the validation and the docs at once, and the OpenAPI file later generates the frontend's TypeScript types (`packages/api-types`).

**Without it:** validation written by hand in every endpoint, docs that drift from the code, and frontend types copied by hand.

**Words:**
| Word | Meaning |
| --- | --- |
| Router (`APIRouter`) | A group of endpoints from one module, plugged into the app with `include_router` |
| Schema | A Pydantic model describing a request or response body (`schemas.py`) |
| Dependency (`Depends`) | A function FastAPI calls for you before the endpoint (settings, DB session, current user) |
| `create_app()` | One function that builds the app, so tests and the server build it the same way |

## Settings (pydantic-settings)
**What it is:** a class whose fields are read from environment variables (or `.env`) and type-checked at startup.

**Why we use it:** a missing or wrong setting stops the app **at startup** with a clear message, instead of crashing later in the middle of a request (CONVENTIONS.md §8). It's also how we avoid hard-coding the platform name: `PLATFORM_NAME` lives in config.

**Without it:** `os.environ["X"]` scattered everywhere; a typo in `TENANT_MODE=subdomian` would only show up in production.

## Run it (from `apps/api`)
| Want to | Command |
| --- | --- |
| First time | `uv sync`, then copy `.env.example` to `.env` |
| Start with auto-reload | `uv run fastapi dev` → http://localhost:8000/health, docs at `/docs` |
| Stop | `Ctrl+C` in that terminal |

## Where it's used in Aliquot
- `apps/api/app/main.py` — `create_app()`, includes each module's router.
- `apps/api/app/core/config.py` — `Settings` and `get_settings()`.
- `apps/api/app/modules/health/` — the first module: `router.py` + `schemas.py`.
- `apps/api/.env.example` — every setting, with dummy values.
