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

## The console screens (`apps/web`)
| URL | What |
| --- | --- |
| `/console/sign-in` | Password, then the 6-digit code; on first sign-in, a QR code to scan |
| `/console` | Labs: count, table (name, address, status, staff, created), "Create a lab" |
| `/console/labs/new` | Lab details, sections, first Manager → shows the invite link once, with Copy |
| `/console/labs/<id>` | Facts, Edit details, Suspend/Reactivate (dialog asks for a reason) |
| `/l/<lab>/set-password#token=…` | The invited Manager chooses a password |
| `/console/team` | Every super-admin: status, 2FA, last sign-in; "Invite a super-admin" (link shown once) |
| `/console/team/<id>` | A profile: new invite link, reset 2FA, deactivate/reactivate (each asks for a reason) |
| `/console/accept-invite#token=…` | An invited super-admin chooses a password (16+), then sets up 2FA at sign-in |

- **TanStack Query** (`features/console/queries.ts`) fetches and caches the labs; after a create, edit or suspend it refreshes the list automatically. Keys come from one factory (`consoleKeys`).
- **Token refresh:** `withToken()` renews a token that's about to expire, and on a 401 refreshes once and retries (FRONTEND.md §5).
- **Idempotency keys** are made per submit with `crypto.randomUUID()`.

## The platform team (decision 019)
- **Invited means no password yet.** `platform_admins.password_hash` stays empty until the invite link is used, so signing in simply fails before that.
- **Never on yourself:** deactivate and reset-2FA refuse your own id. The person acting is always active, so the platform can never end up with nobody able to sign in.
- **Revocation takes effect at once:** a JWT (access token) can't be taken back; it stays valid until it expires. So `current_admin` (`platform/dependencies.py`) also asks the database on every request: is this admin still active, and is this session still live? It's one primary-key lookup. Deactivating someone, or signing out everywhere, then takes effect on their next request, not 15 minutes later.
- **Row locks for the last-admin rule:** `lock_active_admins` uses `SELECT … FOR UPDATE`. If two people try to deactivate the last two admins at the same moment, the database handles them one after the other, so both can't succeed.

## Commands (from `apps/api`)
| Want to | Command |
| --- | --- |
| Local console login | `uv run python -m app.scripts.dev_db` prints it (`admin@platform.example`) |
| Create a super-admin on staging | `uv run python -m app.scripts.create_platform_admin` (hidden prompts; run on your own computer) |

## Where it's used in Aliquot
`app/core/platform_security.py` · `app/modules/platform/` · `migrations/versions/20261125_0002_platform_console.py`, `20261127_0003_platform_team.py` · tests in `app/modules/platform/tests/` · browser tests `apps/web/e2e/console.spec.ts`, `console-team.spec.ts`
