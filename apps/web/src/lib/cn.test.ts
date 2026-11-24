import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins classes and skips falsy values", () => {
    expect(cn("text-ink", false, undefined, "font-medium")).toBe("text-ink font-medium");
  });

  it("keeps a colour and a size of our custom scale together", () => {
    // Default tailwind-merge would treat text-caption as a colour and drop text-ink.
    expect(cn("text-ink text-body", "text-caption")).toBe("text-ink text-caption");
  });

  it("lets the later class win within the same group", () => {
    expect(cn("text-ink", "text-eosin-text")).toBe("text-eosin-text");
    expect(cn("rounded-control", "rounded-full")).toBe("rounded-full");
    expect(cn("shadow-overlay", "shadow-none")).toBe("shadow-none");
  });
});
