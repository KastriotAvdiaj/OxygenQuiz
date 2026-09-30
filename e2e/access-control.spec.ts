import type { Page } from "@playwright/test";
import { accountButton, expect, test } from "./support/fixtures";
import { uniqueSuffix } from "./support/api";
import { ADMIN } from "./support/stack";

/**
 * Route guards (createAuthLoader in src/lib/Auth.tsx): who reaches which part of the app, and
 * where everyone else is sent. The API enforces the same rules on its side — these tests are
 * about what the browser shows, which is a separate thing to get wrong.
 */

test.describe("Signed out", () => {
  test("a protected page sends you to sign in, then back to that page", async ({
    page,
    admin,
    loginPage,
  }) => {
    const credentials = await admin.createPlayer();

    await page.goto("/my-dashboard/history");

    await expect(page).toHaveURL(`/login?redirectTo=${encodeURIComponent("/my-dashboard/history")}`);

    await loginPage.signIn(credentials);

    await expect(page).toHaveURL("/my-dashboard/history");
    await expect(page.getByRole("heading", { level: 1, name: "Quiz History" })).toBeVisible();
  });
});

test.describe("The admin dashboard", () => {
  test("looks exactly like a page that doesn't exist to a signed-in player", async ({
    page,
    player,
  }) => {
    // Signed in first, so the 404 below is the admin gate talking and not the login redirect.
    await page.goto("/");
    await expect(accountButton(page, player.username)).toBeVisible();

    // What a URL that really doesn't exist shows. Read from the page rather than copied into the
    // test, so rewording the 404 can't break this — only the two pages drifting apart can.
    await page.goto(`/no-such-page-${uniqueSuffix()}`);
    const realNotFound = await notFoundScreen(page);

    await page.goto("/dashboard");

    // Hidden, not forbidden (adminAuthLoader → DashboardErrorElement → NotFoundRoute).
    expect(await notFoundScreen(page)).toEqual(realNotFound);
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("navigation", { name: "Dashboard" })).toHaveCount(0);
  });

  test("opens for the admin", async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.signIn(ADMIN);
    await expect(accountButton(page, ADMIN.username)).toBeVisible();

    await page.goto("/dashboard");

    // The dashboard index redirects to the question bank.
    await expect(page).toHaveURL("/dashboard/questions");
    await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
  });

  // Known issue — docs/deployment/known-issues.md, "Hidden admin pages still call the API before
  // they 404". A child route's loader runs in parallel with the parent's admin gate, and
  // /dashboard/users gates itself on the `user:view` permission, which the plain User role holds.
  // So the player does get the 404, but only after GET /api/users has gone out, come back 403 and
  // raised an error toast that says the page is there. Remove `fixme` with the fix.
  test.fixme("a hidden page makes no admin API call before the 404", async ({ page, player }) => {
    void player; // requested for its effect: this browser is signed in as a new player
    const adminCalls: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 403) adminCalls.push(response.url());
    });

    await page.goto("/dashboard/users");

    await expect(page.getByRole("img", { name: "404" })).toBeVisible();
    // Asserted on the network, not the toast: toasts dismiss themselves, so "no alert" would
    // eventually pass even while the bug is there.
    expect(adminCalls).toEqual([]);
  });
});

/**
 * The parts of the 404 screen a visitor reads: the "404" image, the title and the ways out. Waits
 * for the image first, so it never reads a page that hasn't rendered yet.
 */
async function notFoundScreen(page: Page) {
  await expect(page.getByRole("img", { name: "404" })).toBeVisible();
  return {
    title: await page.getByRole("heading", { level: 1 }).innerText(),
    actions: await page.getByRole("link").allInnerTexts(),
  };
}
