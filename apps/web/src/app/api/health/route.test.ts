import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// connection() only works inside a real Next.js request; here it just resolves.
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

describe("GET /api/health", () => {
  it("returns ok and is never cached", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
