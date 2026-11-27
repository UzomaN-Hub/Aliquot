import { expect, test } from "@playwright/test";

/**
 * Review tool, not a test: full-page screenshots of key pages in light and dark, at
 * desktop and phone widths, for checking against DESIGN.md (definition of done).
 * Runs only on request:  $env:CAPTURE="1"; pnpm e2e --project=chromium capture
 * Output: test-results/capture/*.png (gitignored).
 */
test.skip(!process.env.CAPTURE, "Set CAPTURE=1 to take review screenshots");

const PAGES = [{ name: "landing", path: "/" }];
const SECTION_IDS = [
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
const SIZES = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

for (const target of PAGES) {
  for (const size of SIZES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${target.name} ${size.name} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
        await page.goto(target.path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

        // Let every entrance play, then capture the first screen and the whole page.
        await page.waitForTimeout(2500);
        await page.screenshot({
          path: `test-results/capture/${target.name}-${size.name}-${theme}-hero.png`,
        });
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 400) {
          await page.mouse.wheel(0, 400);
          await page.waitForTimeout(80);
        }
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(800);
        await page.screenshot({
          path: `test-results/capture/${target.name}-${size.name}-${theme}-full.png`,
          fullPage: true,
        });

        // Each landing section as a visitor sees it, after its entrance has played.
        if (target.name === "landing") {
          for (const id of SECTION_IDS) {
            await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: "start" }));
            await page.waitForTimeout(2200);
            await page.screenshot({
              path: `test-results/capture/${target.name}-${size.name}-${theme}-${id}.png`,
            });
          }
        }
      });
    }
  }
}
