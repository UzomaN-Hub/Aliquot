import { describe, expect, it } from "vitest";

import { msUntilNextSwitch, resolveTheme, themeBootScript } from "./theme";

const at = (hours: number, minutes = 0) => new Date(2026, 10, 25, hours, minutes);

describe("resolveTheme", () => {
  it.each([
    [7, 59, "dark"],
    [8, 0, "light"],
    [18, 59, "light"],
    [19, 0, "dark"],
    [0, 30, "dark"],
  ] as const)("auto at %i:%i is %s", (hours, minutes, expected) => {
    expect(resolveTheme("auto", at(hours, minutes))).toBe(expected);
  });

  it("an explicit choice overrides the clock", () => {
    expect(resolveTheme("light", at(22))).toBe("light");
    expect(resolveTheme("dark", at(12))).toBe("dark");
  });
});

describe("msUntilNextSwitch", () => {
  it("counts to 19:00 during the day and to 08:00 at night", () => {
    expect(msUntilNextSwitch(at(18, 0))).toBe(60 * 60 * 1000);
    expect(msUntilNextSwitch(at(7, 0))).toBe(60 * 60 * 1000);
    expect(msUntilNextSwitch(at(23, 0))).toBe(9 * 60 * 60 * 1000);
  });
});

describe("themeBootScript", () => {
  it("agrees with resolveTheme for every hour and preference", () => {
    for (const stored of [null, "auto", "light", "dark", "junk"]) {
      for (let hour = 0; hour < 24; hour++) {
        const dataset: Record<string, string> = {};
        const RealDate = Date;
        const fakeNow = at(hour, 15);
        const FakeDate = class extends RealDate {
          constructor() {
            super(fakeNow.getTime());
          }
        };
        const run = new Function("localStorage", "document", "Date", themeBootScript);
        run({ getItem: () => stored }, { documentElement: { dataset } }, FakeDate);

        const preference = stored === "light" || stored === "dark" ? stored : "auto";
        expect(dataset.theme).toBe(resolveTheme(preference, fakeNow));
        expect(dataset.themePreference).toBe(preference);
      }
    }
  });
});
