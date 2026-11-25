// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConsoleSession } from "@/stores/console-session";

import { ConsoleSignIn } from "./console-sign-in";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const session = {
  access_token: "token",
  token_type: "bearer",
  expires_in: 900,
  admin: {
    id: "01936f3e-0000-7000-8000-000000000001",
    full_name: "Platform Admin",
    email: "admin@platform.example",
  },
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useConsoleSession.setState({ session: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  replace.mockReset();
});

async function passwordStep() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "admin@platform.example");
  await user.type(screen.getByLabelText("Password"), "platform-dev-2026");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  return user;
}

describe("ConsoleSignIn", () => {
  it("asks for the code after the password, then opens the console", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { step: "verify", challenge: "c".repeat(40) }))
      .mockResolvedValueOnce(json(200, session));
    render(<ConsoleSignIn />);
    const user = await passwordStep();

    expect(await screen.findByRole("heading", { name: "Enter your code" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("6-digit code"), "123 456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/console"));
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]?.body))).toEqual({
      challenge: "c".repeat(40),
      code: "123456",
    });
    expect(useConsoleSession.getState().session?.admin.fullName).toBe("Platform Admin");
  });

  it("shows the QR code and the typed key on first sign-in", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        step: "setup",
        challenge: "c".repeat(40),
        setup: { secret: "ABCDEFGHIJKLMNOP", otpauth_uri: "otpauth://totp/x", qr_svg: "<svg/>" },
      }),
    );
    render(<ConsoleSignIn />);
    await passwordStep();

    expect(
      await screen.findByRole("heading", { name: "Set up two-step sign-in" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(screen.getByText("ABCD EFGH IJKL MNOP")).toBeInTheDocument();
  });

  it("explains a wrong code and lets the person try again", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { step: "verify", challenge: "c".repeat(40) }))
      .mockResolvedValueOnce(
        json(401, { code: "code_invalid", message: "That code didn't work.", field: "code" }),
      );
    render(<ConsoleSignIn />);
    const user = await passwordStep();
    await user.type(await screen.findByLabelText("6-digit code"), "000000");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That code didn't work.");
    expect(replace).not.toHaveBeenCalled();
  });
});
