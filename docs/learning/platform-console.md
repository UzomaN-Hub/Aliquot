# The platform console: 2FA, a separate database role, idempotency

## TOTP 2FA (pyotp)
**What:** a time-based one-time password. Your phone's authenticator app and the server share a secret. Both turn "secret + current 30-second window" into the same 6 digits.
**Why:** a stolen password alone can't open the console, which controls every lab.
**Without it:** one phished password = every lab's access.
- First sign-in: the API makes a secret, shows it as a **QR code** (segno draws it as SVG), and keeps it **encrypted** inside a 5-minute challenge until you type a correct code.
- Stored encrypted with **Fernet** (from `cryptography`: symmetric encryption with a built-in tamper check) using `TOTP_ENCRYPTION_KEY`.
- A code works once (`totp_last_step`); 5 wrong codes lock it for 15 minutes.

## A second database role
The console connects as `aliquot_platform`. It can **insert** a lab's first Manager and the invite, but not **select** them (a write-only grant), and every insert skips `RETURNING` for that reason. Staff counts come through a narrow function. Decision 015.

## Idempotency-Key
**What:** the browser sends a random key with a write; the server stores the answer under that key.
**Why:** on a bad network a "Create lab" click can be sent twice. The second request gets the first answer instead of creating a second lab.
**Without it:** duplicate labs, double payments later.

## Invite links
`/l/<lab>/set-password#token=…`: the token is in the **fragment** (after `#`), which browsers never send to any server. The page reads it and posts it in the request body.

## Commands (from `apps/api`)
| Want to | Command |
| --- | --- |
| Local console login | `uv run python -m app.scripts.dev_db` prints it (`admin@platform.example`) |
| Create a super-admin on staging | `uv run python -m app.scripts.create_platform_admin` (hidden prompts; run on your own computer) |

## Where it's used in Aliquot
`app/core/platform_security.py` · `app/modules/platform/` · `migrations/versions/20261125_0002_platform_console.py` · tests in `app/modules/platform/tests/`
