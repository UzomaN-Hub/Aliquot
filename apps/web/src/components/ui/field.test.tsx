// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Field, Input, Textarea } from "./field";
import { PasswordInput } from "./password-input";

describe("Field", () => {
  it("labels its control", () => {
    render(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("describes the control with its hint, and is valid without an error", () => {
    render(
      <Field label="Phone" hint="Used for result links on WhatsApp.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Phone");
    expect(input).toHaveAccessibleDescription("Used for result links on WhatsApp.");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and adds the error to its description", () => {
    render(
      <Field label="Date of birth" hint="DD/MM/YYYY" error="Enter a date in the past.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Date of birth");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("DD/MM/YYYY Enter a date in the past.");
  });

  it("marks optional fields, not required ones", () => {
    render(
      <Field label="Email" optional>
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Email (optional)")).toBeInTheDocument();
  });

  it("works with a textarea", () => {
    render(
      <Field label="Clinical details">
        <Textarea />
      </Field>,
    );
    expect(screen.getByLabelText("Clinical details").tagName).toBe("TEXTAREA");
  });

  it("refuses a control outside a Field, so no input ships without a label", () => {
    expect(() => render(<Input />)).toThrow("inside a <Field>");
  });
});

describe("PasswordInput", () => {
  it("is hidden by default and toggles with a named button", async () => {
    render(
      <Field label="Password">
        <PasswordInput />
      </Field>,
    );
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");

    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByText("Your password is shown.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
