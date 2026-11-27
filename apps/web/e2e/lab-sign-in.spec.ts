import { expect, test } from "@playwright/test";

// Tavnit Labs is seeded by app/scripts/e2e_seed.py (fictional staff).
const SIGN_IN = "/l/tavnit/sign-in";
const STAFF = { email: "chidinma@tavnit-labs.example", password: "tavnit-dev-2026" };

test("shows the lab's name and says what to fix", async ({ page }) => {
  await page.goto(SIGN_IN);
  await expect(page.getByText("Tavnit Labs").first()).toBeVisible();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
});

test("wrong password: one message, password cleared, email kept", async ({ page }) => {
  await page.goto(SIGN_IN);
  await page.getByLabel("Email").fill(STAFF.email);
  await page.getByLabel("Password", { exact: true }).fill("not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "That email and password don't match.",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Email")).toHaveValue(STAFF.email);
});

test("signs in, stays signed in after a reload, signs out", async ({ page }) => {
  await page.goto(SIGN_IN);
  await page.getByLabel("Email").fill(STAFF.email);
  await page.getByLabel("Password", { exact: true }).fill(STAFF.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  const greeting = page.getByRole("heading", { level: 1 });
  await expect(page).toHaveURL(/\/l\/tavnit$/);
  await expect(greeting).toContainText("Chidinma");

  // The access token lives only in memory; the refresh cookie brings it back.
  await page.reload();
  await expect(greeting).toContainText("Chidinma");

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/l\/tavnit\/sign-in$/);

  await page.goto("/l/tavnit");
  await expect(page).toHaveURL(/\/l\/tavnit\/sign-in$/);
});

test("an unknown lab address shows page not found", async ({ page }) => {
  await page.goto("/l/no-such-lab/sign-in");
  await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();
});
