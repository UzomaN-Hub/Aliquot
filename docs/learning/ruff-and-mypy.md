# Ruff and mypy — checking code before it runs

## Ruff (lint + format)
**What it is:** one fast tool that does two jobs. The **linter** finds likely bugs and bad patterns (unused imports, bare `except`, `assert` in app code). The **formatter** rewrites spacing and quotes into one standard style.

**Why we use it:** CI rejects messy or risky code automatically, and nobody argues about style.

**Without it:** small bugs (an unused variable that should have been used, a security smell) reach review or production; diffs fill with style noise.

## mypy (strict)
**What it is:** a type checker. It reads the type hints and proves, without running the code, that you never pass a `str` where an `int` is expected or forget that something can be `None`.

**Why we use it:** in a lab system a `None` result value or a wrong unit type is a clinical bug. mypy catches whole classes of these before tests even run. `strict = true` means every function must have type hints.

**Without it:** those bugs show up as crashes at runtime, often on the one path no test covered.

## Commands (from `apps/api`)
| Want to | Command |
| --- | --- |
| Lint | `uv run ruff check .` |
| Lint and auto-fix what's safe | `uv run ruff check . --fix` |
| Format | `uv run ruff format .` |
| Check format only (what CI does) | `uv run ruff format --check .` |
| Type check | `uv run mypy .` |

## Where it's used in Aliquot
- `apps/api/pyproject.toml` — `[tool.ruff]`, `[tool.ruff.lint]` (rule sets chosen, `S101` allowed in tests), `[tool.mypy]` (strict + Pydantic plugin).
- CI (`ci.yml`, next step) runs all three on every pull request.
