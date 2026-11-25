# 015 — Platform console: own role, required 2FA, write-only access to staff

**Date:** 2026-11-25 · **Status:** Accepted

## Context
ROLES.md: the super-admin is "a landlord, not an occupant". They create labs and each lab's first Manager, suspend and reactivate labs, and see tenant-level numbers only. They never see patients, samples, results or staff details. ARCHITECTURE.md §9 asks for a separate database role with no clinical grants, and 2FA for privileged users.

## Decision
- **Own connection:** console requests run as `aliquot_platform` (`PLATFORM_DATABASE_URL`), never as the lab app's role.
- **Write-only where it must create lab data:** `INSERT` (no `SELECT`) on `users`, `user_roles`, `auth_tokens` and `audit_log`, so it can create the first Manager and the invite but can't read any of it back. Inserts are plain SQL with no `RETURNING` for the same reason.
- **Staff counts** come from `platform_lab_staff_counts()`, a `SECURITY DEFINER` function owned by `aliquot_lookup` with column-level `SELECT (lab_id, status)` on `users`.
- **Platform tables** (`platform_admins`, `platform_sessions`, `platform_idempotency_keys`) have RLS forced with a platform-only policy; the lab role can't touch them.
- **Tokens:** audience `platform` (lab tokens use `lab`), no lab claim; neither kind of token opens the other side. Refresh cookie `__Secure-refresh-console`, `SameSite=Strict`, path `/api/v1/platform/auth`.
- **2FA (TOTP) is required.** The first sign-in shows a QR code; the secret stays encrypted inside the 5-minute challenge until a correct code confirms it, then it's stored encrypted (Fernet, `TOTP_ENCRYPTION_KEY`). Codes can't be replayed (the last used time-step is stored). 5 wrong codes lock 2FA for 15 minutes.
- **Invite links** carry the token in the URL **fragment** (`#token=`), which browsers never send to a server, so it can't leak into logs, proxies or `Referer`. Single-use, 72 h, stored hashed.
- **Idempotency:** console writes accept `Idempotency-Key`. The stored replay deliberately omits the one-time invite link.
- **Audit:** `audit_log.lab_id` became nullable for platform events with no lab (e.g. a super-admin signing in).
- **Super-admins on staging/production** are created from your own computer with hidden prompts (`app/scripts/create_platform_admin.py`), never in CI (public logs).

## Alternatives considered
- **Reuse the app role for the console:** one connection less, but the console could then read any lab's staff once a lab is set; the "landlord" rule would rest on code alone.
- **SMS or email codes:** weaker (SIM swap, inbox compromise) and cost money; TOTP is free and offline.
- **Token in the query string:** simpler page code, but it lands in server logs and `Referer` headers.

## Consequences
- Two app-side database logins per environment (`aliquot_app`, `aliquot_platform`), each with its own password.
- Re-sending a lost invite needs a small function to find the pending Manager (next console step).
- Email delivery of invites waits for the outbox and worker; until then the console shows the link once to copy.
