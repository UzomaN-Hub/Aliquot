# 013 — Session tokens: short JWT in memory, rotating refresh cookie per lab

**Date:** 2026-11-24 · **Status:** Accepted

## Context
ARCHITECTURE.md §9 fixes the shape: a 15-minute access token in memory, a 7-day refresh token in an httpOnly cookie, rotated on every use, with reuse revoking the session family, and an 8-hour idle limit. These details still needed deciding.

## Decision
- **Access token:** HS256 JWT. Claims: `sub` (user), `lab`, `sid` (session), roles, sections, `aud=lab`, `iss=PLATFORM_DOMAIN`, 15 min. Decoding pins the algorithm (never trusts the token's own `alg`) and requires every claim.
- **Refresh token:** 256 random bits, stored as SHA-256 (not Argon2: there's nothing to brute-force, and the lookup must be an exact index hit).
- **Cookie:** `__Secure-refresh-<lab>`, `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`. One per lab, so staff of two labs can be signed in to both. The `__Secure-` prefix makes browsers refuse it without `Secure`.
- **Rotation:** each refresh creates a new session row in the same family and marks the old one replaced. The family's absolute expiry never moves (7 days from sign-in). Presenting a replaced token revokes the whole family and writes `auth.refresh_token_reused` to the audit log.
- **CSRF:** refresh and sign-out require the header `X-CSRF-Protection: 1`. A cross-site form can't send it, and a cross-site script would need CORS, which isn't granted.
- **Sign-in failures** return one message for unknown email, wrong password and inactive account. The slow hash runs either way, and the attempt is audited (committed even though the request fails).
- **Sign-in is not idempotency-keyed:** replaying a stored response would hand out tokens.

## Alternatives considered
- **Sessions only (no JWT):** a database read on every request; simpler revocation. JWT keeps reads off the hot path; revocation lands at the next refresh (≤ 15 min).
- **Sliding 7-day expiry:** a session used every few hours would never end.
- **RS256 (key pair):** needed when other services verify tokens. One API today; switch when a second verifier appears.

## Consequences
- Signing out elsewhere takes effect within 15 minutes for an access token already issued. Cross-tab sign-out (BroadcastChannel) closes the gap in the browser.
- Two tabs refreshing at once would trip reuse detection. The web app must refresh from one tab at a time (Web Locks, ARCHITECTURE.md §9).
- Safari doesn't treat `http://localhost` as secure, so it drops the cookie in local dev. Use Chrome/Edge locally; staging and production are HTTPS.
