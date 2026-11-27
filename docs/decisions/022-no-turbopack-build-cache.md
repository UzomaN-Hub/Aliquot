# 022 — No Turbopack build cache, and a live stylesheet check after each web deploy

**Date:** 2026-11-27 · **Status:** Accepted

## Context
After PR #24 deployed, staging showed the landing wordmark at 14px and "Book a demo" with no colour. The page's HTML used the new classes (`text-wordmark`, `bg-cta`), but the stylesheet Vercel served was compiled from the **old** `globals.css`:
- the new tokens from `tokens.css` were there;
- the new utilities and base rules from `globals.css` were not.

Locally and in CI (both clean builds) everything was correct, so every test passed.

Next.js 16.4 turns on Turbopack's file-system cache for production builds (`turbopackFileSystemCacheForBuild: true`), and Vercel restores `.next/cache` between builds. The Tailwind step's cached output for `globals.css` was reused although the file had changed.

## Decision
- Set `experimental.turbopackFileSystemCacheForBuild: false` in `apps/web/next.config.ts`. Builds take a little longer and are always made from the files in the commit.
- The web `/api/health` reports `commit` (`VERCEL_GIT_COMMIT_SHA`).
- A new job in `deploy-staging.yml`, `verify-web`, runs after each merge that touches the web app:
  - it waits until Vercel serves that commit;
  - it checks that every class defined in `globals.css` is in the live stylesheet;
  - if any is missing, it fails with "redeploy on Vercel without the build cache".

## Alternatives considered
- **Redeploy without cache by hand when it happens:** relies on someone noticing. This time it was Uzoma.
- **Clear `.next/cache` in a custom build command:** this would also drop Next's other caches (images, fetch), and it hides the reason in a shell line.
- **Visual tests against staging:** heavier. The class check is enough to catch a stale stylesheet, and it runs in seconds.

## Consequences
- Slower Vercel builds (no reuse of Turbopack's compiled modules). Revisit when Next fixes cache invalidation for the Tailwind loader. Remove the flag only with `verify-web` green over several deploys.
- `verify-web` must be kept: it's the only test that looks at what Vercel actually serves.
