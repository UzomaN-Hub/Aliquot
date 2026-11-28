"""My account for super-admins: recovery codes and password age (decision 023).

Revision ID: 0004
Revises: 0003
Created: 2026-11-27

Recovery codes let a super-admin sign in when their phone is gone. Each is 80 random
bits, shown once and stored as a SHA-256 hash (like refresh tokens: nothing to
brute-force, and the lookup is an exact, indexed match). Single use; making a new
set revokes the old one. Nothing is deleted: used and revoked codes stay as a record.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE platform_admins ADD COLUMN password_changed_at timestamptz;

    CREATE TABLE platform_recovery_codes (
      id uuid PRIMARY KEY,
      admin_id uuid NOT NULL REFERENCES platform_admins (id),
      code_hash text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      used_at timestamptz,
      revoked_at timestamptz
    );
    -- "How many codes are left" and "revoke the old set" both read an admin's usable codes.
    CREATE INDEX platform_recovery_codes_usable_idx ON platform_recovery_codes (admin_id)
      WHERE used_at IS NULL AND revoked_at IS NULL;

    -- My account shows when each device first signed in: the oldest row of its refresh
    -- family, replaced rows included (the live-only family index can't answer that).
    CREATE INDEX platform_sessions_family_created_idx
      ON platform_sessions (family_id, created_at);

    ALTER TABLE platform_recovery_codes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE platform_recovery_codes FORCE ROW LEVEL SECURITY;
    CREATE POLICY platform_recovery_codes_platform ON platform_recovery_codes
      FOR ALL TO aliquot_platform USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE ON platform_recovery_codes TO aliquot_platform;
    """)


def downgrade() -> None:
    op.execute("""
    DROP INDEX platform_sessions_family_created_idx;
    DROP TABLE platform_recovery_codes;
    ALTER TABLE platform_admins DROP COLUMN password_changed_at;
    """)
