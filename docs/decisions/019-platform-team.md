# 019 — Platform team: super-admins manage each other from the console

**Date:** 2026-11-27 · **Status:** Accepted (extends decision 015)

## Context
Until now a super-admin could only be created with the CLI script (`create_platform_admin`), run on Uzoma's own computer. Uzoma asked for more admins, each with a profile, and for a way back in after a lost phone. We agreed:
- invites from the console;
- profiles showing name, email, 2FA, last sign-in and who added them;
- deactivation that ends someone's sessions at once;
- the rule that nobody locks out the whole platform.

## Decision
- **One role: super-admin.** A lesser role (say "support", view only) can come later. No console role ever sees clinical data (decision 015 still holds).
- **Invite:** a name and an email create an admin with no password, plus a single-use link valid for 72 hours (`/console/accept-invite#token=…`, stored hashed in `platform_invites`). The link is shown once to copy, until email exists. Opening it, they choose a password of at least **16 characters** (the CLI's rule). Their first sign-in then requires 2FA setup, so **2FA is never skipped**. "Make a new invite link" revokes the old link first.
- **Deactivate / reactivate:**
  - Deactivating sets `active = false` and `deactivated_at`, revokes all their sessions and cancels any open invite. Nothing is deleted.
  - Reactivating restores their own password and 2FA.
- **Reset 2FA (lost phone):** clears their TOTP secret and signs them out everywhere; their next sign-in shows a new QR code. Their password is unchanged.
- **Never on yourself:** you can't deactivate yourself or reset your own 2FA (My account covers your own account). The one acting is always active, so **the platform always keeps at least one active super-admin**. A last-admin check under row locks also stays in the service as a second guard against two people acting at once.
- **Sessions end at once:** every console request now checks that its admin is still active and its session is still live. Before this, a revoked session's 15-minute access token kept working until it expired. The check is one primary-key lookup per request (`EXPLAIN ANALYZE`: about 0.02 ms). "Sign out everywhere" in My account will rely on it.
- **Reasons and audit:**
  - Deactivate, reactivate and reset 2FA ask for a reason, which is kept in the audit log.
  - Every change writes an audit entry in the same transaction: `platform.admin_invited`, `admin_invite_resent`, `admin_invite_accepted`, `admin_deactivated`, `admin_reactivated`, `admin_2fa_reset`.
  - Every write takes an `Idempotency-Key`. Replays never contain the one-time link.
- **The CLI stays** for the very first admin and as the break-glass way in.

## Alternatives considered
- **Short access tokens instead of a per-request check:** a 1-minute token still leaves a window and multiplies refreshes; the check is cheap at console traffic.
- **Hard-delete removed admins:** loses "who did this" in the audit log; deactivation keeps the record.
- **Let an admin reset their own 2FA from the console:** a stolen session could then replace the second factor; that path belongs in My account behind the current password and a code.
- **Reuse the lab `auth_tokens` table for invites:** it's lab-owned (`lab_id` required, tenant RLS); platform invites belong to no lab.

## Consequences
- Migration 0003: `platform_admins.password_hash` becomes nullable (invited, not yet joined), plus `invited_by` and `deactivated_at`. Downgrade marks pending invitees with an unusable hash rather than deleting them.
- Console pages: Team (`/console/team`), a profile (`/console/team/<id>`), and Accept invite (`/console/accept-invite`).
- E2E seed adds one "team" admin per browser with a known, test-only 2FA secret.
- Next: **My account** (change password, recovery codes, sign out everywhere).
