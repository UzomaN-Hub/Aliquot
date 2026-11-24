# 012 — Database roles, the per-transaction tenant setting, and the public lab lookup

**Date:** 2026-11-24 · **Status:** Accepted

## Context
CLAUDE.md requires RLS enabled **and forced** on every lab table, the super-admin to have no clinical access by database grants, and `lab_id` to come only from the signed token. Before sign-in there is no token, yet the sign-in page must find its lab.

## Decision
- **Roles** (created by the first migration):
  - `aliquot_app`: the API. `NOBYPASSRLS`, grants per table, no DELETE on staff, no UPDATE/DELETE on the audit log.
  - `aliquot_platform`: the console. Tenant records only, no grants on staff, sessions or clinical tables.
  - `aliquot_lookup`: never logs in; owns the one public lookup function.
  - The owner role (local `aliquot`, Supabase `postgres`) runs migrations only.
- **Tenant setting:** each transaction runs `set_config('app.current_lab_id', <lab>, true)`, which is `SET LOCAL`. Policies compare `lab_id = app_current_lab_id()`, which returns NULL when unset, so a forgotten setting shows **nothing**, never everything. Ending with the transaction means a pooled connection can't carry one lab into the next request.
- **Public lookup:** `public_lab_by_slug(slug)` is `SECURITY DEFINER`, owned by `aliquot_lookup`. It returns branding only (name, slug, logo, timezone, status). It's the only way the app role can see a lab other than the current one.
- **Sign-in and refresh** resolve the lab from the address through that function, then set it for the transaction. Every other request takes `lab_id` from the token. A refresh token from lab A presented on lab B is simply not found under RLS.

## Alternatives considered
- **Filtering in the API only (no RLS):** one forgotten `WHERE` leaks a lab. Rejected by CLAUDE.md.
- **A Postgres role per lab:** strongest isolation, but thousands of roles, a connection pool per lab, and grants to maintain per lab.
- **App role allowed to read all of `labs`:** simpler, but exposes every lab's address, phone and settings to any bug.

## Consequences
- Every new lab table: `_tenant_table()` in its migration (RLS on and forced, one policy, explicit grants).
- Tests prove isolation through the real app role (`app/modules/tenants/tests/test_isolation.py`).
- On Supabase the login roles need passwords set once (documented in `docs/learning/row-level-security.md`).
