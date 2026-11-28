"""Database for the browser (end-to-end) tests: `uv run python -m app.scripts.e2e_seed`.

Same as dev_db (migrate, role passwords, Tavnit Labs) plus, per browser:
- a console admin with no 2FA, so Chromium, Firefox and WebKit each run the full 2FA
  setup without tripping over each other (re-running resets it);
- a "team" admin whose 2FA secret is known to the tests (e2e/console-team.spec.ts),
  so the team test can sign in directly;
- an "account" admin, also with a known secret, for My account (e2e/console-account.spec.ts).
  Re-running signs out its old sessions and cancels its unused recovery codes, since the
  test changes its password, codes and phone.
Fictional data; refuses to run outside ENVIRONMENT=local.
"""

from sqlalchemy import Connection, create_engine, text

from app.core.config import get_settings
from app.core.ids import uuid7
from app.core.platform_security import encrypt_secret
from app.core.security import hash_password
from app.scripts.dev_db import migrate, seed_working_lab, set_app_role_password

BROWSERS = ("chromium", "firefox", "webkit")
E2E_ADMIN_PASSWORD = "e2e-admin-password-2026"  # noqa: S105  # fictional, test-only
# A test-only authenticator secret (base32), the same in e2e/console-team.spec.ts.
E2E_TEAM_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"  # noqa: S105  # fictional, test-only
# The same in e2e/console-account.spec.ts.
E2E_ACCOUNT_TOTP_SECRET = "KRUGS4ZANFZSAYJAORSXG5BAONSWG4TF"  # noqa: S105  # fictional, test-only


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
            connection.execute(
                text(
                    "INSERT INTO platform_admins (id, email, full_name, password_hash, "
                    "totp_secret_enc) VALUES (:id, :email, :name, :hash, :secret) "
                    "ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, "
                    "totp_secret_enc = EXCLUDED.totp_secret_enc, totp_last_step = NULL, "
                    "totp_failed_attempts = 0, totp_locked_until = NULL, active = true, "
                    "deactivated_at = NULL"
                ),
                {
                    "id": uuid7(),
                    "email": f"e2e-team-{browser}@platform.example",
                    "name": f"E2E Team {browser.title()}",
                    "hash": password_hash,
                    "secret": encrypt_secret(E2E_TEAM_TOTP_SECRET),
                },
            )
            _seed_account_admin(connection, browser, password_hash)
    engine.dispose()
    print("E2E database ready: Tavnit Labs + three console admins per browser.")


def _seed_account_admin(connection: Connection, browser: str, password_hash: str) -> None:
    """Back to a known start: the seed password and secret, no live sessions or codes.
    Nothing is deleted (sessions and codes are revoked, as the app itself does)."""
    params = {"email": f"e2e-account-{browser}@platform.example"}
    connection.execute(
        text(
            "INSERT INTO platform_admins (id, email, full_name, password_hash, "
            "totp_secret_enc) VALUES (:id, :email, :name, :hash, :secret) "
            "ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, "
            "totp_secret_enc = EXCLUDED.totp_secret_enc, totp_last_step = NULL, "
            "totp_failed_attempts = 0, totp_locked_until = NULL, active = true, "
            "deactivated_at = NULL, password_changed_at = NULL"
        ),
        params
        | {
            "id": uuid7(),
            "name": f"E2E Account {browser.title()}",
            "hash": password_hash,
            "secret": encrypt_secret(E2E_ACCOUNT_TOTP_SECRET),
        },
    )
    connection.execute(
        text(
            "UPDATE platform_sessions SET revoked_at = now() WHERE revoked_at IS NULL "
            "AND admin_id = (SELECT id FROM platform_admins WHERE email = :email)"
        ),
        params,
    )
    connection.execute(
        text(
            "UPDATE platform_recovery_codes SET revoked_at = now() WHERE used_at IS NULL "
            "AND revoked_at IS NULL "
            "AND admin_id = (SELECT id FROM platform_admins WHERE email = :email)"
        ),
        params,
    )


if __name__ == "__main__":
    main()
