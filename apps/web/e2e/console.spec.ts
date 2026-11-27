import { expect, test } from "@playwright/test";

import { totp } from "./support/totp";

/**
 * The platform console end to end, as a super-admin would do it on day one:
 * 2FA setup (QR really drawn) → create a lab → the new Manager sets a password and
 * signs in → suspend the lab → its staff can no longer sign in.
 */
const ADMIN_PASSWORD = "e2e-admin-password-2026"; // fictional, from e2e_seed.py
const MANAGER_PASSWORD = "a long first password for the e2e lab";

test("console: 2FA setup, create a lab, invite, suspend", async ({ page }, testInfo) => {
  const browser = testInfo.project.name;
  const slug = `e2e-${browser}-${Date.now().toString(36)}`;
  const managerEmail = `ngozi.${slug}@e2e-lab.example`;
  const labName = `E2E Lab ${slug}`;

  // ── Sign in: password, then set up 2FA ──────────────────────────────────
  await page.goto("/console/sign-in");
  await page.getByLabel("Email").fill(`e2e-${browser}@platform.example`);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Set up two-step sign-in" })).toBeVisible();
  const qr = page.getByRole("img", { name: /QR code/ });
  // The bug we once shipped: an image that exists but draws nothing.
  await expect
    .poll(() => qr.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0)))
    .toBeGreaterThan(0);

  const key = (await page.getByTestId("totp-key").textContent()) ?? "";
  await page.getByLabel("6-digit code").fill(totp(key));
  await page.getByRole("button", { name: "Turn on and sign in" }).click();
  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/\d+ labs?/);

  // ── Create a lab with its first Manager ─────────────────────────────────
  await page.getByRole("link", { name: "Create a lab" }).click();
  await page.getByLabel("Name", { exact: true }).fill(labName);
  await page.getByLabel("Address on the platform").fill(slug);
  await page.getByLabel("Full name").fill("Ngozi Bello");
  await page.getByLabel("Email", { exact: true }).fill(managerEmail);
  await page.getByRole("button", { name: "Create lab" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("is ready.");
  const invite = (await page.getByLabel("Invite link").textContent())?.trim() ?? "";
  expect(invite).toContain(`/l/${slug}/set-password#token=`);

  // ── The invited Manager chooses a password and signs in ─────────────────
  await page.goto(invite);
  await expect(page.getByRole("heading", { name: "Welcome, Ngozi." })).toBeVisible();
  await page.getByLabel("New password").fill(MANAGER_PASSWORD);
  await page.getByLabel("Type it again").fill(MANAGER_PASSWORD);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByRole("heading", { name: /all set/ })).toBeVisible();
  // The spent link leaves the address bar.
  expect(page.url()).not.toContain("token=");

  await page.getByRole("link", { name: "Go to sign-in" }).click();
  await page.getByLabel("Email").fill(managerEmail);
  await page.getByLabel("Password", { exact: true }).fill(MANAGER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ngozi");

  // ── Suspend the lab from the console ────────────────────────────────────
  await page.goto("/console");
  await page.getByRole("link", { name: labName }).click();
  await page.getByRole("button", { name: "Suspend lab" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Reason").fill("End-to-end test");
  await dialog.getByRole("button", { name: "Suspend lab" }).click();
  await expect(page.getByText(/^Suspended on /)).toBeVisible();

  // Staff of a suspended lab can't sign in. The sign-in page caches the lab's status
  // for up to 5 minutes, so it may still show the form; the API refuses either way.
  await page.goto(`/l/${slug}/sign-in`);
  const unavailable = page.getByText(/unavailable right now/).first();
  const form = page.getByLabel("Email");
  await expect(form.or(unavailable)).toBeVisible();
  if (await form.isVisible()) {
    await form.fill(managerEmail);
    await page.getByLabel("Password", { exact: true }).fill(MANAGER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(unavailable).toBeVisible();
});
