import { CheckCircle, Edit3, List, type LucideIcon } from "lucide-react";
import { QuestionType } from "@/types/question-types";

/**
 * Single source of truth for how each question type is colored across the quiz builder — the
 * small cards in the questions panel AND the large card in the main editor. Change a hue here
 * and every card that renders that type updates in lockstep.
 *
 * Design intent (see docs/quiz/question-type-color-schema.md):
 * - Type is *metadata*, so it's a quiet, constant tag: a 3px left accent bar plus a colored
 *   icon + label. It never floods the card.
 * - Selection is a *state*, so it's the loud signal: a solid border + ring + a faint tint,
 *   applied identically for every type.
 * - Error overrides the type entirely with red (see `questionErrorTheme`).
 *
 * All values are complete literal Tailwind class strings so the JIT compiler can see them —
 * never build these by string concatenation.
 */
export interface QuestionTypeTheme {
  /** Human label shown next to the icon, e.g. "Multiple Choice". */
  label: string;
  /** Type icon (lucide). */
  Icon: LucideIcon;
  /** Icon + label color. */
  accentText: string;
  /** Resting card frame: subtle full hairline + solid left accent bar. Pairs with the
   *  `border border-l-[3px]` widths the card element supplies. */
  cardBorder: string;
  /** Selected card frame: solid border + ring, keeping the left accent bar. */
  cardSelected: string;
  /** Faint fill applied only while the card is selected. */
  selectedTint: string;
  /** Resting surface tint for the large editor card (small cards stay untinted at rest). */
  surface: string;
  /** Image-preview border inside the large editor card. */
  previewBorder: string;
  /** HSL triplet (no `hsl(...)` wrapper) fed to `--field-accent` so the card's minimal
   *  inputs pick up the type hue at rest and on focus. */
  fieldAccent: string;
}

const MULTIPLE_CHOICE: QuestionTypeTheme = {
  label: "Multiple Choice",
  Icon: List,
  accentText: "text-primary",
  cardBorder: "border-primary/30 border-l-primary",
  cardSelected: "border-primary border-l-primary ring-1 ring-primary/40",
  selectedTint: "bg-primary/[0.06]",
  surface: "bg-primary/[0.04]",
  previewBorder: "border-primary/60",
  fieldAccent: "var(--primary)",
};

const TRUE_FALSE: QuestionTypeTheme = {
  label: "True/False",
  Icon: CheckCircle,
  accentText: "text-teal-600 dark:text-teal-400",
  cardBorder: "border-teal-500/30 border-l-teal-500",
  cardSelected: "border-teal-500 border-l-teal-500 ring-1 ring-teal-500/40",
  selectedTint: "bg-teal-500/[0.06]",
  surface: "bg-teal-500/[0.05]",
  previewBorder: "border-teal-500/60",
  fieldAccent: "173 80% 40%",
};

const TYPE_THE_ANSWER: QuestionTypeTheme = {
  label: "Type Answer",
  Icon: Edit3,
  accentText: "text-amber-600 dark:text-amber-400",
  cardBorder: "border-amber-500/30 border-l-amber-500",
  cardSelected: "border-amber-500 border-l-amber-500 ring-1 ring-amber-500/40",
  selectedTint: "bg-amber-500/[0.06]",
  surface: "bg-amber-500/[0.05]",
  previewBorder: "border-amber-500/60",
  fieldAccent: "38 92% 50%",
};

const QUESTION_TYPE_THEME: Record<QuestionType, QuestionTypeTheme> = {
  [QuestionType.MultipleChoice]: MULTIPLE_CHOICE,
  [QuestionType.TrueFalse]: TRUE_FALSE,
  [QuestionType.TypeTheAnswer]: TYPE_THE_ANSWER,
};

/**
 * Red variant used when a (new, unsaved) question fails validation. It replaces the type's
 * own colors so the card reads unambiguously as "needs attention". Shaped like a
 * {@link QuestionTypeTheme} minus the type-specific `label`/`Icon`.
 */
export const questionErrorTheme = {
  accentText: "text-red-600 dark:text-red-400",
  cardBorder: "border-red-500/60 border-l-red-500",
  cardSelected: "border-red-500 border-l-red-500 ring-1 ring-red-500/40",
  selectedTint: "bg-red-500/[0.06]",
  surface: "bg-red-500/[0.05]",
  previewBorder: "border-red-500/60",
  fieldAccent: "var(--destructive)",
} satisfies Omit<QuestionTypeTheme, "label" | "Icon">;

/** The theme for a question type. Falls back to Multiple Choice for unknown values. */
export const getQuestionTypeTheme = (type: QuestionType): QuestionTypeTheme =>
  QUESTION_TYPE_THEME[type] ?? MULTIPLE_CHOICE;

/**
 * Compatibility shape for the large editor cards, which consume `borderColor` /
 * `backgroundColor` / `previewBorderColor`. Derives from {@link getQuestionTypeTheme} so the
 * big and small cards share one palette.
 */
export const getQuestionTypeStyles = (type: QuestionType) => {
  const theme = getQuestionTypeTheme(type);
  return {
    borderColor: theme.cardBorder,
    backgroundColor: theme.surface,
    previewBorderColor: theme.previewBorder,
  };
};
