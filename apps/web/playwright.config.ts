import { defineConfig, devices } from "@playwright/test";

/**
 * Browser (end-to-end) tests: the real web app, API and database, driven in
 * Chromium, Firefox and WebKit (Safari's engine). TESTING.md §6, decision 016.
 *
 * Locally: Docker running, `uv run python -m app.scripts.e2e_seed` (apps/api),
 * `pnpm build`, then `pnpm e2e`. Servers already running are reused.
 *
 * Ports: 8000 (API) and 3000 (web) by default. If something else holds them (another
 * project, a forgotten dev server), pick free ones; the web build must point at the
 * same API port, because the /api/v1 proxy is fixed at build time:
 *   $env:API_URL="http://127.0.0.1:8010"; pnpm build
 *   $env:E2E_API_PORT="8010"; $env:E2E_WEB_PORT="3010"; pnpm e2e --project=chromium
 */
const ci = Boolean(process.env.CI);
const apiPort = process.env.E2E_API_PORT ?? "8000";
const webPort = process.env.E2E_WEB_PORT ?? "3000";

export default defineConfig({
  testDir: "./e2e",
  // Flows share one database and run in order; projects (browsers) run one after another.
  fullyParallel: false,
  workers: 1,
  retries: ci ? 1 : 0,
  forbidOnly: ci,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: ci ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      // On Windows the API needs reload mode for psycopg's event loop (decision 011).
      command:
        process.platform === "win32"
          ? `uv run fastapi dev --port ${apiPort}`
          : `uv run fastapi run --port ${apiPort}`,
      cwd: "../api",
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
    {
      command: `pnpm start --port ${webPort}`,
      url: `http://localhost:${webPort}/api/health`,
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
  ],
});
