# 016 — Browser (end-to-end) tests in CI on three engines, before more features

**Date:** 2026-11-27 · **Status:** Accepted

## Context
The console's 2FA QR code shipped blank: the SVG had no `xmlns`, so browsers drew nothing in an `<img>`. Every test passed. The API test checked the text began with `<svg`; the component test ran in jsdom, which never draws images; and the page wasn't opened in a real browser before shipping. Uzoma also requires the product to work across browsers. TESTING.md §6 already plans Playwright.

## Decision
- **Playwright** drives the real web app (`next start`), the real API and a real Postgres, in **Chromium, Firefox and WebKit** (Safari's engine), on every PR that touches either app (CI job `e2e`).
- Flows share one seeded database (`app/scripts/e2e_seed.py`: Tavnit Labs + **one console admin per browser**, so each engine runs the full 2FA setup). Tests run one at a time.
- The API runs with `ENVIRONMENT=local` in this job: plain `http://localhost`, like a laptop, so the refresh cookie works in WebKit.
- Tests complete 2FA like a person with a phone: they read the setup key from the page and compute the code (`e2e/support/totp.ts`, RFC 6238).
- First flows: lab sign-in (errors, wrong password, reload keeps the session, sign out), theme (Auto by clock, override remembered), and the console end to end (QR **actually drawn**, create lab, invite, set password, Manager signs in, suspend → staff refused).
- On failure CI keeps the HTML report, screenshots and traces for 7 days.
- Working rule: a screen isn't done until a real browser has shown it.

## Alternatives considered
- **Keep only unit/component tests:** fast, but blind to rendering, cookies, real routing and engine differences; that's exactly how the QR bug got through.
- **Run browsers only on the laptop:** the 16 GB laptop already kills dev servers under memory pressure; CI is the reliable place.
- **Test against the Vercel preview + Render staging:** realistic, but slow, shared and flaky (free-tier sleep), and staging data would fill with test labs.
- **Pixel screenshot comparisons now:** valuable later (TESTING.md §7), but every intended design change would need new baselines while the design is still moving.

## Consequences
- CI is a few minutes longer when the apps change (browsers cached between runs).
- Each new screen adds at least one browser test as part of being "done".
- Known follow-up surfaced by these tests: a lab's sign-in page caches its status for up to 5 minutes, so right after a suspension the form may still show (the API refuses the sign-in). Invalidate on change when the web gets a revalidation hook.
