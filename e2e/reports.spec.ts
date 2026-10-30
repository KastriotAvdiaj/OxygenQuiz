import { ADMIN } from "./support/stack";
import { LoginPage } from "./support/pages/login-page";
import { accountButton, expect, test } from "./support/fixtures";
import { SAMPLE_QUESTIONS, sampleQuizTitle } from "./support/sample-quiz";
import { uniqueSuffix, type QuestionSpec } from "./support/api";

/**
 * A report from the play screen to the moderators' queue and back (docs/media/moderation.md).
 * The sample quiz is the E2E admin's — a house quiz — so a wrong-answer report skips the author
 * and lands straight in the queue's "Needs attention" lane.
 */

test("a player reports a wrong answer mid-quiz and a moderator resolves it", async ({
  page,
  player,
  admin: adminApi,
  quizPlay,
  browser,
}) => {
  void player; // this browser is signed in as a new player
  // The queue shows question text, and the database outlives a run — so this question's text is
  // its own, or an earlier run's report on the same sample question would match too.
  const choice: QuestionSpec = { ...SAMPLE_QUESTIONS[0], text: `Which planet is red? (${uniqueSuffix()})` };
  const quiz = await adminApi.createClassicQuiz(sampleQuizTitle(), [choice, ...SAMPLE_QUESTIONS.slice(1)]);
  await quizPlay.goto(quiz.id);
  await expect(quizPlay.question(choice.text)).toBeVisible();

  await page.getByRole("button", { name: "Report", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Report this question" });
  await dialog.getByLabel("Wrong answer or information").click();
  await dialog.getByLabel("What's the correct answer?").fill("It's Mars — but the spelling is off");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Thanks for the report")).toBeVisible();

  // Reporting again is refused, in the dialog, by the API.
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await dialog.getByLabel("Spam or nonsense").click();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("alert")).toContainText(/already reported/i);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // The moderator, in a browser of their own.
  const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const admin = await adminContext.newPage();
  try {
    const login = new LoginPage(admin);
    await login.goto();
    await login.signIn(ADMIN);
    await expect(accountButton(admin, ADMIN.username)).toBeVisible();

    await admin.goto("/dashboard/reports");
    await admin.getByRole("tab", { name: /Needs attention/ }).click();
    const item = admin.getByRole("listitem").filter({ hasText: choice.text });
    await expect(item).toBeVisible();
    await expect(item).toContainText("Wrong answer or information × 1");

    await item.getByRole("button", { name: "Reject" }).click();
    await expect(admin.getByText("Reports rejected — content restored")).toBeVisible();
    await expect(item).toHaveCount(0);

    await admin.getByRole("tab", { name: "Resolved" }).click();
    await expect(admin.getByRole("listitem").filter({ hasText: choice.text }).first()).toBeVisible();
  } finally {
    await adminContext.close();
  }
});
