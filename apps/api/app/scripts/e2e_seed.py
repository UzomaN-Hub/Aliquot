"""Database for the browser (end-to-end) tests: `uv run python -m app.scripts.e2e_seed`.

Same as dev_db (migrate, role passwords, Tavnit Labs) plus one console admin per
browser, so Chromium, Firefox and WebKit each run the full 2FA setup without
tripping over each other. Re-running resets those admins' 2FA, so the setup flow
is tested every time. Fictional data; refuses to run outside ENVIRONMENT=local.
"""

from sqlalchemy import create_engine, text

from app.core.config import get_settings
from app.core.ids import uuid7
from app.core.security import hash_password
from app.scripts.dev_db import migrate, seed_working_lab, set_app_role_password

BROWSERS = ("chromium", "firefox", "webkit")
E2E_ADMIN_PASSWORD = "e2e-admin-password-2026"  # noqa: S105  # fictional, test-only


def main() -> None:
    settings = get_settings()
    if settings.environment != "local":
        raise SystemExit("e2e_seed only runs with ENVIRONMENT=local.")
    if settings.migration_database_url is None:
        raise SystemExit("Set MIGRATION_DATABASE_URL first.")

    migrate()
    engine = create_engine(settings.migration_database_url)
    password_hash = hash_password(E2E_ADMIN_PASSWORD)
    with engine.begin() as connection:
        set_app_role_password(connection, settings.database_url)
        set_app_role_password(connection, settings.platform_database_url)
        seed_working_lab(connection)
        for browser in BROWSERS:
            connection.execute(
                text(
                    "INSERT INTO platform_admins (id, email, full_name, password_hash) "
                    "VALUES (:id, :email, :name, :hash) "
                    "ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, "
                    "totp_secret_enc = NULL, totp_last_step = NULL, totp_failed_attempts = 0, "
                    "totp_locked_until = NULL, active = true"
                ),
                {
                    "id": uuid7(),
                    "email": f"e2e-{browser}@platform.example",
                    "name": f"E2E Admin {browser.title()}",
                    "hash": password_hash,
                },
            )
    engine.dispose()
    print("E2E database ready: Tavnit Labs + one console admin per browser.")


if __name__ == "__main__":
    main()
