import { expect, test } from "@playwright/test";

/**
 * Decisions 020 and 021 in a real browser: the wide sign-in card with its help and
 * policy links, dialogs that really blur the page, the Prussian landing nav in
 * light mode, the bigger wordmark, and entrances that never hide anything when
 * the person asks for reduced motion.
 */
const SIGN_IN = "/l/tavnit/sign-in";

test.describe("sign-in card", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("is wide and tall, with help, privacy and terms in its foot", async ({ page }) => {
    await page.goto(SIGN_IN);
    const card = page.locator("main [data-surface]").first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(700);
    expect(box?.height).toBeGreaterThanOrEqual(640);
    await expect(card.getByText("Need help? Ask your lab manager.")).toBeVisible();
    await expect(card.getByRole("button", { name: "Privacy policy" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Terms" })).toBeVisible();
  });

  test("policy and forgot-password links open Coming soon over a blurred page", async ({
    page,
  }) => {
    await page.goto(SIGN_IN);
    await page.getByRole("button", { name: "Privacy policy" }).click();
    const dialog = page.getByRole("dialog", { name: /Privacy policy: coming soon/ });
    await expect(dialog).toBeVisible();
    const blur = await page
      .getByTestId("modal-overlay")
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(blur).toContain("blur");
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Forgot your password?" }).click();
    await expect(page.getByRole("dialog", { name: /Password reset: coming soon/ })).toBeVisible();
  });

  test("a field's label stays its plain name; the number is for the eye", async ({ page }) => {
    await page.goto(SIGN_IN);
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("sign-in shows everything at once", async ({ page }) => {
    await page.goto(SIGN_IN);
    for (const locator of [
      page.locator("main [data-surface]").first(),
      page.getByLabel("Email", { exact: true }),
      page.getByRole("button", { name: "Sign in" }),
    ]) {
      await expect(locator).toBeVisible();
    }
    // No waiting: entrances end immediately, so nothing is still see-through.
    const opacities = await page
      .locator("form > *")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.every((value) => value === "1")).toBe(true);
  });
});

test.describe("landing nav", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is Prussian in light mode, with a big wordmark and its mark", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.goto("/");
    const nav = page.locator("header").first();
    await expect(nav).toHaveCSS("background-color", "rgb(27, 58, 92)");
    const home = nav.getByRole("link", { name: /back to the top/ });
    const size = await home
      .locator("span")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(40);
    const mark = await home.locator("svg").boundingBox();
    expect(mark?.width).toBeGreaterThan(0);
  });

  test("keeps graphite in dark mode", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto("/");
    await expect(page.locator("header").first()).not.toHaveCSS(
      "background-color",
      "rgb(27, 58, 92)",
    );
  });
});
