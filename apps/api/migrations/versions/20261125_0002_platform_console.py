"""Platform console: super-admins, their sessions, invite tokens, idempotency.

Revision ID: 0002
Revises: 0001
Created: 2026-11-25

The platform role (aliquot_platform) may create a lab and its first Manager, but it
can never READ staff, sessions or anything clinical: it gets INSERT without SELECT,
and staff counts come through one narrow SECURITY DEFINER function (decision 015).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _platform_only(table: str, grants: str) -> str:
    """Platform-level table: RLS on and forced, only aliquot_platform may touch it."""
    return f"""
    ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
    CREATE POLICY {table}_platform ON {table} FOR ALL TO aliquot_platform
      USING (true) WITH CHECK (true);
    GRANT {grants} ON {table} TO aliquot_platform;
    """


def upgrade() -> None:
    # ── Super-admins (no lab_id: they belong to the platform, not a lab) ──
    op.execute(
        """
    CREATE TABLE platform_admins (
      id uuid PRIMARY KEY,
      email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
      full_name text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
      password_hash text NOT NULL,
      totp_secret_enc text,
      totp_last_step bigint,
      totp_failed_attempts integer NOT NULL DEFAULT 0,
      totp_locked_until timestamptz,
      active boolean NOT NULL DEFAULT true,
      last_login_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TRIGGER platform_admins_updated_at BEFORE UPDATE ON platform_admins
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """
        + _platform_only("platform_admins", "SELECT, INSERT, UPDATE")
    )

    op.execute(
        """
    CREATE TABLE platform_sessions (
      id uuid PRIMARY KEY,
      admin_id uuid NOT NULL REFERENCES platform_admins (id),
      family_id uuid NOT NULL,
      refresh_token_hash text NOT NULL UNIQUE,
      user_agent text,
      ip inet,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      replaced_by uuid REFERENCES platform_sessions (id)
    );
    CREATE INDEX platform_sessions_live_family_idx ON platform_sessions (family_id)
      WHERE revoked_at IS NULL;
    """
        + _platform_only("platform_sessions", "SELECT, INSERT, UPDATE")
    )

    # ── Invite and reset tokens (lab-owned, stored hashed) ──────────────
    op.execute("""
    CREATE TYPE auth_token_purpose AS ENUM ('invite', 'reset');
    CREATE TABLE auth_tokens (
      id uuid PRIMARY KEY,
      lab_id uuid NOT NULL REFERENCES labs (id),
      user_id uuid NOT NULL,
      purpose auth_token_purpose NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT auth_tokens_lab_id_user_id_fkey FOREIGN KEY (lab_id, user_id)
        REFERENCES users (lab_id, id)
    );
    ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE auth_tokens FORCE ROW LEVEL SECURITY;
    CREATE POLICY auth_tokens_tenant ON auth_tokens FOR ALL TO aliquot_app
      USING (lab_id = app_current_lab_id()) WITH CHECK (lab_id = app_current_lab_id());
    GRANT SELECT, INSERT, UPDATE ON auth_tokens TO aliquot_app;
    CREATE POLICY auth_tokens_platform_insert ON auth_tokens FOR INSERT TO aliquot_platform
      WITH CHECK (true);
    GRANT INSERT ON auth_tokens TO aliquot_platform;
    """)

    # ── Platform may CREATE a lab's first Manager, never read staff ─────
    op.execute("""
    CREATE POLICY users_platform_insert ON users FOR INSERT TO aliquot_platform
      WITH CHECK (true);
    GRANT INSERT ON users TO aliquot_platform;
    CREATE POLICY user_roles_platform_insert ON user_roles FOR INSERT TO aliquot_platform
      WITH CHECK (true);
    GRANT INSERT ON user_roles TO aliquot_platform;

    -- Staff count per lab for the console: two columns, through a definer function.
    CREATE POLICY users_lookup ON users FOR SELECT TO aliquot_lookup USING (true);
    GRANT SELECT (lab_id, status) ON users TO aliquot_lookup;
    CREATE FUNCTION platform_lab_staff_counts()
      RETURNS TABLE (lab_id uuid, staff bigint)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$ SELECT lab_id, count(*) FROM users WHERE status <> 'deactivated' GROUP BY lab_id $$;
    GRANT CREATE ON SCHEMA public TO aliquot_lookup;
    ALTER FUNCTION platform_lab_staff_counts() OWNER TO aliquot_lookup;
    REVOKE CREATE ON SCHEMA public FROM aliquot_lookup;
    REVOKE ALL ON FUNCTION platform_lab_staff_counts() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION platform_lab_staff_counts() TO aliquot_platform;
    """)

    # ── Audit: platform events may have no lab (e.g. a super-admin signs in) ─
    op.execute("""
    ALTER TABLE audit_log ALTER COLUMN lab_id DROP NOT NULL;
    CREATE POLICY audit_log_platform_write ON audit_log FOR INSERT TO aliquot_platform
      WITH CHECK (true);
    GRANT INSERT ON audit_log TO aliquot_platform;
    """)

    # ── Idempotency for console writes (CLAUDE.md: every write takes a key) ─
    op.execute(
        """
    CREATE TABLE platform_idempotency_keys (
      admin_id uuid NOT NULL REFERENCES platform_admins (id),
      key text NOT NULL CHECK (length(key) BETWEEN 8 AND 200),
      request_hash text NOT NULL,
      response_status integer NOT NULL,
      response_body jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (admin_id, key)
    );
    """
        + _platform_only("platform_idempotency_keys", "SELECT, INSERT")
    )


def downgrade() -> None:
    op.execute("""
    DROP TABLE platform_idempotency_keys;
    REVOKE INSERT ON audit_log FROM aliquot_platform;
    DROP POLICY audit_log_platform_write ON audit_log;
    -- audit_log.lab_id stays nullable: restoring NOT NULL would mean deleting
    -- platform audit rows, and the audit log is never deleted from.
    DROP FUNCTION platform_lab_staff_counts();
    REVOKE SELECT (lab_id, status) ON users FROM aliquot_lookup;
    DROP POLICY users_lookup ON users;
    REVOKE INSERT ON user_roles FROM aliquot_platform;
    DROP POLICY user_roles_platform_insert ON user_roles;
    REVOKE INSERT ON users FROM aliquot_platform;
    DROP POLICY users_platform_insert ON users;
    DROP TABLE auth_tokens;
    DROP TYPE auth_token_purpose;
    DROP TABLE platform_sessions;
    DROP TABLE platform_admins;
    """)
