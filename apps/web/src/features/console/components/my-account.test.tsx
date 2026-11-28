// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConsoleSession } from "@/stores/console-session";

import { MyAccount } from "./my-account";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const account = {
  id: "01936f3e-0000-7000-8000-000000000001",
  full_name: "Platform Admin",
  email: "admin@platform.example",
  created_at: "2026-11-20T09:00:00Z",
  last_login_at: "2026-11-28T08:00:00Z",
  password_changed_at: null,
  two_factor: true,
  recovery_codes_left: 0,
  recovery_codes_created_at: null,
  sessions: [
    {
      id: "01936f3e-0000-7000-8000-000000000010",
      user_agent: CHROME,
      signed_in_at: "2026-11-28T08:00:00Z",
      last_used_at: "2026-11-28T08:10:00Z",
      current: true,
    },
    {
      id: "01936f3e-0000-7000-8000-000000000011",
      user_agent: "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
      signed_in_at: "2026-11-27T18:00:00Z",
      last_used_at: "2026-11-27T19:00:00Z",
      current: false,
    },
  ],
};
const CODES = Array.from({ length: 10 }, (_, i) => `ABCD-EFGH-JKMN-PQ${i}${i}`);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MyAccount />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const sent = (call: number) => JSON.parse(String(fetchMock.mock.calls[call]![1]?.body));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useConsoleSession.setState({
    session: {
      accessToken: "token",
      expiresAt: Date.now() + 600_000,
      admin: { id: account.id, fullName: account.full_name, email: account.email },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("MyAccount", () => {
  it("shows each part of the account, with this device marked", async () => {
    fetchMock.mockResolvedValueOnce(json(200, account));
    renderPage();

    expect(await screen.findByRole("heading", { name: "My account" })).toBeInTheDocument();
    expect(screen.getByText("Not changed since you joined on 20 Nov 2026")).toBeInTheDocument();
    expect(screen.getByText(/None yet\. Make a set now/)).toBeInTheDocument();
    const devices = screen.getByRole("region", { name: "Signed-in devices" });
    expect(within(devices).getByText("This device and 1 other.")).toBeInTheDocument();
    expect(within(devices).getByText(/Chrome on Windows/)).toHaveTextContent("this device");
    expect(within(devices).getByText("Firefox on Linux")).toBeInTheDocument();
  });

  it("offers a retry when the account can't load", async () => {
    fetchMock
      .mockResolvedValueOnce(json(500, { code: "server_error", message: "Oops." }))
      .mockResolvedValueOnce(json(200, account));
    const user = renderPage();

    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "My account" })).toBeInTheDocument();
  });

  it("puts a wrong current password on its field", async () => {
    fetchMock.mockResolvedValueOnce(json(200, account)).mockResolvedValueOnce(
      json(401, {
        code: "wrong_password",
        message: "That isn't your current password.",
        field: "current_password",
      }),
    );
    const user = renderPage();
    await user.click(await screen.findByRole("button", { name: "Change password" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Current password"), "not it");
    await user.type(within(dialog).getByLabelText("New password"), "a long new passphrase");
    await user.type(within(dialog).getByLabelText("Type it again"), "a long new passphrase");
    await user.click(within(dialog).getByRole("button", { name: "Change password" }));

    expect(await within(dialog).findByText("That isn't your current password.")).toBeVisible();
    expect(sent(1)).toEqual({ current_password: "not it", new_password: "a long new passphrase" });
    expect(fetchMock.mock.calls[1]![1]?.headers).toMatchObject({
      "Idempotency-Key": expect.any(String),
    });
  });

  it("shows new recovery codes once and waits until they're saved", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, account))
      .mockResolvedValueOnce(json(201, { codes: CODES, created_at: "2026-11-28T08:20:00Z" }))
      .mockResolvedValueOnce(json(200, { ...account, recovery_codes_left: 10 }));
    const user = renderPage();
    await user.click(await screen.findByRole("button", { name: "Make recovery codes" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Password"), "my password");
    await user.type(within(dialog).getByLabelText("6-digit code"), "123 456");
    await user.click(within(dialog).getByRole("button", { name: "Make recovery codes" }));

    const list = await within(dialog).findByRole("list", { name: "Recovery codes" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    expect(sent(1)).toEqual({ password: "my password", code: "123456" });

    const done = within(dialog).getByRole("button", { name: "Done" });
    expect(done).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // not lost by accident
    await user.click(within(dialog).getByLabelText("I've saved these codes somewhere safe"));
    await user.click(done);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(/10 of 10 left/)).toBeInTheDocument();
  });

  it("signs out the other devices after asking", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, account))
      .mockResolvedValueOnce(json(200, { ended: 1 }))
      .mockResolvedValueOnce(json(200, { ...account, sessions: [account.sessions[0]] }));
    const user = renderPage();
    await user.click(await screen.findByRole("button", { name: "Sign out everywhere else" }));
    const dialog = screen.getByRole("dialog", { name: "Sign out 1 other device?" });
    await user.click(within(dialog).getByRole("button", { name: "Sign out other devices" }));

    expect(await screen.findByText("Signed out 1 other device.")).toBeInTheDocument();
    expect(await screen.findByText("Only this device is signed in.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out everywhere else" })).toBeNull();
  });

  it("moves two-step sign-in to a new phone and clears the recovery notice", async () => {
    useConsoleSession.setState((state) => ({
      session: state.session && { ...state.session, recoveryCodesLeft: 4 },
    }));
    fetchMock
      .mockResolvedValueOnce(json(200, account))
      .mockResolvedValueOnce(
        json(200, {
          challenge: "r".repeat(40),
          setup: {
            secret: "ABCDEFGHIJKLMNOP",
            otpauth_uri: "otpauth://totp/x",
            qr_image: "data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E",
          },
        }),
      )
      .mockResolvedValueOnce(json(200, { ended: 1 }))
      .mockResolvedValueOnce(json(200, account));
    const user = renderPage();
    expect(await screen.findByText(/You signed in with a recovery code; 4 left/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Move to a new phone" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Password"), "my password");
    await user.click(within(dialog).getByRole("button", { name: "Show the QR code" }));
    expect(await within(dialog).findByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(within(dialog).getByText("ABCD EFGH IJKL MNOP")).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Code from the new phone"), "654321");
    await user.click(within(dialog).getByRole("button", { name: "Use the new phone" }));

    expect(await screen.findByText(/Moved to your new phone/)).toHaveTextContent(
      "1 other device signed out",
    );
    expect(sent(2)).toEqual({ challenge: "r".repeat(40), code: "654321" });
    expect(screen.queryByText(/You signed in with a recovery code/)).toBeNull();
  });
});
