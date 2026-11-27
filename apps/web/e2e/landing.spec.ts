import { devices, expect, test, type Page } from "@playwright/test";

const SECTIONS = [
  "problem",
  "journey",
  "disciplines",
  "critical",
  "delivery",
  "safety",
  "people",
  "next",
  "questions",
  "contact",
];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

/** Scroll through the whole page the way a person would, so every entrance plays. */
async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1200);
}

test.describe("landing: desktop", () => {
  test("hero first, every section ends up visible, no errors", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Every sample, accounted for",
    );
    await expect(page.locator("html")).toHaveClass(/motion-ready/);

    await scrollThrough(page);
    for (const id of SECTIONS) {
      const heading = page.locator(`#${id}-title`);
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      await expect.poll(() => heading.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    }
    expect(errors).toEqual([]);
  });

  test("the accordion opens on hover", async ({ page }) => {
    await page.goto("/#questions");
    const question = page.getByRole("button", { name: /Does it connect to our analysers\?/ });
    await question.scrollIntoViewIfNeeded();
    await question.hover();
    await expect(question).toHaveAttribute("aria-expanded", "true");
  });

  test("Pause motion stops the animation and leaves everything visible", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Pause motion" }).click();
    await expect(page.locator("html")).not.toHaveClass(/motion-on/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/motion-on/);
    const lastHeading = page.locator("#contact-title");
    await lastHeading.scrollIntoViewIfNeeded();
    await expect(lastHeading).toBeVisible();
    await page.getByRole("button", { name: "Play motion" }).click();
    await expect(page.locator("html")).toHaveClass(/motion-on/);
  });
});

test.describe("landing: reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing animates and nothing is hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/motion-on/);
    const hidden = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll("[data-reveal]")).filter(
          (el) => getComputedStyle(el).opacity !== "1",
        ).length,
    );
    expect(hidden).toBe(0);
  });
});

test.describe("landing: phone", () => {
  test.use({ viewport: devices["iPhone 13"].viewport, hasTouch: true, isMobile: true });

  test("fits the screen and the accordion opens on tap", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox has no mobile emulation");
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const role = page.getByRole("tab", { name: /Lab Scientists/ });
    await role.scrollIntoViewIfNeeded();
    await role.tap();
    await expect(role).toHaveAttribute("aria-selected", "true");
    expect(errors).toEqual([]);
  });
});

test.describe("landing: coming soon and section bar", () => {
  test("Book a demo opens a Coming soon dialog over a blurred page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Book a demo/ })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: /Demo bookings: coming soon/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toBeHidden();
  });

  test("the section bar follows the scroll", async ({ page }) => {
    await page.goto("/#safety");
    const bar = page.getByRole("navigation", { name: "Sections" });
    await expect(bar.getByRole("link", { name: /Safety/ })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });
});

test.describe("landing: refresh and movement", () => {
  test("a refresh starts at the hero, even from a section link", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.goto("/#safety");
    await page.reload();
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(page.url()).not.toContain("#");
  });

  test("the marquee keeps moving with the mouse over it", async ({ page }) => {
    await page.goto("/");
    const band = page.locator("section.marquee");
    await band.scrollIntoViewIfNeeded();
    await band.hover(); // the container is still; the track inside never is
    const track = band.locator(".marquee-track").first();
    const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const before = await x();
    await page.waitForTimeout(800);
    expect(await x()).not.toBe(before);
  });
});
