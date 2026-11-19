# uv — Python package manager

**What it is:** one tool that replaces pip, venv and pip-tools. Made by Astral (the Ruff team).

**Why we use it:** it's fast (10–100× pip), and it writes `uv.lock`, which pins the exact version of every package so your laptop, CI and Render install identical code.

**What goes wrong without a lock file:** a package releases a new version, the server installs it, and something breaks that works on your laptop.

## Commands
| Want to | pip way | uv way |
| --- | --- | --- |
| Start a project | `python -m venv .venv` | `uv init` |
| Add a package | `pip install fastapi` | `uv add fastapi` |
| Add a dev-only package | `pip install pytest` | `uv add --dev pytest` |
| Remove a package | `pip uninstall fastapi` | `uv remove fastapi` |
| Install everything (fresh clone) | `pip install -r requirements.txt` | `uv sync` |
| Run a command | activate venv, then `python x.py` | `uv run python x.py` |
| Export for pip users | `pip freeze > requirements.txt` | `uv export --format requirements-txt > requirements.txt` |

## Files
- `pyproject.toml` — the packages you asked for (you edit this through `uv add`).
- `uv.lock` — the exact versions resolved (never edit by hand; always commit it).
- `.venv/` — the installed packages (never commit it).

## Where it's used in Aliquot
- `apps/api/` — the API, worker and tests.
- `apps/api/Dockerfile` — `uv sync --frozen --no-dev` installs exactly what's in `uv.lock`.
- CI — `uv sync` then `uv run pytest`.
