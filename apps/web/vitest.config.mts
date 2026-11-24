import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Node by default (fast). Component tests opt into a browser-like DOM
    // with `// @vitest-environment jsdom` on their first line.
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    // Modules that read config at import need these; dummy values only.
    env: {
      PLATFORM_NAME: "Test Platform",
      PLATFORM_DOMAIN: "localhost",
      TENANT_MODE: "path",
      API_URL: "http://localhost:8000",
    },
  },
});
