"""Test factories: plain SQL as the OWNER role, so each test states exactly what exists.

Only tests import this module. Fictional people and labs only (CLAUDE.md §4).
"""

from uuid import UUID

from sqlalchemy import Connection, text

from app.core.ids import uuid7
from app.core.security import hash_password

PASSWORD = "correct horse battery staple"  # noqa: S105  # test-only
PASSWORD_HASH = hash_password(PASSWORD)  # hashed once: Argon2 is slow on purpose


def make_lab(db: Connection, slug: str = "demo", status: str = "active") -> UUID:
    lab_id = uuid7()
    db.execute(
        text("INSERT INTO labs (id, name, slug, status) VALUES (:id, :name, :slug, :status)"),
        {"id": lab_id, "name": f"{slug.title()} Laboratory", "slug": slug, "status": status},
    )
    return lab_id


def make_user(
    db: Connection,
    lab_id: UUID,
    email: str = "ada@demo-lab.example",
    *,
    roles: tuple[str, ...] = ("lab_scientist",),
    sections: tuple[str, ...] = ("chem_path",),
    status: str = "active",
    password_hash: str | None = PASSWORD_HASH,
) -> UUID:
    user_id = uuid7()
    db.execute(
        text(
            "INSERT INTO users (id, lab_id, full_name, email, password_hash, status) "
            "VALUES (:id, :lab, 'Ada Nwosu', :email, :hash, :status)"
        ),
        {"id": user_id, "lab": lab_id, "email": email, "hash": password_hash, "status": status},
    )
    for role in roles:
        db.execute(
            text("INSERT INTO user_roles VALUES (:lab, :user, :role)"),
            {"lab": lab_id, "user": user_id, "role": role},
        )
    for section in sections:
        db.execute(
            text("INSERT INTO user_sections VALUES (:lab, :user, :section)"),
            {"lab": lab_id, "user": user_id, "section": section},
        )
    return user_id


ADMIN_EMAIL = "admin@platform.example"


def make_admin(db: Connection, *, totp_secret: str | None = None, active: bool = True) -> UUID:
    """A super-admin. With `totp_secret`, 2FA is already set up (stored encrypted)."""
    from app.core.platform_security import encrypt_secret

    admin_id = uuid7()
    db.execute(
        text(
            "INSERT INTO platform_admins (id, email, full_name, password_hash, totp_secret_enc, "
            "active) VALUES (:id, :email, 'Platform Admin', :hash, :secret, :active)"
        ),
        {
            "id": admin_id,
            "email": ADMIN_EMAIL,
            "hash": PASSWORD_HASH,
            "secret": encrypt_secret(totp_secret) if totp_secret else None,
            "active": active,
        },
    )
    return admin_id
