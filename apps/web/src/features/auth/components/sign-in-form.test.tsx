// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionStore } from "@/stores/session";

import { SignInForm } from "./sign-in-form";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const session = {
  access_token: "token",
  token_type: "bearer",
  expires_in: 900,
  user: {
    id: "01936f3e-0000-7000-8000-000000000001",
    full_name: "Ifeoma Adeyemi",
    email: "ifeoma@tavnit-labs.example",
    roles: ["manager"],
    sections: [],
  },
  lab: { name: "Tavnit Labs", slug: "tavnit", timezone: "Africa/Lagos" },
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  useSessionStore.setState({ session: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  replace.mockReset();
});

async function fill(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  it("says what to fix on submit, without calling the API", async () => {
    render(<SignInForm lab="tavnit" />);
    await fill("", "");
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks the email's shape", async () => {
    render(<SignInForm lab="tavnit" />);
    await fill("ifeoma", "secret");
    expect(
      await screen.findByText("Enter an email address like name@example.com."),
    ).toBeInTheDocument();
  });

  it("does not show errors while the person is still typing", async () => {
    render(<SignInForm lab="tavnit" />);
    await userEvent.type(screen.getByLabelText("Email"), "ifeo");
    expect(screen.queryByText(/Enter an email address/)).not.toBeInTheDocument();
  });

  it("signs in, keeps the session in memory and opens the lab", async () => {
    fetchMock.mockResolvedValue(json(200, session));
    render(<SignInForm lab="tavnit" />);
    await fill("ifeoma@tavnit-labs.example", "tavnit-dev-2026");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/l/tavnit"));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/auth/sign-in");
    expect(JSON.parse(String(init?.body))).toEqual({
      lab: "tavnit",
      email: "ifeoma@tavnit-labs.example",
      password: "tavnit-dev-2026",
    });
    expect(useSessionStore.getState().session?.user.fullName).toBe("Ifeoma Adeyemi");
  });

  it("on wrong credentials: one message, password cleared and focused, email kept", async () => {
    fetchMock.mockResolvedValue(
      json(401, {
        code: "invalid_credentials",
        message: "That email and password don't match. Try again or reset your password.",
      }),
    );
    render(<SignInForm lab="tavnit" />);
    await fill("ifeoma@tavnit-labs.example", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email and password don't match.",
    );
    const password = screen.getByLabelText("Password");
    await waitFor(() => expect(password).toHaveFocus());
    expect(password).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("ifeoma@tavnit-labs.example");
    expect(replace).not.toHaveBeenCalled();
  });

  it("explains a network failure in plain words", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<SignInForm lab="tavnit" />);
    await fill("ifeoma@tavnit-labs.example", "tavnit-dev-2026");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Can't reach the server. Check your connection and try again.",
    );
  });
});
