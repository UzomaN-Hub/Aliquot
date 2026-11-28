import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { useConsoleSession } from "@/stores/console-session";

import { changePassword, getAccount } from "./api";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const admin = {
  id: "01936f3e-0000-7000-8000-000000000001",
  full_name: "Platform Admin",
  email: "admin@platform.example",
};
const fresh = { access_token: "fresh", token_type: "bearer", expires_in: 900, admin };
const account = {
  ...admin,
  created_at: "2026-11-20T09:00:00Z",
  last_login_at: null,
  password_changed_at: null,
  two_factor: true,
  recovery_codes_left: 0,
  recovery_codes_created_at: null,
  sessions: [],
};
const urls = () => fetchMock.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useConsoleSession.setState({
    session: {
      accessToken: "old",
      expiresAt: Date.now() + 600_000,
      admin: { id: admin.id, fullName: admin.full_name, email: admin.email },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("the console's token handling", () => {
  it("refreshes once and retries when the token has expired", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { code: "token_expired", message: "Expired." }))
      .mockResolvedValueOnce(json(200, fresh))
      .mockResolvedValueOnce(json(200, account));

    await expect(getAccount()).resolves.toMatchObject({ email: admin.email });
    expect(urls()).toEqual([
      "/api/v1/platform/account",
      "/api/v1/platform/auth/refresh",
      "/api/v1/platform/account",
    ]);
    expect(useConsoleSession.getState().session?.accessToken).toBe("fresh");
  });

  it("never re-sends a wrong password: that 401 is the person's answer", async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, {
        code: "wrong_password",
        message: "That isn't your current password.",
        field: "current_password",
      }),
    );

    const error = await changePassword("wrong", "a long new passphrase", "key-0001").catch(
      (failure: unknown) => failure,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).field).toBe("current_password");
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh, no retry
    expect(useConsoleSession.getState().session).not.toBeNull(); // still signed in
  });
});
