import type { Locator, Page } from "@playwright/test";
import { ADMIN } from "./support/stack";
import { accountButton, expect, test } from "./support/fixtures";
import { uniqueSuffix } from "./support/api";

/**
 * The question bank's create drawer stays open after a save, so an author can add question after
 * question (use-create-another.ts): each save says "Question created" on the Submit button,
 * empties the form for the next one, and keeps its category, difficulty and language. Closing the
 * drawer ends the batch and closes the type chooser behind it.
 *
 * The explanation step guards FormDrawer's outside-click check: "Add an explanation" replaces
 * itself on click, and the drawer once took that for a click outside and closed.
 */

async function fillMultipleChoice(drawer: Locator, text: string) {
  await drawer.getByPlaceholder("Enter your question here...").fill(text);
  for (let i = 1; i <= 4; i++) {
    await drawer.getByPlaceholder(`Answer option ${i}`, { exact: true }).fill(`${text} — option ${i}`);
  }
  await drawer.getByRole("switch", { name: "Option 1 is correct" }).click();
}

async function choose(page: Page, drawer: Locator, select: string, option: string) {
  await drawer.getByRole("combobox").filter({ hasText: select }).click();
  // The E2E database is seeded with these (QuizAPI's lookup seeds).
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("an admin adds two questions in a row without leaving the drawer", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.signIn(ADMIN);
  await expect(accountButton(page, ADMIN.username)).toBeVisible();

  await page.goto("/dashboard/questions");
  await page.getByRole("button", { name: "Add Question +" }).click();
  await page.getByRole("button", { name: "Multiple Choice" }).click();
  const drawer = page.getByRole("dialog", { name: "Create a New Multiple Choice Question" });
  const questionField = drawer.getByPlaceholder("Enter your question here...");

  // The database outlives a run, so the texts are this run's own.
  const first = `Which gas do plants take in? (${uniqueSuffix()})`;
  const second = `Which planet is closest to the Sun? (${uniqueSuffix()})`;

  await fillMultipleChoice(drawer, first);
  await drawer.getByRole("button", { name: /Add an explanation/ }).click();
  await drawer.getByLabel(/Explanation/).fill("Mars looks red because of iron oxide dust.");
  await choose(page, drawer, "Select category", "Science");
  await choose(page, drawer, "Select difficulty", "Unspecified");
  await choose(page, drawer, "Select language", "English");
  await drawer.getByRole("button", { name: "Submit" }).click();

  // Saved, and still here: the confirmation, an empty form, the cursor back in the question —
  // and the last question's category, difficulty and language already chosen.
  await expect(drawer.getByRole("status")).toHaveText("Question created.");
  await expect(questionField).toHaveValue("");
  await expect(questionField).toBeFocused();
  await expect(drawer.getByPlaceholder("Answer option 1", { exact: true })).toHaveValue("");
  await expect(drawer.getByRole("combobox").filter({ hasText: "Science" })).toBeVisible();
  await expect(drawer.getByRole("combobox").filter({ hasText: "English" })).toBeVisible();

  // The second needs no category, difficulty or language — they carried over.
  await fillMultipleChoice(drawer, second);
  await drawer.getByRole("button", { name: "Submit" }).click();
  await expect(questionField).toHaveValue("");

  // Done: closing the drawer closes the type chooser too.
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(page.getByText("Choose the type of question")).toHaveCount(0);

  // Both are in the bank.
  const search = page.getByPlaceholder("Search questions...");
  await search.fill(first);
  await expect(page.getByText(first)).toBeVisible();
  await search.fill(second);
  await expect(page.getByText(second)).toBeVisible();
});
