# pytest — backend tests

**What it is:** Python's standard test runner. Any function named `test_…` in a file named `test_….py` is a test; plain `assert` checks the result.

**Why we use it:** each rule (a flag, a permission, a tenant boundary) gets a test that runs on every pull request, so a later change can't quietly break it.

**Without it:** you check by hand in the browser, forget a case, and a regression reaches a patient's result.

## Anatomy of an API test
```python
from fastapi.testclient import TestClient   # calls the app in-process; no server needed

from app.main import app

client = TestClient(app)


def test_something() -> None:      # name starts with test_; -> None for mypy strict
    response = client.get("/some-path")   # Arrange + Act
    assert response.status_code == 200   # Assert
```
Pattern: **Arrange** (set up), **Act** (call the thing), **Assert** (check the result).

## Commands (from `apps/api`)
| Want to | Command |
| --- | --- |
| Run all tests | `uv run pytest` |
| One file | `uv run pytest app/modules/health/tests/test_router.py` |
| Show each test name | `uv run pytest -v` |
| Stop at first failure | `uv run pytest -x` |

## Where tests live in Aliquot
- Next to the module they test: `app/modules/<module>/tests/` (CONVENTIONS.md §2).
- `pyproject.toml` → `[tool.pytest.ini_options]`: look under `app/`, `--import-mode=importlib` (no `__init__.py` needed in test folders).
- First test: `app/modules/health/tests/test_router.py`.
