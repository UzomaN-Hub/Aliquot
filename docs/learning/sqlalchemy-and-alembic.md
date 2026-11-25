# SQLAlchemy, Alembic and psycopg — talking to Postgres

## The three pieces
| Piece | What it is | Why we use it | Without it |
| --- | --- | --- | --- |
| **psycopg 3** | The driver: the code that speaks Postgres' network protocol | Sync and async in one package (API async, worker sync) — decision 011 | Nothing can reach the database |
| **SQLAlchemy 2** | Turns Python classes into tables (**models**) and Python expressions into SQL | Typed queries, mypy catches a wrong column name; parameters are always bound (no SQL injection) | Hand-built SQL strings everywhere |
| **Alembic** | Versioned database changes (**migrations**), one file per change | Every database (laptop, CI, staging, production) reaches the same shape by running the same files in order | "Did you run that ALTER on production?" |

## Words
| Word | Meaning |
| --- | --- |
| Model | A class mapped to a table: `class User(Base)` → `users` (`app/modules/*/models.py`) |
| Session | A unit of work: changes collect in it and are sent to the database together |
| Transaction | All-or-nothing: `async with transaction()` commits everything inside, or rolls back on any error |
| Repository | The only place SQL lives; takes a session, returns models (CLAUDE.md) |
| Migration | A file with `upgrade()` and `downgrade()` in `apps/api/migrations/versions/` |
| Head | The newest migration. `alembic upgrade head` = apply everything not yet applied |

## How we use them
- **Services own transactions:** `async with transaction() as session:`. The change and its audit entry commit together (`app/core/db.py`).
- **Lab-scoped work:** `async with lab_transaction(claims.lab_id)`. Sets the tenant for row-level security first (see `row-level-security.md`).
- **Migrations are plain SQL** inside `op.execute(...)`, so every policy and grant is readable in one place (`migrations/versions/20261124_0001_foundation.py`).
- **Two connection strings:** `DATABASE_URL` (the API's restricted role) and `MIGRATION_DATABASE_URL` (the owner, migrations only).
- **All datetimes are `timestamptz`** (`type_annotation_map` in `Base`). Without it SQLAlchemy sends naive times and the zone is lost.

## Commands (from `apps/api`)
| Want to | Command |
| --- | --- |
| Set up the local database (migrate, role password, demo lab) | `uv run python -m app.scripts.dev_db` |
| Apply migrations | `uv run alembic upgrade head` |
| Roll back everything | `uv run alembic downgrade base` |
| Where am I? | `uv run alembic current` |
| New migration file | `uv run alembic revision -m "add patients" --rev-id 0002` |

**Rules (CONVENTIONS.md §7):** never edit a merged migration, always write the downgrade, and CI checks up → down → up on every PR.

## Where it's used in Aliquot
`app/core/db.py` · `app/models.py` · `app/modules/*/models.py` and `repository.py` · `alembic.ini` · `migrations/` · `app/scripts/dev_db.py`
