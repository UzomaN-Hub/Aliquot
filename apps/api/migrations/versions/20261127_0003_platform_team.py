"""Platform team: super-admins invite, deactivate and reset each other (decision 019).

Revision ID: 0003
Revises: 0002
Created: 2026-11-27

An invited super-admin exists before they have a password (password_hash NULL) and
signs in only after opening their invite link and choosing one. Invite tokens are
stored hashed, single-use, 72 hours, like the lab invites (decision 015).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE platform_admins ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE platform_admins ADD COLUMN invited_by uuid REFERENCES platform_admins (id);
    ALTER TABLE platform_admins ADD COLUMN deactivated_at timestamptz;

    CREATE TABLE platform_invites (
      id uuid PRIMARY KEY,
      admin_id uuid NOT NULL REFERENCES platform_admins (id),
      created_by uuid NOT NULL REFERENCES platform_admins (id),
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    -- The open invite of an admin (re-send revokes the old one first).
    CREATE INDEX platform_invites_open_idx ON platform_invites (admin_id)
      WHERE used_at IS NULL AND revoked_at IS NULL;
    -- "Sign out everywhere" and deactivation revoke an admin's live sessions.
    CREATE INDEX platform_sessions_live_admin_idx ON platform_sessions (admin_id)
      WHERE revoked_at IS NULL;

    ALTER TABLE platform_invites ENABLE ROW LEVEL SECURITY;
    ALTER TABLE platform_invites FORCE ROW LEVEL SECURITY;
    CREATE POLICY platform_invites_platform ON platform_invites FOR ALL TO aliquot_platform
      USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE ON platform_invites TO aliquot_platform;
    """)


def downgrade() -> None:
    op.execute("""
    DROP INDEX platform_sessions_live_admin_idx;
    DROP TABLE platform_invites;
    ALTER TABLE platform_admins DROP COLUMN deactivated_at;
    ALTER TABLE platform_admins DROP COLUMN invited_by;
    -- Admins still waiting on an invite get a value no password can match, so the
    -- column can be required again without deleting anyone.
    UPDATE platform_admins SET password_hash = '!' WHERE password_hash IS NULL;
    ALTER TABLE platform_admins ALTER COLUMN password_hash SET NOT NULL;
    """)
