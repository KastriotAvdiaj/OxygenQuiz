import { expect, test } from "./support/fixtures";
import { SAMPLE_QUESTIONS } from "./support/sample-quiz";

/**
 * Guest play (docs/auth/guest-play.md): a signed-out visitor gets one free Classic quiz per
 * browser, remembered by the API's `guest_played` cookie. Every Playwright test runs in a fresh
 * browser context — a new visitor — so each test here starts with its free quiz unspent.
 */

const [choice, trueFalse, typed] = SAMPLE_QUESTIONS;

test("a visitor plays one quiz free, is told it wasn't saved, and must sign in for a second", async ({
  page,
  admin,
  sampleQuiz,
  quizPlay,
  loginPage,
}) => {
  await quizPlay.goto(sampleQuiz.id);

  await quizPlay.answer(choice, { correctly: true });
  await quizPlay.next();
  await quizPlay.answer(trueFalse, { correctly: true });
  await quizPlay.next();
  await quizPlay.answer(typed, { correctly: false });
  // The free quiz is spent by POST .../finish, which the results page sends once it has loaded;
  // its response carries the `guest_played` cookie. Leaving before it lands would abort it and
  // keep the quiz free, so wait for it the way a player reading their score does.
  const spent = page.waitForResponse(
    (r) => r.request().method() === "POST" && /\/guest-quiz-sessions\/[^/]+\/finish$/.test(r.url()),
  );
  await quizPlay.finish();

  await expect(page).toHaveURL(/\/quiz\/results-guest\//);
  await expect(page.getByText("You played as a guest — this result won't be saved.")).toBeVisible();
  const overview = page.getByRole("tabpanel", { name: "Overview" });
  await expect(overview.getByText("2 Correct", { exact: true })).toBeVisible();
  await expect(overview.getByText("1 Incorrect", { exact: true })).toBeVisible();

  expect((await spent).status()).toBe(204);

  // The free quiz is spent: the next one goes through sign-in…
  await quizPlay.goto(sampleQuiz.id);
  const playPath = `/quiz/${sampleQuiz.id}/play`;
  await expect(page).toHaveURL(`/login?redirectTo=${encodeURIComponent(playPath)}&guestUsed=1`);

  // …which leads straight back to the quiz, now as a real, saved session.
  const credentials = await admin.createPlayer();
  await loginPage.signIn(credentials);

  await expect(page).toHaveURL(playPath);
  await expect(quizPlay.question(choice.text)).toBeVisible();
});
