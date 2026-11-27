import { expect, test, type Page } from "@playwright/test";

import { totp } from "./support/totp";

/**
 * Platform team end to end (decision 019): a super-admin invites another, who chooses
 * a password and sets up 2FA in their own browser; then the first deactivates them and
 * their open session ends at once.
 */
const PASSWORD = "e2e-admin-password-2026"; // fictional, from e2e_seed.py
const TEAM_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"; // test-only, from e2e_seed.py
const INVITEE_PASSWORD = "a long passphrase for the e2e console";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/console/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
}

test("console team: invite, join with 2FA, deactivate", async ({ page, browser }, testInfo) => {
  const project = testInfo.project.name;
  const inviteeEmail = `adaeze.${project}.${Date.now().toString(36)}@platform.example`;

  // ── The team admin signs in (2FA already set up by the seed) ──────────
  await signIn(page, `e2e-team-${project}@platform.example`, PASSWORD);
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  await page.getByLabel("6-digit code").fill(totp(TEAM_SECRET));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/console$/);

  // ── Invite a super-admin; the link is shown once ──────────────────────
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Team" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/\d+ super-admins?/);
  await page.getByRole("button", { name: "Invite a super-admin" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Adaeze Nwosu");
  await dialog.getByLabel("Email").fill(inviteeEmail);
  await dialog.getByRole("button", { name: "Create invite link" }).click();
  await expect(dialog.getByRole("heading", { name: "Adaeze is invited" })).toBeVisible();
  const link = (await dialog.getByLabel("Invite link").textContent())?.trim() ?? "";
  expect(link).toContain("/console/accept-invite#token=");
  await dialog.getByRole("button", { name: "Done" }).click();
  // By email: names repeat (and earlier runs leave their own Adaeze behind).
  const row = page.getByRole("row").filter({ hasText: inviteeEmail });
  await expect(row).toContainText("Invited · link works until");

  // ── The invitee, in their own browser, chooses a password and sets up 2FA ─
  const theirs = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const guest = await theirs.newPage();
  await guest.goto(link);
  await expect(guest.getByRole("heading", { name: "Welcome, Adaeze." })).toBeVisible();
  await guest.getByLabel("New password").fill(INVITEE_PASSWORD);
  await guest.getByLabel("Type it again").fill(INVITEE_PASSWORD);
  await guest.getByRole("button", { name: "Set password" }).click();
  await expect(guest.getByRole("heading", { name: "One more step, Adaeze." })).toBeVisible();
  expect(guest.url()).not.toContain("token=");

  await guest.getByRole("link", { name: "Go to sign-in" }).click();
  await guest.getByLabel("Email").fill(inviteeEmail);
  await guest.getByLabel("Password", { exact: true }).fill(INVITEE_PASSWORD);
  await guest.getByRole("button", { name: "Continue" }).click();
  await expect(guest.getByRole("heading", { name: "Set up two-step sign-in" })).toBeVisible();
  const key = (await guest.getByTestId("totp-key").textContent()) ?? "";
  await guest.getByLabel("6-digit code").fill(totp(key));
  await guest.getByRole("button", { name: "Turn on and sign in" }).click();
  await expect(guest).toHaveURL(/\/console$/);

  // ── Back on the team page: active with 2FA. Then deactivate. ──────────
  await page.reload();
  await expect(row).toContainText("Active");
  await expect(row).toContainText("On");
  await row.getByRole("link", { name: "Adaeze Nwosu" }).click();
  await page.getByRole("button", { name: "Deactivate Adaeze" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("End-to-end test");
  await page.getByRole("dialog").getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByRole("term").filter({ hasText: "Deactivated" })).toBeVisible();

  // Their open console session ends at once: the next page load signs them out.
  await guest.goto("/console/team");
  await expect(guest).toHaveURL(/\/console\/sign-in$/);
  await theirs.close();
});
