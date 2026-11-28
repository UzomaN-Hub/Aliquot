# 023 — My account: password, devices, recovery codes and a new phone

**Date:** 2026-11-28 · **Status:** Accepted (extends decisions 015 and 019)

## Context
Decision 019 left a super-admin's *own* account to a My account page: changing their password, signing out other devices, and a way back in when the phone is gone. Without this, a lost phone meant asking another super-admin for a reset, and the very last super-admin had only the CLI. The danger is a stolen or unattended session: anything on this page must not be possible with the session alone.

## Decision
- **Proof that it's you, every time.**
  - Every change needs the **current password**.
  - Changes that affect how you sign in also need a **fresh code from the phone**. The code that opened the session is already spent, so a stolen session can't reuse it.
  - Wrong passwords and wrong codes count toward the **same 5-try, 15-minute lock** as sign-in. The lock message now says "tries", not "codes".
- **Change password:** at least 16 characters, different from the current one and not your email. Saves `password_changed_at`, and **signs out every other device**; this one stays signed in.
- **Signed-in devices:** one row per refresh family (each device that signed in). Each shows the browser, when it first signed in and when it was last used; the device asking is marked "this device". "Sign out everywhere else" ends all the others at once, through decision 019's per-request session check.
- **Recovery codes:**
  - Ten codes like `K7QM-3HPX-WZ2R-9TBD`, from an alphabet with nothing to misread (no 0/O, 1/I/L, U). That's about 78 bits each.
  - Shown **once**, with `Cache-Control: no-store`. Stored as SHA-256 hashes: the codes are long and random, so a fast hash is safe, like refresh tokens (decision 013).
  - Each code works once. Making a new set cancels any unused codes. Used and cancelled codes stay as a record.
  - An idempotent replay returns `codes: null`, because the codes exist only in the first answer.
  - Sign-in step 2 accepts a recovery code instead of a phone code (`POST /auth/recover`). Lower case and spaces are fine. The answer says how many codes are left.
- **New phone:**
  - Step 1 asks for the password only, because the old phone may be gone and this session may have started with a recovery code. It returns a QR code and a 5-minute token. The token holds the new secret encrypted, has its own JWT audience and is tied to this session, so another device or the sign-in challenge can't finish it.
  - Step 2 takes a code from the **new** phone. The old phone stops working at once, other devices are signed out, and recovery codes stay valid.
  - The same code can't switch twice.
- **Audit:** `platform.password_changed`, `account_password_failed`, `signed_out_elsewhere`, `recovery_codes_created`, `sign_in_recovery_code`, `recovery_code_failed`, `2fa_moved`. Each is written in the same transaction as the change. Passwords and codes are never logged.

## Alternatives considered
- **Session alone is enough (like most apps' settings pages):** an unattended laptop could change the password and lock the owner out.
- **Argon2 for recovery codes:** made for short, guessable passwords; 78 random bits can't be guessed, and an exact hash lookup keeps sign-in fast.
- **Email a reset link when the phone is lost:** no email yet, and email must never bypass 2FA (session 11 agreement).
- **Count wrong passwords separately:** two counters give an attacker twice the tries; one lock is simpler to reason about.

## Consequences
- Migration 0004:
  - adds `platform_admins.password_changed_at`;
  - adds `platform_recovery_codes`, with RLS forced and only the `aliquot_platform` role allowed;
  - adds the index `platform_sessions (family_id, created_at)`, so "first signed in" reads one index entry instead of every refresh row. `EXPLAIN ANALYZE` with 5 devices and 15,000 rows: 5.8 ms → 0.16 ms.
- A locked account also blocks My account changes for 15 minutes, even with the right password.
- **The page, `/console/account`** (opened from the menu) has four parts, each with one action that opens a dialog: Password, Two-step sign-in, Recovery codes, Signed-in devices.
  - New recovery codes can't be closed by accident: the dialog waits for "I've saved these codes somewhere safe", and offers Copy and Download as text.
  - Console sign-in offers "Use a recovery code instead" (not while 2FA is being set up) and then goes straight to My account, with a notice of how many codes are left.
- **Bug found while building it:** the console's API wrapper treated every 401 as "token expired". It refreshed and re-sent the request, so a wrong password was sent twice (counting twice toward the lock), and a failed refresh signed the person out. Now only `not_signed_in`, `token_expired` and `session_ended` trigger a refresh. Regression test: `apps/web/src/features/console/api.test.ts`.
- Later: the same page for lab staff (Managers and Chief Scientists get 2FA in this stage).
