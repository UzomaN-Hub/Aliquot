import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// connection() only works inside a real Next.js request; here it just resolves.
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

describe("GET /api/health", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns ok and is never cached", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", undefined);
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", commit: null });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("names the commit Vercel built", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");
    expect(await (await GET()).json()).toEqual({ status: "ok", commit: "abc123" });
  });
});
