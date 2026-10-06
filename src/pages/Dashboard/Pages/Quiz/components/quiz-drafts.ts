import { z } from "zod";

import { QuestionType } from "@/types/question-types";

import type { AssociationQuizFormValues } from "../api/association-quiz";
import { CreateQuizInput, createQuizInputSchema } from "../api/create-quiz";

import type { QuestionSettings, QuizQuestion } from "./Create-Quiz-Form/types";

/**
 * quiz-drafts.ts
 * --------------
 * What a half-finished quiz looks like once it leaves React and becomes JSON, and what has to
 * be true of that JSON before it is allowed back in.
 *
 * The mechanics of storing it live in `lib/drafts/draft-storage.ts` and
 * `hooks/use-draft-autosave.ts`; this file is the *shape*, which is the part specific to the
 * quiz builder. See docs/quiz/quiz-draft-persistence.md.
 */

/**
 * Bump whenever a snapshot below stops being readable by the shape it describes — a renamed
 * field, a changed unit, a question shape that no longer round-trips. Drafts written by any
 * other version are dropped on read rather than hydrated into a form that has moved on.
 *
 * Adding an *optional* field is not a break: an older draft simply arrives without it.
 */
export const QUIZ_DRAFT_VERSION = 1;

/**
 * One slot per screen that can hold unfinished work.
 *
 * The two AI paths get separate slots on purpose. They are two attempts, not one — the same
 * reason `useAiQuizDraft` keeps no state across the trip between them (see its header) —
 * and pouring a topic typed on the generate page into the bring-your-own-AI page would be a
 * surprise rather than a convenience.
 *
 * The admin dashboard and the personal dashboard deliberately *share* a slot: they are two
 * doors onto the same builder for the same person, so a draft started behind one should be
 * offered behind the other.
 */
export const QUIZ_DRAFT_SLOTS = {
  manual: "quiz-create",
  aiTopic: "quiz-ai-topic",
  aiOwn: "quiz-ai-own",
  /** The Associations board builder — its own shape, so its own slot and its own version. */
  associations: "quiz-associations",
} as const;

const hasText = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

// ── The manual builder ─────────────────────────────────────────────────────────────────

/**
 * Everything the manual builder would otherwise lose on a refresh.
 *
 * The two halves match the two seams the form already exposes: `form` is what
 * `CreateQuizForm`'s `initialValues` takes, and `questions` is exactly what
 * `QuizQuestionProvider`'s `initialQuestions` takes and what `getQuestionsWithSettings()`
 * returns. Restoring is therefore a mount with props that already exist, not a new
 * hydration path — which is also why the provider needs no `hydrate()` of its own.
 */
export interface ManualQuizDraft {
  /** Quiz-level fields, minus `questions` — those travel below, with their settings. */
  form: Partial<Omit<CreateQuizInput, "questions">>;
  questions: Array<{ question: QuizQuestion; settings: QuestionSettings }>;
}

const questionSettingsSchema = z.object({
  pointSystem: z.string(),
  timeLimitInSeconds: z.number(),
  orderInQuiz: z.number(),
});

/**
 * A stored question, checked only as deeply as restoring it requires.
 *
 * `passthrough()` is load-bearing: a question is a union of six shapes (three types, each in
 * a saved and an unsaved form) and re-describing all six here would be a second copy of
 * `types.ts` that drifts. What the builder actually needs to place a question is an id, a
 * type and its text; the rest rides along untouched, and the per-question editors validate
 * their own fields exactly as they do for a question typed by hand.
 *
 * This mirrors the API's rules and is never the rule itself — `validateAllQuestionsForSubmit`
 * still runs before submit, and the API is still the gate.
 */
const draftQuestionSchema = z.object({
  question: z
    .object({
      id: z.number(),
      type: z.nativeEnum(QuestionType),
      text: z.string(),
    })
    .passthrough(),
  settings: questionSettingsSchema,
});

const manualQuizDraftSchema = z.object({
  form: createQuizInputSchema.omit({ questions: true }).partial(),
  questions: z.array(draftQuestionSchema),
});

export const parseManualQuizDraft = (raw: unknown): ManualQuizDraft | null => {
  const result = manualQuizDraftSchema.safeParse(raw);
  return result.success ? (result.data as unknown as ManualQuizDraft) : null;
};

/**
 * Is there anything here the user would mind losing?
 *
 * An untouched form must answer `false`, or the next visit opens with an offer to restore
 * work nobody did — the fastest way to teach someone to ignore the notice. Defaulted fields
 * (status, time limit, the switches) don't count for the same reason: nobody chose them.
 */
export const isManualQuizDraftWorthKeeping = (
  draft: ManualQuizDraft,
): boolean =>
  draft.questions.length > 0 ||
  hasText(draft.form.title) ||
  hasText(draft.form.description) ||
  hasText(draft.form.imageUrl) ||
  draft.form.categoryId != null ||
  draft.form.languageId != null ||
  draft.form.difficultyId != null;

// ── The AI wizard ──────────────────────────────────────────────────────────────────────

/**
 * Everything `useAiQuizDraft` holds, flattened.
 *
 * `payload` is the reason this snapshot exists at all. The rest is typing, which is cheap to
 * redo; the payload is a generation that cost the user quota — losing it to a stray refresh
 * makes them spend it twice for one quiz.
 */
export interface AiQuizDraft {
  topic: string;
  sourceData: string;
  title: string;
  description: string;
  categoryId: number | null;
  languageId: number | null;
  difficultyId: number | null;
  questionCount: number;
  allowedTypes: QuestionType[];
  extraInstructions: string;
  /** The bring-your-own-AI paste box, before it has been handed to the parser. */
  pastedReply: string;
  /** The model's reply, raw. Held by both paths once it exists. */
  payload: string | null;
}

const aiQuizDraftSchema = z.object({
  topic: z.string(),
  sourceData: z.string(),
  title: z.string(),
  description: z.string(),
  categoryId: z.number().nullable(),
  languageId: z.number().nullable(),
  difficultyId: z.number().nullable(),
  questionCount: z.number(),
  allowedTypes: z.array(z.nativeEnum(QuestionType)),
  extraInstructions: z.string(),
  pastedReply: z.string(),
  payload: z.string().nullable(),
});

export const parseAiQuizDraft = (raw: unknown): AiQuizDraft | null => {
  const result = aiQuizDraftSchema.safeParse(raw);
  return result.success ? result.data : null;
};

/**
 * **A model reply, and nothing else.** The wizard's whole form — topic, title, the Advanced
 * options — is deliberately not evidence that anything is worth restoring.
 *
 * This is narrower than it was, and the narrowing is the point. The AI slots exist because a
 * generation costs the user quota and cannot be re-run for free; typing a topic costs seconds.
 * Keeping the typing too meant that a one-word topic entered and abandoned brought the whole
 * restore apparatus back on the next visit — a banner, and a form pre-filled with something
 * the user had already decided against. People read that as the app having saved their work
 * without being asked, which is the opposite of what a restore notice is for.
 *
 * The cost of the narrowing, stated plainly: a long topic and a tuned set of Advanced options
 * typed just before a crash are now gone. That is the trade — a notice that is always about
 * something expensive, in exchange for a form that does not remember a word you typed once.
 *
 * `pastedReply` counts because it is a reply the user fetched from another app, which is the
 * bring-your-own path's equivalent of spending the quota.
 */
export const isAiQuizDraftWorthKeeping = (draft: AiQuizDraft): boolean =>
  draft.payload !== null || hasText(draft.pastedReply);

// ── The Associations board builder ─────────────────────────────────────────────────────

/**
 * Its own version, not {@link QUIZ_DRAFT_VERSION}: a board is a different shape from a Classic
 * quiz, and a change to one must not throw away drafts of the other.
 */
export const ASSOCIATION_DRAFT_VERSION = 1;

/**
 * The board builder's form values, as they stood. This is exactly what `AssociationBoardForm`
 * takes as `defaultValues`, so restoring is a mount with a different seed — the same seam edit
 * mode already uses — not a new hydration path.
 *
 * Every field is optional because a half-typed board is the whole point: no category picked yet,
 * the board-time input cleared. `boardTimeInMinutes` is left out of a snapshot when the input
 * holds no number (react-hook-form's `valueAsNumber` gives `NaN`, which JSON can't carry), so a
 * restore falls back to the default rather than seeding `null` into a number field.
 */
export type AssociationBoardDraft = Partial<AssociationQuizFormValues>;

const draftColumnSchema = z.object({
  tiles: z.array(z.string()).length(4),
  solution: z.string(),
  otherSpellings: z.string(),
});

/**
 * Shape only — lengths and required-ness stay with `associationQuizFormSchema`, which still runs
 * on submit, and the API (`AssociationBoardValidator`) is still the gate. The one structural
 * check that matters here is four Columns of four Tiles: the builder renders by index, and a
 * board of any other shape would leave inputs bound to nothing.
 */
const associationBoardDraftSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  categoryId: z.number().optional(),
  languageId: z.number().optional(),
  difficultyId: z.number().optional(),
  status: z.enum(["Draft", "Unlisted", "Public"]).optional(),
  boardTimeInMinutes: z.number().optional(),
  columns: z.array(draftColumnSchema).length(4).optional(),
  finalSolution: z.string().optional(),
  finalOtherSpellings: z.string().optional(),
});

export const parseAssociationBoardDraft = (
  raw: unknown,
): AssociationBoardDraft | null => {
  const result = associationBoardDraftSchema.safeParse(raw);
  return result.success ? result.data : null;
};

/**
 * Is there anything on this board the user would mind losing?
 *
 * Any typed text counts — a Tile, a solution, a spelling, the title — and so does a picked lookup.
 * The status and the board time don't: the builder opens with both set, and nobody chose them.
 */
export const isAssociationBoardDraftWorthKeeping = (
  draft: AssociationBoardDraft,
): boolean =>
  hasText(draft.title) ||
  hasText(draft.description) ||
  hasText(draft.finalSolution) ||
  hasText(draft.finalOtherSpellings) ||
  draft.categoryId != null ||
  draft.languageId != null ||
  draft.difficultyId != null ||
  (draft.columns ?? []).some(
    (column) =>
      hasText(column.solution) ||
      hasText(column.otherSpellings) ||
      column.tiles.some((tile) => hasText(tile)),
  );
