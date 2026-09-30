import { expect, type Locator, type Page } from "@playwright/test";
import type { QuestionSpec } from "../api";

/**
 * Classic single-player play — the same screen for a signed-in player and a guest
 * (docs/quiz/quiz-playing-architecture.md). Methods act the way a player does: read the question,
 * pick or type an answer, press Submit, read the verdict.
 */
export class QuizPlayPage {
  readonly submitButton: Locator;
  readonly nextButton: Locator;
  readonly finishButton: Locator;

  constructor(readonly page: Page) {
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
    this.nextButton = page.getByRole("button", { name: "Next", exact: true });
    this.finishButton = page.getByRole("button", { name: "Finish", exact: true });
  }

  async goto(quizId: number): Promise<void> {
    await this.page.goto(`/quiz/${quizId}/play`);
  }

  /** The question on screen right now. */
  question(text: string): Locator {
    return this.page.getByRole("heading", { level: 2, name: text });
  }

  /**
   * Answers the question on screen — rightly or wrongly — and waits for the verdict. The quizzes
   * the suite builds show feedback immediately, so every answer is followed by "Correct!" or
   * "Incorrect" before the player moves on.
   */
  async answer(question: QuestionSpec, { correctly }: { correctly: boolean }): Promise<void> {
    await expect(this.question(question.text)).toBeVisible();

    switch (question.type) {
      case "MultipleChoice": {
        const option = question.options.find((o) => o.isCorrect === correctly);
        if (!option) throw new Error(`"${question.text}" has no ${correctly ? "right" : "wrong"} option`);
        await this.page.getByRole("button", { name: option.text, exact: true }).click();
        break;
      }
      case "TrueFalse": {
        const choice = correctly === question.answer ? "True" : "False";
        await this.page.getByRole("button", { name: choice, exact: true }).click();
        break;
      }
      case "TypeTheAnswer":
        // The field has a placeholder but no label; the placeholder is what a player reads.
        await this.page
          .getByPlaceholder("Type your answer here...")
          .fill(correctly ? question.answer : "definitely not it");
        break;
    }

    await this.submitButton.click();
    await expect(this.verdict(correctly)).toBeVisible();
  }

  /** "Correct!" or "Incorrect" — the text is followed by the answer time ("Correct! 0.7s"). */
  verdict(correct: boolean): Locator {
    return this.page.getByText(correct ? /^Correct!/ : /^Incorrect/);
  }

  /** Next rather than waiting out the auto-advance countdown. */
  async next(): Promise<void> {
    await this.nextButton.click();
  }

  /** Ends the quiz from its last question and waits for the results page. */
  async finish(): Promise<void> {
    await this.finishButton.click();
    await this.page.waitForURL(/\/quiz\/results(-guest)?\//);
  }
}
