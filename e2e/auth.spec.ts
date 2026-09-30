import { accountButton, expect, test } from "./support/fixtures";
import { newCredentials } from "./support/api";

/**
 * Signing up, in and out through the real forms, and the session surviving a reload — the one
 * thing no unit test can see, because it is a conversation between the browser's cookie jar and
 * the API (refresh token + session hint, docs/auth/session-hint.md).
 */

test.describe("Signup", () => {
  test("a new player signs up with an invite code and is signed in", async ({ page, admin }) => {
    const inviteCode = await admin.mintInviteCode();
    const { username, email, password } = newCredentials();

    await page.goto("/signup");

    await page.getByPlaceholder("e.g. K7QM-3FXP-9T").fill(inviteCode);
    await expect(page.getByText("Invite code accepted")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue with email" }).click();

    // One field per step, each checked against the API before Continue unlocks.
    await page.getByPlaceholder("Username").fill(username);
    await expect(page.getByText("Username is available")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByPlaceholder("Email").fill(email);
    await expect(page.getByText("Email is available")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByPlaceholder("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByPlaceholder("Confirm Password").fill(password);
    await expect(page.getByText("Passwords match")).toBeVisible();
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL("/");
    await expect(accountButton(page, username)).toBeVisible();
  });

  test("an invite code that doesn't exist is refused before the form opens", async ({ page }) => {
    await page.goto("/signup");

    // Same shape as a real code, so it's the server that says no, not the length check.
    await page.getByPlaceholder("e.g. K7QM-3FXP-9T").fill("ZZZZ-ZZZZ-ZZ");

    await expect(page.getByText("This invite code isn't valid or has already been used")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with email" })).toHaveCount(0);
  });
});

test.describe("Sign in and out", () => {
  test("a player signs in, stays signed in across a reload, and signs out", async ({
    page,
    admin,
    loginPage,
  }) => {
    const credentials = await admin.createPlayer();

    await loginPage.goto();
    await loginPage.signIn(credentials);

    await expect(page).toHaveURL("/");
    await expect(accountButton(page, credentials.username)).toBeVisible();

    // The access token lives in memory only, so a reload starts from nothing: the session hint
    // cookie sends the app to /refresh, and the HttpOnly refresh cookie brings the session back.
    await page.reload();
    await expect(accountButton(page, credentials.username)).toBeVisible();

    await accountButton(page, credentials.username).click();
    await page.getByRole("button", { name: "Logout" }).click();

    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(accountButton(page, credentials.username)).toHaveCount(0);

    // Signed out on the server too — not just forgotten by this tab.
    await page.reload();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(accountButton(page, credentials.username)).toHaveCount(0);
  });

  test("a wrong password is refused and nobody is signed in", async ({ page, admin, loginPage }) => {
    const credentials = await admin.createPlayer();

    await loginPage.goto();
    await loginPage.signIn({ email: credentials.email, password: "not-the-password" });

    await expect(loginPage.failure).toBeVisible();
    await expect(page).toHaveURL("/login");
    await expect(accountButton(page, credentials.username)).toHaveCount(0);
  });
});
