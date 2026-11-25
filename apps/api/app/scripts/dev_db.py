"""Local database setup in one command: `uv run python -m app.scripts.dev_db`.

1. Applies every migration (as the owner role).
2. Gives the app role the password in DATABASE_URL, so the API can log in.
3. Seeds Tavnit Labs, our fictional working lab, with its staff
   (idempotent: safe to run again).

Refuses to run anywhere but ENVIRONMENT=local.
"""

from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, create_engine, make_url, text

from app.core.config import get_settings
from app.core.ids import uuid7
from app.core.security import hash_password

# Fictional lab and people (CLAUDE.md §4). Emails use the reserved .example domain.
LAB_NAME = "Tavnit Labs"
LAB_SLUG = "tavnit"
STAFF_PASSWORD = "tavnit-dev-2026"  # noqa: S105  # fictional, local-only seed data
STAFF: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("Ifeoma Adeyemi", "ifeoma@tavnit-labs.example", "manager", ()),
    ("Tunde Bakare", "tunde@tavnit-labs.example", "chief_scientist", ("chem_path",)),
    ("Amina Yusuf", "amina@tavnit-labs.example", "chief_scientist", ("haematology",)),
    ("Emeka Obi", "emeka@tavnit-labs.example", "chief_scientist", ("microbiology",)),
    ("Chidinma Eze", "chidinma@tavnit-labs.example", "lab_scientist", ("chem_path",)),
    ("Musa Ibrahim", "musa@tavnit-labs.example", "lab_scientist", ("haematology",)),
    ("Blessing Okon", "blessing@tavnit-labs.example", "front_desk", ()),
)


# A local-only super-admin for the console. 2FA is set up on first sign-in with any
# authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).
ADMIN_NAME = "Platform Admin"
ADMIN_EMAIL = "admin@platform.example"
ADMIN_PASSWORD = "platform-dev-2026"  # noqa: S105  # fictional, local-only seed data


def seed_platform_admin(connection: Connection) -> bool:
    exists = connection.execute(
        text("SELECT 1 FROM platform_admins WHERE email = :email"), {"email": ADMIN_EMAIL}
    ).first()
    if exists:
        return False
    connection.execute(
        text(
            "INSERT INTO platform_admins (id, email, full_name, password_hash) "
            "VALUES (:id, :email, :name, :hash)"
        ),
        {
            "id": uuid7(),
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME,
            "hash": hash_password(ADMIN_PASSWORD),
        },
    )
    return True


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


def seed_working_lab(connection: Connection) -> bool:
    """Create Tavnit Labs with all three sections and its staff. False if it exists."""
    exists = connection.execute(
        text("SELECT 1 FROM labs WHERE slug = :slug"), {"slug": LAB_SLUG}
    ).first()
    if exists:
        return False

    lab_id = uuid7()
    connection.execute(
        text("INSERT INTO labs (id, name, slug) VALUES (:id, :name, :slug)"),
        {"id": lab_id, "name": LAB_NAME, "slug": LAB_SLUG},
    )
    connection.execute(
        text(
            "INSERT INTO lab_sections (lab_id, section) "
            "SELECT :lab_id, s FROM unnest(enum_range(NULL::lab_section)) AS s"
        ),
        {"lab_id": lab_id},
    )
    password_hash = hash_password(STAFF_PASSWORD)
    for full_name, email, role, sections in STAFF:
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
        for section in sections:
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
        set_app_role_password(connection, settings.platform_database_url)
        created = seed_working_lab(connection)
        admin_created = seed_platform_admin(connection)
    engine.dispose()

    print("Database migrated; app and platform role passwords set.")
    if admin_created:
        print(f"Console: /console/sign-in as {ADMIN_EMAIL} (password: {ADMIN_PASSWORD}).")
    if created:
        print(f"{LAB_NAME} created at /l/{LAB_SLUG}. Staff (password: {STAFF_PASSWORD}):")
        for full_name, email, role, sections in STAFF:
            where = f", {', '.join(sections)}" if sections else ""
            print(f"  {email:<32} {full_name} ({role}{where})")
    else:
        print(f"{LAB_NAME} already exists.")


if __name__ == "__main__":
    main()
