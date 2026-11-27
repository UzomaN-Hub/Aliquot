# Browser tests with Playwright

**What it is:** Playwright opens real browsers (Chromium = Chrome/Edge, Firefox, WebKit = Safari) and uses the app like a person: clicks, types, reads the screen. It runs against the real web app, API and database.
**Why we use it:** unit and component tests check pieces in a simulated browser. Only a real browser shows a blank image, a cookie the browser refuses, or a page that breaks in Safari. Decision 016 (the blank QR code).
**Without it:** bugs reach you first, and each one costs a full report → fix → redeploy → retest loop.

## How a test reads
```ts
await page.goto("/l/tavnit/sign-in");                      // open a page
await page.getByLabel("Email").fill("chidinma@…");          // find by label, like a screen reader
await page.getByRole("button", { name: "Sign in" }).click();
await expect(page.getByRole("heading", { level: 1 })).toContainText("Chidinma");  // waits until true
```
- Find things by **role and name** (`getByRole`, `getByLabel`), not CSS classes: the test also proves the page is accessible.
- `expect(...)` **waits** (up to 10 s) for the page to catch up; no `sleep`.
- `page.clock.setFixedTime(...)` freezes the browser's clock (used to test Auto theme at 20:30).

## Where things are
| File | What |
| --- | --- |
| `apps/web/playwright.config.ts` | Browsers, base URL, starts the API and web servers |
| `apps/web/e2e/*.spec.ts` | The tests |
| `apps/web/e2e/support/totp.ts` | Makes 2FA codes like an authenticator app |
| `apps/api/app/scripts/e2e_seed.py` | Test database: Tavnit Labs + one console admin per browser |
| CI job `e2e` in `.github/workflows/ci.yml` | Runs all three browsers on every PR that touches the apps |

## Run locally (optional; CI always runs them)
```powershell
# once: download a browser (Chromium only is enough locally)
pnpm exec playwright install chromium            # from apps/web
# each time: Docker running, then
uv run python -m app.scripts.e2e_seed            # from apps/api
pnpm build; pnpm e2e --project=chromium          # from apps/web
```
When a test fails, the report shows a screenshot and a step-by-step **trace**: `pnpm exec playwright show-report`.
