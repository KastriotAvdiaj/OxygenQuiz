import { expect, test } from "./support/fixtures";
import { SAMPLE_QUESTIONS } from "./support/sample-quiz";

/**
 * A signed-in player's Classic quiz, from the first question to the saved result
 * (docs/quiz/quiz-playing-architecture.md, docs/quiz/session-lifecycle.md).
 */

const [choice, trueFalse, typed] = SAMPLE_QUESTIONS;

test("a player answers every question type and the result is scored and saved", async ({
  page,
  player,
  sampleQuiz,
  quizPlay,
}) => {
  void player; // requested for its effect: this browser is signed in as a new player
  await quizPlay.goto(sampleQuiz.id);

  await quizPlay.answer(choice, { correctly: true });
  await quizPlay.next();
  await quizPlay.answer(trueFalse, { correctly: false });
  await quizPlay.next();
  await quizPlay.answer(typed, { correctly: true });
  await quizPlay.finish();

  // Accuracy, not points: points carry a speed bonus and would make this assertion a race.
  const overview = page.getByRole("tabpanel", { name: "Overview" });
  await expect(page.getByRole("heading", { level: 1, name: sampleQuiz.title })).toBeVisible();
  await expect(overview.getByText("67", { exact: true })).toBeVisible();
  await expect(overview.getByText("2 Correct", { exact: true })).toBeVisible();
  await expect(overview.getByText("1 Incorrect", { exact: true })).toBeVisible();

  // The review shows each answer against the right one.
  await page.getByRole("tab", { name: "Question Review" }).click();
  const review = page.getByRole("tabpanel", { name: "Question Review" });
  await expect(review.getByRole("heading", { name: choice.text })).toBeVisible();
  await expect(review.getByText("Your Answer")).toBeVisible();

  // Saved to the player's history, pointing at this very result.
  const resultUrl = new URL(page.url()).pathname;
  await page.goto("/my-dashboard/history");
  const row = page.getByRole("row").filter({ hasText: sampleQuiz.title });
  await expect(row).toContainText("67/100");
  await expect(row.getByRole("link", { name: sampleQuiz.title, exact: true })).toHaveAttribute("href", resultUrl);
});

test("a quiz left mid-way is offered back and resumes at the next question", async ({
  page,
  player,
  sampleQuiz,
  quizPlay,
}) => {
  void player; // signed in, as above
  await quizPlay.goto(sampleQuiz.id);
  await quizPlay.answer(choice, { correctly: true });
  await quizPlay.next();
  await expect(quizPlay.question(trueFalse.text)).toBeVisible();

  // Leave the tab and come back — the server kept the session and the question in flight.
  await page.goto("/");
  await quizPlay.goto(sampleQuiz.id);

  await expect(page.getByRole("heading", { name: "Session In Progress" })).toBeVisible();
  await expect(page.getByText("Question 2 of 3 is still running")).toBeVisible();
  await page.getByRole("button", { name: "Resume Quiz" }).click();

  // The first answer stays answered: play picks up at question two.
  await quizPlay.answer(trueFalse, { correctly: true });
  await quizPlay.next();
  await quizPlay.answer(typed, { correctly: true });
  await quizPlay.finish();

  const overview = page.getByRole("tabpanel", { name: "Overview" });
  await expect(overview.getByText("3 Correct", { exact: true })).toBeVisible();
  await expect(overview.getByText("0 Incorrect", { exact: true })).toBeVisible();
});
