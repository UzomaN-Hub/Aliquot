# Account security: re-checking who you are, recovery codes, ending sessions

## The problem
Being signed in proves that *someone* had your password and phone at some point, not that it's you sitting at the laptop right now. If a settings page trusts the session alone, anyone at an unattended laptop can change the password and lock you out of your own account.

## Step-up checks ("prove it again")
For anything that changes how you sign in, we ask again:
- **current password**: for every change on My account;
- **plus a fresh 2FA code**: for recovery codes.

A 2FA code can be used **once** (we store the last time step used, `totp_last_step`). The code you signed in with is spent, so whoever steals the session can't replay it.

Wrong answers count toward the **same lock** as sign-in: 5 wrong tries lock it for 15 minutes. If passwords had a counter of their own, an attacker would get twice the tries.

In our code: `_prove_identity` and `_wrong_code` in `apps/api/app/modules/platform/service.py`.

## Recovery codes
These are ten single-use codes for when the phone is lost, broken or wiped.
- **Random, not chosen by a person:** 16 characters from 30 letters and digits, about 78 bits. Nobody can guess one.
- **Stored hashed with SHA-256, not Argon2.** Argon2 is slow on purpose, to protect short passwords people choose. Long random codes don't need that, and a fast hash lets us find the code with one exact index lookup. Refresh tokens use the same idea.
- **Shown once.** The answer carries `Cache-Control: no-store`, so the browser doesn't keep a copy. A retried request (same `Idempotency-Key`) gets `codes: null`.
- **New set cancels the old one.** Nothing is deleted: `used_at` and `revoked_at` keep the history.

Where: `new_recovery_code`, `normalise_recovery_code` in `app/core/platform_security.py`; `verify_recovery` and `create_recovery_codes` in the service; migration `20261127_0004_platform_account.py`.

## Ending other sessions
Each device that signs in starts a **refresh family**: a chain of refresh tokens, each one replacing the last (see `auth-tokens.md`).
- "Sign out everywhere else" revokes every family except yours.
- It works **at once**, because every console request checks that its session is still live (decision 019).
- Changing your password or moving 2FA to a new phone does the same, so a thief's session ends the moment you fix things.

Where: `revoke_other_sessions` and `live_sessions` in `apps/api/app/modules/platform/repository.py`.

## A short-lived, single-purpose token
Moving 2FA to a new phone takes two steps: show the QR code, then confirm with a code from the new phone. Between the two, the new secret has to live somewhere.

We put it, encrypted, inside a 5-minute JWT. The JWT has:
- **its own audience** (`platform-new-authenticator`), so it can't be used as a sign-in token, and a sign-in token can't be used as this one;
- **the session id**, so only the device that started can finish.

Nothing in the database changes until the new phone proves it works.

## What goes wrong without these
- **Session-only settings:** anyone at an unattended laptop can take over the account.
- **Recovery codes stored in plain text:** one database leak hands out ways in.
- **Sessions that only expire:** after a password change, a thief keeps access until their token runs out.

## Tests
`apps/api/app/modules/platform/tests/test_my_account.py` covers each rule above. Examples: a spent code is refused; five wrong passwords lock; a replay hides the codes; another device can't finish a phone switch.
