import { z } from "zod";

import { QuestionType } from "@/types/question-types";

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
export const isManualQuizDraftWorthKeeping = (draft: ManualQuizDraft): boolean =>
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
 * As above: the defaults the wizard opens with — question count, the starting question types
 * — are not something the user typed, so on their own they are not worth restoring.
 */
export const isAiQuizDraftWorthKeeping = (draft: AiQuizDraft): boolean =>
  draft.payload !== null ||
  hasText(draft.pastedReply) ||
  hasText(draft.topic) ||
  hasText(draft.sourceData) ||
  hasText(draft.title) ||
  hasText(draft.description) ||
  hasText(draft.extraInstructions) ||
  draft.categoryId !== null ||
  draft.languageId !== null ||
  draft.difficultyId !== null;
