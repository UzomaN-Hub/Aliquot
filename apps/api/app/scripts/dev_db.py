"""Local database setup in one command: `uv run python -m app.scripts.dev_db`.

1. Applies every migration (as the owner role).
2. Gives the app role the password in DATABASE_URL, so the API can log in.
3. Seeds a fictional demo lab with three staff (idempotent: safe to run again).

Refuses to run anywhere but ENVIRONMENT=local.
"""

from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, create_engine, make_url, text

from app.core.config import get_settings
from app.core.ids import uuid7
from app.core.security import hash_password

DEMO_SLUG = "demo"
DEMO_PASSWORD = "demo-password-2026"  # noqa: S105  # fictional local-only seed data
DEMO_STAFF = (
    ("Ada Nwosu", "manager@demo-lab.example", "manager", None),
    ("Ngozi Bello", "chief@demo-lab.example", "chief_scientist", "chem_path"),
    ("Chidi Okafor", "scientist@demo-lab.example", "lab_scientist", "chem_path"),
)


def migrate() -> None:
    command.upgrade(Config("alembic.ini"), "head")


def set_app_role_password(connection: Connection, database_url: str) -> None:
    url = make_url(database_url)
    if not url.username or not url.password:
        raise RuntimeError("DATABASE_URL needs a username and password.")
    # A role name can't be a bound parameter; format()'s %I and %L quote it safely.
    statement = connection.execute(
        text(
            "SELECT format('ALTER ROLE %I PASSWORD %L', "
            "CAST(:role AS text), CAST(:password AS text))"
        ),
        {"role": url.username, "password": url.password},
    ).scalar_one()
    connection.execute(text(statement))


def seed_demo_lab(connection: Connection) -> bool:
    exists = connection.execute(
        text("SELECT 1 FROM labs WHERE slug = :slug"), {"slug": DEMO_SLUG}
    ).first()
    if exists:
        return False

    lab_id = uuid7()
    connection.execute(
        text("INSERT INTO labs (id, name, slug) VALUES (:id, :name, :slug)"),
        {"id": lab_id, "name": "Demo Diagnostic Laboratory", "slug": DEMO_SLUG},
    )
    connection.execute(
        text(
            "INSERT INTO lab_sections (lab_id, section) "
            "SELECT :lab_id, s FROM unnest(enum_range(NULL::lab_section)) AS s"
        ),
        {"lab_id": lab_id},
    )
    password_hash = hash_password(DEMO_PASSWORD)
    for full_name, email, role, section in DEMO_STAFF:
        user_id = uuid7()
        connection.execute(
            text(
                "INSERT INTO users (id, lab_id, full_name, email, password_hash, status) "
                "VALUES (:id, :lab_id, :full_name, :email, :hash, 'active')"
            ),
            {
                "id": user_id,
                "lab_id": lab_id,
                "full_name": full_name,
                "email": email,
                "hash": password_hash,
            },
        )
        connection.execute(
            text("INSERT INTO user_roles (lab_id, user_id, role) VALUES (:lab, :user, :role)"),
            {"lab": lab_id, "user": user_id, "role": role},
        )
        if section:
            connection.execute(
                text(
                    "INSERT INTO user_sections (lab_id, user_id, section) "
                    "VALUES (:lab, :user, :section)"
                ),
                {"lab": lab_id, "user": user_id, "section": section},
            )
    return True


def main() -> None:
    settings = get_settings()
    if settings.environment != "local":
        raise SystemExit("dev_db only runs with ENVIRONMENT=local.")
    if settings.migration_database_url is None:
        raise SystemExit("Set MIGRATION_DATABASE_URL in apps/api/.env first.")

    migrate()
    engine = create_engine(settings.migration_database_url)
    with engine.begin() as connection:
        set_app_role_password(connection, settings.database_url)
        created = seed_demo_lab(connection)
    engine.dispose()

    print("Database migrated; app role password set.")
    if created:
        print(f"Demo lab created at /l/{DEMO_SLUG}. Staff (password: {DEMO_PASSWORD}):")
        for full_name, email, role, _ in DEMO_STAFF:
            print(f"  {email:<30} {full_name} ({role})")
    else:
        print("Demo lab already exists.")


if __name__ == "__main__":
    main()
