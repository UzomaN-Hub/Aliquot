import { expect, test, type Page } from "@playwright/test";

import { totp } from "./support/totp";

/**
 * My account end to end (decision 023): recovery codes, signing in with one on a
 * second device, signing that device out, a new password and a new phone.
 * Run `e2e_seed` first: this test changes the account's password and phone.
 */
const PASSWORD = "e2e-admin-password-2026"; // fictional, from e2e_seed.py
const SECRET = "KRUGS4ZANFZSAYJAORSXG5BAONSWG4TF"; // test-only, from e2e_seed.py
const NEW_PASSWORD = "a brand new passphrase for the e2e console";
const NEXT_STEP = 30_000; // a 2FA code works once: the next one is 30 seconds ahead

/** Review screenshots (definition of done), only with CAPTURE=1: test-results/capture/. */
async function snap(page: Page, name: string) {
  if (!process.env.CAPTURE) return;
  await page.waitForTimeout(900); // let the entrances finish
  await page.screenshot({ path: `test-results/capture/account-${name}.png`, fullPage: true });
}

async function passwordStep(page: Page, email: string, password: string) {
  await page.goto("/console/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
}

test("my account: recovery codes, sign out elsewhere, password, new phone", async ({
  page,
  browser,
}, testInfo) => {
  const email = `e2e-account-${testInfo.project.name}@platform.example`;

  // ── Sign in and open My account from the menu ─────────────────────────
  await passwordStep(page, email, PASSWORD);
  await page.getByLabel("6-digit code").fill(totp(SECRET));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/console$/);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("menuitem", { name: /^My account/ }).click();
  await expect(page.getByRole("heading", { name: "My account", level: 1 })).toBeVisible();
  await snap(page, "first-visit");

  // ── Make recovery codes: password + the NEXT code from the phone ──────
  const recovery = page.getByRole("region", { name: "Recovery codes" });
  await expect(recovery).toContainText("None yet.");
  await recovery.getByRole("button", { name: "Make recovery codes" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await dialog.getByLabel("6-digit code").fill(totp(SECRET, Date.now() + NEXT_STEP));
  await dialog.getByRole("button", { name: "Make recovery codes" }).click();
  const codes = dialog.getByRole("list", { name: "Recovery codes" }).getByRole("listitem");
  await expect(codes).toHaveCount(10);
  const firstCode = ((await codes.first().textContent()) ?? "").trim();
  expect(firstCode).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
  const done = dialog.getByRole("button", { name: "Done" });
  await expect(done).toBeDisabled();
  await snap(page, "codes-dialog");
  await dialog.getByLabel("I've saved these codes somewhere safe").check();
  await done.click();
  await expect(recovery).toContainText("10 of 10 left");

  // ── A second device signs in with a recovery code ─────────────────────
  const other = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const phoneless = await other.newPage();
  await passwordStep(phoneless, email, PASSWORD);
  await phoneless.getByRole("button", { name: "Use a recovery code instead" }).click();
  await phoneless.getByLabel("Recovery code").fill(firstCode.toLowerCase());
  await phoneless.getByRole("button", { name: "Sign in" }).click();
  await expect(phoneless).toHaveURL(/\/console\/account$/);
  await expect(phoneless.getByText("You signed in with a recovery code; 9 left.")).toBeVisible();
  await snap(phoneless, "after-recovery-sign-in");

  // ── This device signs the other one out ───────────────────────────────
  await page.reload();
  const devices = page.getByRole("region", { name: "Signed-in devices" });
  await expect(devices).toContainText("This device and 1 other.");
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 390, height: 844 });
    await snap(page, "phone");
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    await expect(devices).toContainText("This device and 1 other.");
    await snap(page, "phone-dark");
    await page.setViewportSize({ width: 1440, height: 900 });
    await snap(page, "desktop-dark");
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.reload();
  }
  await devices.getByRole("button", { name: "Sign out everywhere else" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sign out other devices" }).click();
  await expect(devices).toContainText("Signed out 1 other device.");
  await expect(devices).toContainText("Only this device is signed in.");
  await phoneless.goto("/console");
  await expect(phoneless).toHaveURL(/\/console\/sign-in$/);
  await other.close();

  // ── A new password ────────────────────────────────────────────────────
  const password = page.getByRole("region", { name: "Password" });
  await password.getByRole("button", { name: "Change password" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current password").fill(PASSWORD);
  await dialog.getByLabel("New password").fill(NEW_PASSWORD);
  await dialog.getByLabel("Type it again").fill(NEW_PASSWORD);
  await dialog.getByRole("button", { name: "Change password" }).click();
  await expect(password).toContainText("Password changed.");
  await expect(password).toContainText("Last changed");

  // ── A new phone: scan (here: read the key), confirm with its code ─────
  const twoStep = page.getByRole("region", { name: "Two-step sign-in" });
  await twoStep.getByRole("button", { name: "Move to a new phone" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
  await dialog.getByRole("button", { name: "Show the QR code" }).click();
  const qr = dialog.getByRole("img", { name: /QR code/ });
  // Drawn, not just present (the blank-QR bug of decision 016).
  await expect
    .poll(() => qr.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0)))
    .toBeGreaterThan(0);
  const newSecret = ((await dialog.getByTestId("new-totp-key").textContent()) ?? "").replace(
    /\s/g,
    "",
  );
  await snap(page, "new-phone-dialog");
  await dialog.getByLabel("Code from the new phone").fill(totp(newSecret));
  await dialog.getByRole("button", { name: "Use the new phone" }).click();
  await expect(twoStep).toContainText("Moved to your new phone.");

  // ── Sign out, then back in with the new password and the new phone ────
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/console\/sign-in$/);
  await passwordStep(page, email, NEW_PASSWORD);
  await page.getByLabel("6-digit code").fill(totp(newSecret, Date.now() + NEXT_STEP));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/console$/);
});
