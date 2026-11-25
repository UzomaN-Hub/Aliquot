import { describe, expect, it } from "vitest";

import { firstName, greeting } from "./labels";

describe("greeting", () => {
  it("uses the lab's timezone, not the device's", () => {
    const tenUtc = new Date("2026-11-25T10:00:00Z");
    expect(greeting("Africa/Lagos", tenUtc)).toBe("Good morning"); // 11:00 in Lagos
    expect(greeting("Asia/Tokyo", tenUtc)).toBe("Good evening"); // 19:00 in Tokyo
  });

  it.each([
    ["2026-11-25T10:59:00Z", "Good morning"], // 11:59 Lagos
    ["2026-11-25T11:00:00Z", "Good afternoon"], // 12:00
    ["2026-11-25T15:59:00Z", "Good afternoon"], // 16:59
    ["2026-11-25T16:00:00Z", "Good evening"], // 17:00
  ])("%s in Lagos → %s", (iso, expected) => {
    expect(greeting("Africa/Lagos", new Date(iso))).toBe(expected);
  });
});

describe("firstName", () => {
  it("takes the first word", () => {
    expect(firstName("  Ifeoma Adeyemi ")).toBe("Ifeoma");
    expect(firstName("Musa")).toBe("Musa");
  });
});
