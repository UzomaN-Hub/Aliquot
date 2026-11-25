"""Foundation: roles, labs, staff, sessions, audit log. RLS on every lab table.

Revision ID: 0001
Revises:
Created: 2026-11-24

Written as plain SQL so each security rule is visible in one place (decision 012).
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _tenant_table(table: str, grants: str) -> str:
    """RLS enabled AND forced + the one tenant policy + grants for the app role."""
    return f"""
    ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
    CREATE POLICY {table}_tenant ON {table} FOR ALL TO aliquot_app
      USING (lab_id = app_current_lab_id()) WITH CHECK (lab_id = app_current_lab_id());
    GRANT {grants} ON {table} TO aliquot_app;
    """


def upgrade() -> None:
    # ── Roles (cluster-wide, so created only if missing) ─────────────────
    # aliquot_app: the API. Can never bypass RLS.
    # aliquot_platform: the super-admin console. Tenant records only, no clinical grants.
    # aliquot_lookup: owns the one public lookup function; never logs in.
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aliquot_app') THEN
        CREATE ROLE aliquot_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aliquot_platform') THEN
        CREATE ROLE aliquot_platform LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aliquot_lookup') THEN
        CREATE ROLE aliquot_lookup NOLOGIN NOSUPERUSER NOBYPASSRLS;
      END IF;
    END $$;
    GRANT aliquot_lookup TO CURRENT_USER;
    GRANT USAGE ON SCHEMA public TO aliquot_app, aliquot_platform, aliquot_lookup;
    """)

    # ── Types and helpers ───────────────────────────────────────────────
    op.execute("""
    CREATE TYPE lab_status AS ENUM ('active', 'suspended');
    CREATE TYPE lab_section AS ENUM ('chem_path', 'haematology', 'microbiology');
    CREATE TYPE user_status AS ENUM ('invited', 'active', 'deactivated');
    CREATE TYPE staff_role AS ENUM ('manager', 'chief_scientist', 'lab_scientist', 'front_desk');
    CREATE TYPE audit_actor AS ENUM ('user', 'platform_admin', 'system', 'doctor_link');

    -- The lab this transaction belongs to, set by the API with SET LOCAL.
    -- Unset or empty -> NULL -> every tenant policy matches nothing.
    CREATE FUNCTION app_current_lab_id() RETURNS uuid
      LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('app.current_lab_id', true), '')::uuid $$;

    CREATE FUNCTION set_updated_at() RETURNS trigger
      LANGUAGE plpgsql
      AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
    """)

    # ── labs: the tenants ───────────────────────────────────────────────
    op.execute("""
    CREATE TABLE labs (
      id uuid PRIMARY KEY,
      name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
      slug text NOT NULL UNIQUE
        CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
      legal_name text,
      address text,
      phone text,
      email text,
      logo_key text,
      timezone text NOT NULL DEFAULT 'Africa/Lagos',
      status lab_status NOT NULL DEFAULT 'active',
      settings jsonb NOT NULL DEFAULT '{}',
      suspended_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TRIGGER labs_updated_at BEFORE UPDATE ON labs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE labs FORCE ROW LEVEL SECURITY;
    CREATE POLICY labs_own ON labs FOR SELECT TO aliquot_app
      USING (id = app_current_lab_id());
    CREATE POLICY labs_platform ON labs FOR ALL TO aliquot_platform
      USING (true) WITH CHECK (true);
    CREATE POLICY labs_lookup ON labs FOR SELECT TO aliquot_lookup USING (true);
    GRANT SELECT ON labs TO aliquot_app, aliquot_lookup;
    GRANT SELECT, INSERT, UPDATE ON labs TO aliquot_platform;

    -- Before sign-in nobody has a token, so the sign-in page finds its lab by slug.
    -- This function returns public branding only, and it is the ONLY way the app
    -- role can read a lab other than the one set for the transaction.
    CREATE FUNCTION public_lab_by_slug(p_slug text)
      RETURNS TABLE (id uuid, name text, slug text, logo_key text, timezone text,
                     status lab_status)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$ SELECT id, name, slug, logo_key, timezone, status FROM labs WHERE slug = p_slug $$;
    -- A non-superuser owner (Supabase) may hand a function only to a role that can
    -- create in the schema; the right is taken back straight after.
    GRANT CREATE ON SCHEMA public TO aliquot_lookup;
    ALTER FUNCTION public_lab_by_slug(text) OWNER TO aliquot_lookup;
    REVOKE CREATE ON SCHEMA public FROM aliquot_lookup;
    REVOKE ALL ON FUNCTION public_lab_by_slug(text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public_lab_by_slug(text) TO aliquot_app;
    """)

    op.execute(
        """
    CREATE TABLE lab_sections (
      lab_id uuid NOT NULL REFERENCES labs (id),
      section lab_section NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      PRIMARY KEY (lab_id, section)
    );
    CREATE POLICY lab_sections_platform ON lab_sections FOR ALL TO aliquot_platform
      USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE ON lab_sections TO aliquot_platform;
    """
        + _tenant_table("lab_sections", "SELECT")
    )

    # ── Staff ───────────────────────────────────────────────────────────
    op.execute(
        """
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      lab_id uuid NOT NULL REFERENCES labs (id),
      full_name text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
      email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
      phone text,
      password_hash text,
      status user_status NOT NULL DEFAULT 'invited',
      totp_secret_enc text,
      totp_required boolean NOT NULL DEFAULT false,
      last_login_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid,
      updated_by uuid,
      CONSTRAINT users_lab_id_id_key UNIQUE (lab_id, id),
      CONSTRAINT users_lab_id_email_key UNIQUE (lab_id, email),
      CONSTRAINT users_lab_id_created_by_fkey FOREIGN KEY (lab_id, created_by)
        REFERENCES users (lab_id, id),
      CONSTRAINT users_lab_id_updated_by_fkey FOREIGN KEY (lab_id, updated_by)
        REFERENCES users (lab_id, id)
    );
    CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """
        + _tenant_table("users", "SELECT, INSERT, UPDATE")
    )

    for table, column, kind in (
        ("user_roles", "role", "staff_role"),
        ("user_sections", "section", "lab_section"),
    ):
        op.execute(
            f"""
        CREATE TABLE {table} (
          lab_id uuid NOT NULL,
          user_id uuid NOT NULL,
          {column} {kind} NOT NULL,
          PRIMARY KEY (lab_id, user_id, {column}),
          CONSTRAINT {table}_lab_id_user_id_fkey FOREIGN KEY (lab_id, user_id)
            REFERENCES users (lab_id, id)
        );
        """
            + _tenant_table(table, "SELECT, INSERT, DELETE")
        )

    # ── Sessions (refresh tokens, stored hashed) ────────────────────────
    op.execute(
        """
    CREATE TABLE sessions (
      id uuid PRIMARY KEY,
      lab_id uuid NOT NULL REFERENCES labs (id),
      user_id uuid NOT NULL,
      family_id uuid NOT NULL,
      refresh_token_hash text NOT NULL UNIQUE,
      user_agent text,
      ip inet,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      replaced_by uuid,
      CONSTRAINT sessions_lab_id_id_key UNIQUE (lab_id, id),
      CONSTRAINT sessions_lab_id_user_id_fkey FOREIGN KEY (lab_id, user_id)
        REFERENCES users (lab_id, id),
      CONSTRAINT sessions_lab_id_replaced_by_fkey FOREIGN KEY (lab_id, replaced_by)
        REFERENCES sessions (lab_id, id)
    );
    -- Revoking a family or all of a user's sessions touches only live rows.
    CREATE INDEX sessions_live_family_idx ON sessions (lab_id, family_id)
      WHERE revoked_at IS NULL;
    CREATE INDEX sessions_live_user_idx ON sessions (lab_id, user_id)
      WHERE revoked_at IS NULL;
    """
        + _tenant_table("sessions", "SELECT, INSERT, UPDATE")
    )

    # ── Audit log: append-only, partitioned by month ────────────────────
    op.execute("""
    CREATE TABLE audit_log (
      id uuid NOT NULL,
      at timestamptz NOT NULL DEFAULT now(),
      lab_id uuid NOT NULL REFERENCES labs (id),
      actor_type audit_actor NOT NULL,
      actor_id uuid,
      action text NOT NULL,
      entity text NOT NULL,
      entity_id uuid,
      before jsonb,
      after jsonb,
      ip inet,
      PRIMARY KEY (id, at)
    ) PARTITION BY RANGE (at);
    CREATE INDEX audit_log_entity_idx ON audit_log (lab_id, entity, entity_id, at);

    -- One partition per month. A scheduled job keeps 12 months ahead (later stage);
    -- the default partition only catches rows if that job ever falls behind.
    CREATE FUNCTION create_audit_log_partition(p_month date) RETURNS void
      LANGUAGE plpgsql
      AS $$
      DECLARE
        start_at date := date_trunc('month', p_month)::date;
        part text := format('audit_log_%s', to_char(start_at, 'YYYY_MM'));
      BEGIN
        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
          part, start_at, (start_at + interval '1 month')::date);
      END $$;
    REVOKE ALL ON FUNCTION create_audit_log_partition(date) FROM PUBLIC;
    SELECT create_audit_log_partition(
             (date_trunc('month', now()) + make_interval(months => m))::date)
      FROM generate_series(0, 12) AS m;
    CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT;

    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
    CREATE POLICY audit_log_read ON audit_log FOR SELECT TO aliquot_app
      USING (lab_id = app_current_lab_id());
    CREATE POLICY audit_log_write ON audit_log FOR INSERT TO aliquot_app
      WITH CHECK (lab_id = app_current_lab_id());
    -- No UPDATE or DELETE grant: history can't be rewritten (CLAUDE.md).
    GRANT SELECT, INSERT ON audit_log TO aliquot_app;
    """)


def downgrade() -> None:
    # Roles are cluster-wide and may be used by other databases (e.g. the test
    # database), so they are left in place.
    op.execute("""
    DROP TABLE audit_log;
    DROP FUNCTION create_audit_log_partition(date);
    DROP TABLE sessions;
    DROP TABLE user_sections;
    DROP TABLE user_roles;
    DROP TABLE users;
    DROP TABLE lab_sections;
    DROP FUNCTION public_lab_by_slug(text);
    DROP TABLE labs;
    DROP FUNCTION set_updated_at();
    DROP FUNCTION app_current_lab_id();
    DROP TYPE audit_actor;
    DROP TYPE staff_role;
    DROP TYPE user_status;
    DROP TYPE lab_section;
    DROP TYPE lab_status;
    """)
