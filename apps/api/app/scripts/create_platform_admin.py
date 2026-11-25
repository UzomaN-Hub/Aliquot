"""Create a super-admin: `uv run python -m app.scripts.create_platform_admin`.

For staging and production, run it on your own computer. Every secret is typed into
a hidden prompt: nothing is echoed, saved to shell history, or written to a log.
(CI logs are public for this repo, so this never runs in GitHub Actions.)

2FA is set up at the first console sign-in.
"""

import getpass
import sys

from sqlalchemy import create_engine, text

from app.core.ids import uuid7
from app.core.security import hash_password

MIN_PASSWORD_LENGTH = 16  # super-admins hold the keys to every lab


def main() -> None:
    print("Create a super-admin. Hidden prompts show nothing while you type or paste.\n")
    url = getpass.getpass("Database owner URL (Session pooler, postgresql+psycopg://…): ").strip()
    if not url.startswith("postgresql+psycopg://"):
        sys.exit("The URL must start with postgresql+psycopg://")
    email = input("Email: ").strip().lower()
    full_name = input("Full name: ").strip()
    password = getpass.getpass(f"Password (at least {MIN_PASSWORD_LENGTH} characters): ")
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Use at least {MIN_PASSWORD_LENGTH} characters.")
    if getpass.getpass("Password again: ") != password:
        sys.exit("The passwords don't match.")
    if "@" not in email or not full_name:
        sys.exit("Enter an email and a name.")

    engine = create_engine(url)
    with engine.begin() as connection:
        exists = connection.execute(
            text("SELECT 1 FROM platform_admins WHERE email = :email"), {"email": email}
        ).first()
        if exists:
            sys.exit("A super-admin with that email already exists.")
        connection.execute(
            text(
                "INSERT INTO platform_admins (id, email, full_name, password_hash) "
                "VALUES (:id, :email, :name, :hash)"
            ),
            {"id": uuid7(), "email": email, "name": full_name, "hash": hash_password(password)},
        )
    engine.dispose()
    print(f"\nDone. Sign in at /console/sign-in as {email}; you'll set up 2FA there.")


if __name__ == "__main__":
    main()
