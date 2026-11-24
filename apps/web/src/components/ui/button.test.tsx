// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("is type=button by default, so it never submits a form by accident", () => {
    render(<Button>Add staff</Button>);
    expect(screen.getByRole("button", { name: "Add staff" })).toHaveAttribute("type", "button");
  });

  it("calls onClick when idle", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Release result</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("blocks repeat clicks and form submits while pending", async () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button type="submit" pending pendingLabel="Saving…" onClick={onClick}>
          Save
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("announces busy, stays focusable and is named by the pending label", () => {
    render(
      <Button pending pendingLabel="Saving…">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toBeEnabled();
  });

  it("keeps both labels in the layout so the width doesn't jump", () => {
    const { rerender } = render(<Button pendingLabel="Saving…">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveTextContent("SaveSaving…");

    rerender(
      <Button pending pendingLabel="Saving…">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveTextContent("SaveSaving…");
  });

  it("renders its child element with button styling when asChild", () => {
    render(
      <Button asChild variant="link">
        <a href="/forgot-password">Forgot password?</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Forgot password?" });
    expect(link).toHaveAttribute("href", "/forgot-password");
    expect(link).toHaveClass("underline");
  });

  it("lets a caller's class override a variant class", () => {
    render(<Button className="w-full">Sign in</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full", "rounded-control", "bg-primary");
  });
});
