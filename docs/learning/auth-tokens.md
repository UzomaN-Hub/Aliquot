# Sign-in: Argon2, JWT access tokens, rotating refresh cookies

## Argon2id (passwords)
**What:** a password-hashing function that is deliberately slow and memory-hungry (`argon2-cffi`).
**Why:** if the database ever leaked, each password guess costs an attacker real time and memory.
**Without it:** plain SHA-256 lets a graphics card try billions of guesses per second.
We also run the hash for unknown emails, so response time can't reveal which emails exist.

## JWT access token (15 min, kept in memory)
**What:** a JSON Web Token: a small signed note saying "user X of lab Y, roles Z, until 10:15". The API checks the signature with `JWT_SECRET` (PyJWT) and needs no database read.
**Why:** fast on every request, and it's where `lab_id` comes from (never the URL or body).
**Without it:** a database lookup on every request just to know who's calling.
Kept only in memory, never in `localStorage`: a malicious script can't read it after the tab closes.

## Refresh token (7 days, httpOnly cookie, rotating)
**What:** a random 256-bit string in a cookie JavaScript can't read (`HttpOnly`). It's used only to get a new access token (`POST /v1/auth/refresh`).
**Rotation:** each use returns a new refresh token and retires the old one. If a retired token is presented again, someone copied it, so the whole **family** (every session from that sign-in) is revoked.
**Stored hashed** (SHA-256): a database leak doesn't hand out live sessions.
**Limits:** 8 h idle, 7 days absolute from sign-in (rotation never extends it).

## CSRF (cross-site request forgery)
**What:** another site making your browser send a request with your cookie.
**Defence:** cookie routes require the header `X-CSRF-Protection: 1`. A form on another site can't add headers, and a script on another site would need CORS, which we never grant. `SameSite=Lax` helps too.

## The endpoints
| Endpoint | Auth | Does |
| --- | --- | --- |
| `GET /v1/labs/{slug}/branding` | none | Lab name and status for the sign-in page |
| `POST /v1/auth/sign-in` | email + password | Access token + sets `__Secure-refresh-<lab>` cookie |
| `POST /v1/auth/refresh` | cookie + CSRF header | New pair, old one retired |
| `POST /v1/auth/sign-out` | cookie + CSRF header | Revokes the session, clears the cookie |
| `GET /v1/auth/me` | `Authorization: Bearer <access>` | The signed-in user |

## Where it's used in Aliquot
`app/core/security.py` · `app/modules/auth/` · decision 013 · tests in `app/modules/auth/tests/` and `app/core/tests/test_security.py`
