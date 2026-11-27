import { defineConfig, devices } from "@playwright/test";

/**
 * Browser (end-to-end) tests: the real web app, API and database, driven in
 * Chromium, Firefox and WebKit (Safari's engine). TESTING.md §6, decision 016.
 *
 * Locally: Docker running, `uv run python -m app.scripts.e2e_seed` (apps/api),
 * `pnpm build`, then `pnpm e2e`. Servers already running are reused.
 */
const ci = Boolean(process.env.CI);

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
    baseURL: "http://localhost:3000",
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
          ? "uv run fastapi dev --port 8000"
          : "uv run fastapi run --port 8000",
      cwd: "../api",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
    {
      command: "pnpm start",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
  ],
});
