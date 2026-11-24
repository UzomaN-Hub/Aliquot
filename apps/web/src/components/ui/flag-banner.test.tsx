// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Banner } from "./banner";
import { Flag, type ResultFlag } from "./flag";

describe("Flag", () => {
  it.each<[ResultFlag, string, string]>([
    ["H", "H↑", "High"],
    ["L", "L↓", "Low"],
    ["CH", "CH↑", "Critical high"],
    ["CL", "CL↓", "Critical low"],
    ["ABN", "ABN", "Abnormal"],
  ])("%s shows its letters and is spoken in words", (flag, visible, spoken) => {
    render(<Flag flag={flag} />);
    expect(screen.getByText(visible)).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(spoken)).toHaveClass("sr-only");
  });

  it("marks criticals in Eosin text, other flags in ink", () => {
    const { container, rerender } = render(<Flag flag="CH" />);
    expect(container.firstChild).toHaveClass("text-eosin-text");
    rerender(<Flag flag="H" />);
    expect(container.firstChild).toHaveClass("text-ink");
  });

  it("renders nothing for a normal result", () => {
    const { container } = render(<Flag flag="N" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Banner", () => {
  it("announces critical conditions immediately", () => {
    render(<Banner severity="critical">3 critical results not acknowledged.</Banner>);
    expect(screen.getByRole("alert")).toHaveTextContent("3 critical results not acknowledged.");
  });

  it("prefixes warnings with the word Warning, so meaning never rests on colour", () => {
    render(<Banner severity="warning">Session ends in 5 minutes.</Banner>);
    expect(screen.getByRole("status")).toHaveTextContent("Warning. Session ends in 5 minutes.");
  });

  it("shows its one action", () => {
    render(
      <Banner severity="info" action={<a href="#retry">Reconnect</a>}>
        You&apos;re offline.
      </Banner>,
    );
    expect(screen.getByRole("link", { name: "Reconnect" })).toBeInTheDocument();
  });
});
