# 003 — Browser reaches the API through a same-origin proxy

**Date:** 2026-11-23 · **Status:** Accepted

## Context
Until the domain is bought, the web runs on `*.vercel.app` and the API on `*.onrender.com`: two different sites. The refresh token lives in an httpOnly cookie. Browsers block or restrict third-party (cross-site) cookies, Safari most strictly, so sign-in would silently break for some users. Calling a different site also needs CORS on every endpoint.

## Decision
The browser calls `/api/v1/…` on the web's own origin; Next.js rewrites it to the API's `/v1/…`. The API stays at `api.<domain>` for webhooks (WhatsApp, Termii) and live updates (SSE), which connect directly with a single-use 60 s ticket issued by FastAPI through the proxy.

## Alternatives considered
- **Direct cross-site calls + CORS + `SameSite=None` cookie:** simplest wiring, but the refresh cookie breaks under third-party-cookie blocking, and every endpoint needs CORS. Rejected.
- **Wait for the custom domain (`app.` and `api.` on the same site):** would work, but blocks the build on buying a domain, and still needs CORS.
- **SSE through the proxy too:** one origin for everything, but long-lived streams would hold proxy connections open and depend on the proxy's timeouts. Rejected.

## Consequences
- Refresh cookie is first-party: `httpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`. The API must set that path explicitly, since it sees `/v1/auth`.
- The API sees the proxy's IP. Rate limits (e.g. 5 logins per email + IP) must read the client IP from `X-Forwarded-For`, trusted only from the proxy.
- CORS is needed only on the SSE endpoint, for the web origin.
- CSRF protection on cookie routes still applies (ARCHITECTURE.md §9).
- One extra hop (Vercel → Render) per request; both sit in Frankfurt, so it stays small. Measured in the performance run.
