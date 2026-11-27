import { expect, test } from "@playwright/test";

const PAGE = "/l/tavnit/sign-in";

test("Auto follows the clock: dark from 19:00, light from 08:00", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 27, 20, 30));
  await page.goto(PAGE);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.clock.setFixedTime(new Date(2026, 10, 27, 10, 0));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("a chosen theme overrides Auto and is remembered", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 27, 10, 0)); // daytime: Auto = light
  await page.goto(PAGE);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radio", { name: "Auto" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
