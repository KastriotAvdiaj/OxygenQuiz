import { expect, test } from "./support/fixtures";

/**
 * The quiz home page (docs/quiz/featured-quizzes.md): the featured quizzes the API seeds into every
 * database, laid out as category panels at /choose-quiz. The seam under test is the whole chain —
 * seeder → GET /quiz/featured (anonymous) → the panels → the start dialog → guest play.
 */
test("a first-time visitor picks a featured quiz and plays it as their free quiz", async ({
  page,
  quizPlay,
}) => {
  await page.goto("/choose-quiz");
  await expect(
    page.getByRole("heading", { level: 1, name: "Pick your first quiz" }),
  ).toBeVisible();

  const geography = page.getByRole("region", { name: "Geography" });
  await geography
    .getByRole("button", { name: /^Capitals & Continents, Easy/ })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Capitals & Continents")).toBeVisible();
  await dialog.getByRole("button", { name: "Start Quiz" }).click();

  await expect(page).toHaveURL(/\/quiz\/\d+\/play$/);
  await expect(
    quizPlay.question("What is the capital of Japan?"),
  ).toBeVisible();
});

test("Browse all reaches the full catalogue, and old ?category= links still reach it", async ({
  page,
}) => {
  await page.goto("/choose-quiz");
  await page.getByRole("button", { name: "Browse all" }).click();
  await expect(page).toHaveURL("/choose-quiz/all");

  await page.goto("/choose-quiz?category=Science");
  await expect(page).toHaveURL("/choose-quiz/all?category=Science");
});
