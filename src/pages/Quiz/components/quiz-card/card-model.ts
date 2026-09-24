import { useMemo } from "react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import {
  initialsFromName,
  parseQuizPalette,
  readableTextColor,
} from "../quiz-palette";
import { secondsToMinutes } from "../quiz-duration";

/**
 * The data side of a quiz card, kept apart from the rendered parts in `card-parts.tsx`
 * (a module that mixes components with hooks breaks Fast Refresh).
 */

/**
 * What the card says about a quiz's size: "13 questions" for Classic, "Associations board" for a
 * board. `count` is null when there is no number to show. Also used for the frame's aria-label, so
 * the spoken and the visible description never disagree.
 */
export function quizSizeLabel(
  quiz: Pick<QuizSummaryDTO, "format" | "questionCount">
): { count: number | null; label: string } {
  if (quiz.format === "Associations") return { count: null, label: "Associations board" };
  return {
    count: quiz.questionCount,
    label: quiz.questionCount === 1 ? "question" : "questions",
  };
}

/** Difficulty as a 1–3 rank for the meter. `null` if it isn't one of easy/medium/hard. */
function difficultyRank(difficulty?: string): 1 | 2 | 3 | null {
  switch (difficulty?.trim().toLowerCase()) {
    case "easy":
      return 1;
    case "medium":
      return 2;
    case "hard":
      return 3;
    default:
      return null;
  }
}

/**
 * Everything the card needs about a quiz, derived once.
 *
 * `onAccent` is the important one: category palettes run from deep navy to pale yellow, so
 * text sitting *on* the accent must flip between black and white rather than assume white.
 * The current card only paints the accent as text, but the frame still exposes it for any
 * future element that sits on a filled accent.
 */
export function useQuizCardModel(quiz: QuizSummaryDTO) {
  return useMemo(() => {
    const colors = parseQuizPalette(quiz.colorPaletteJson);
    const accent = colors[0];

    return {
      colors,
      accent,
      onAccent: readableTextColor(accent),
      initials: initialsFromName(quiz.user),
      // A board has no questions, so its count would read "0 questions" — the format name is the
      // honest size line instead. See docs/quiz/quiz-card.md.
      sizeLabel: quizSizeLabel({ format: quiz.format, questionCount: quiz.questionCount }),
      duration:
        quiz.timeLimitInSeconds > 0
          ? secondsToMinutes(quiz.timeLimitInSeconds)
          : null,
      difficultyRank: difficultyRank(quiz.difficulty),
    };
  }, [
    quiz.colorPaletteJson,
    quiz.user,
    quiz.questionCount,
    quiz.format,
    quiz.timeLimitInSeconds,
    quiz.difficulty,
  ]);
}
