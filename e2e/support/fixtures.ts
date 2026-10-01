import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { AdminApi, type Credentials, type CreatedQuiz } from "./api";
import { LoginPage } from "./pages/login-page";
import { QuizPlayPage } from "./pages/quiz-play-page";
import { SAMPLE_QUESTIONS, sampleQuizTitle } from "./sample-quiz";

/**
 * What a spec can ask for. Everything is created fresh for the test that asks, except the admin
 * session, which one worker shares across its tests.
 *
 * - `admin`       — the API as the seeded SuperAdmin, for setup (invite codes, quizzes, accounts).
 * - `player`      — a new account, with the test's browser already signed in to it. Signing in
 *                   through the form is what the auth specs test; everything else starts here.
 * - `sampleQuiz`  — a new Public quiz with one question of each Classic type (sample-quiz.ts).
 * - `loginPage`, `quizPlay` — page objects bound to the test's page.
 */
type TestFixtures = {
  player: Credentials;
  sampleQuiz: CreatedQuiz;
  loginPage: LoginPage;
  quizPlay: QuizPlayPage;
};

type WorkerFixtures = {
  admin: AdminApi;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  admin: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixture list from this parameter
    async ({}, use) => {
      const admin = await AdminApi.signIn();
      await use(admin);
      await admin.dispose();
    },
    { scope: "worker" },
  ],

  player: async ({ admin, context }, use) => {
    await use(await admin.createPlayer(context));
  },

  sampleQuiz: async ({ admin }, use) => {
    await use(await admin.createClassicQuiz(sampleQuizTitle(), SAMPLE_QUESTIONS));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  quizPlay: async ({ page }, use) => {
    await use(new QuizPlayPage(page));
  },
});

export { expect };

/**
 * The header's account button — the signed-in user's name, then their initial. Present only when
 * someone is signed in, so it doubles as the "who is this browser?" check.
 */
export function accountButton(page: Page, username: string): Locator {
  return page.getByRole("button", { name: new RegExp(`^${username}\\b`) });
}
