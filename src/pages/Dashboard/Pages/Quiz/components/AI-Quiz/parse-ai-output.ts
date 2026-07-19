import { z } from "zod";
import { QuestionType, QuestionDifficulty } from "@/types/question-types";
import {
  NewAnyQuestion,
  NewMultipleChoiceQuestion,
  NewTrueFalseQuestion,
  NewTypeTheAnswerQuestion,
  PointSystem,
  QuestionSettings,
  DEFAULT_QUESTION_SETTINGS,
} from "../Create-Quiz-Form/types";
import { AI_QUESTION_LIMITS } from "./prompt";

/**
 * Turns a raw LLM reply into questions the quiz builder can render.
 *
 * Guarantees (see docs/quiz/ai-quiz-creation-plan.md §6):
 *  - Category and language are ALWAYS inherited from the quiz. Never read from AI output.
 *  - Difficulty is resolved by strict, case-insensitive match against difficulties that
 *    already exist. Unmatched values fall back to the quiz difficulty. Nothing is created.
 *  - Invalid questions are dropped with a reason rather than failing the whole import.
 */

// Single source of truth for valid point systems — the same enum the builder and scoring
// use. Adding a point system there automatically flows through to AI parsing.
const VALID_POINT_SYSTEMS = Object.values(PointSystem);

/** Loose schema — we validate shape here and repair/clamp the soft fields afterwards. */
const aiAnswerOptionSchema = z.object({
  text: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

const aiQuestionSchema = z
  .object({
    type: z.nativeEnum(QuestionType),
    text: z.string().trim().min(1),
    difficulty: z.string().trim().optional().nullable(),
    pointSystem: z.string().trim().optional().nullable(),
    timeLimitInSeconds: z.number().optional().nullable(),
    // MultipleChoice
    answerOptions: z.array(aiAnswerOptionSchema).optional(),
    allowMultipleSelections: z.boolean().optional(),
    // TrueFalse / TypeTheAnswer share the name but not the type
    correctAnswer: z.union([z.boolean(), z.string()]).optional(),
    // TypeTheAnswer
    acceptableAnswers: z.array(z.string()).optional(),
    isCaseSensitive: z.boolean().optional(),
    allowPartialMatch: z.boolean().optional(),
  })
  .passthrough();

const aiPayloadSchema = z.object({
  questions: z.array(aiQuestionSchema).min(1),
});

export interface ParsedQuestion {
  question: NewAnyQuestion;
  settings: QuestionSettings;
}

export interface DroppedQuestion {
  index: number;
  text: string;
  reason: string;
}

export interface ParseResult {
  ok: boolean;
  /** Present when ok — ready to hand to QuizQuestionProvider as initialQuestions. */
  questions: ParsedQuestion[];
  /** Questions that failed validation, with a human-readable reason. */
  dropped: DroppedQuestion[];
  /** 1-based positions whose difficulty didn't match and fell back to the quiz default. */
  difficultyFallbacks: number[];
  /** Set when the whole payload was unusable. */
  error?: string;
}

export interface ParseContext {
  /** Inherited by every generated question. */
  categoryId: number;
  languageId: number;
  /** Fallback when the AI's difficulty name doesn't match an existing row. */
  quizDifficultyId: number;
  /** The difficulties that exist in the DB. */
  difficulties: QuestionDifficulty[];
}

/**
 * Pulls a JSON object out of an LLM reply that may be wrapped in prose or code fences.
 */
export const extractJson = (raw: string): unknown | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: string[] = [];

  // ```json ... ``` or ``` ... ```
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  candidates.push(trimmed);

  // Outermost { ... } anywhere in the reply.
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return null;
};

const resolveDifficultyId = (
  name: string | null | undefined,
  difficulties: QuestionDifficulty[],
  fallbackId: number
): { id: number; matched: boolean } => {
  if (!name) return { id: fallbackId, matched: false };
  const needle = name.trim().toLowerCase();
  // Strict, case-insensitive exact match against existing rows only. Never creates.
  const hit = difficulties.find((d) => d.level.trim().toLowerCase() === needle);
  return hit ? { id: hit.id, matched: true } : { id: fallbackId, matched: false };
};

const resolveSettings = (
  pointSystem: string | null | undefined,
  timeLimit: number | null | undefined,
  order: number
): QuestionSettings => {
  const ps = VALID_POINT_SYSTEMS.find(
    (p) => p.toLowerCase() === (pointSystem ?? "").trim().toLowerCase()
  );

  let seconds = DEFAULT_QUESTION_SETTINGS.timeLimitInSeconds;
  if (typeof timeLimit === "number" && Number.isFinite(timeLimit)) {
    seconds = Math.round(timeLimit);
    seconds = Math.min(
      AI_QUESTION_LIMITS.maxTimeLimit,
      Math.max(AI_QUESTION_LIMITS.minTimeLimit, seconds)
    );
  }

  return {
    pointSystem: ps ?? DEFAULT_QUESTION_SETTINGS.pointSystem,
    timeLimitInSeconds: seconds,
    orderInQuiz: order,
  };
};

type RawQuestion = z.infer<typeof aiQuestionSchema>;

/** Builds the type-specific question, or returns a reason it can't be used. */
const buildQuestion = (
  raw: RawQuestion,
  base: { id: number; text: string; categoryId: number; languageId: number; difficultyId: number }
): { question: NewAnyQuestion } | { reason: string } => {
  const common = {
    ...base,
    visibility: "Private" as const,
    imageUrl: "",
  };

  switch (raw.type) {
    case QuestionType.MultipleChoice: {
      const options = raw.answerOptions ?? [];
      if (options.length < 2 || options.length > 4) {
        return { reason: `needs 2–4 answer options (got ${options.length})` };
      }
      if (!options.some((o) => o.isCorrect)) {
        return { reason: "no answer option was marked correct" };
      }
      const question: NewMultipleChoiceQuestion = {
        ...common,
        type: QuestionType.MultipleChoice,
        answerOptions: options.map((o, i) => ({
          id: -(i + 1),
          text: o.text,
          isCorrect: o.isCorrect,
        })),
        allowMultipleSelections:
          raw.allowMultipleSelections ??
          options.filter((o) => o.isCorrect).length > 1,
      };
      return { question };
    }

    case QuestionType.TrueFalse: {
      const answer = raw.correctAnswer;
      let value: boolean;
      if (typeof answer === "boolean") {
        value = answer;
      } else if (typeof answer === "string" && /^(true|false)$/i.test(answer.trim())) {
        value = answer.trim().toLowerCase() === "true";
      } else {
        return { reason: "correctAnswer must be true or false" };
      }
      const question: NewTrueFalseQuestion = {
        ...common,
        type: QuestionType.TrueFalse,
        correctAnswer: value,
      };
      return { question };
    }

    case QuestionType.TypeTheAnswer: {
      const answer = raw.correctAnswer;
      if (typeof answer !== "string" || !answer.trim()) {
        return { reason: "correctAnswer must be a non-empty string" };
      }
      const question: NewTypeTheAnswerQuestion = {
        ...common,
        type: QuestionType.TypeTheAnswer,
        correctAnswer: answer.trim(),
        isCaseSensitive: raw.isCaseSensitive ?? false,
        allowPartialMatch: raw.allowPartialMatch ?? false,
        acceptableAnswers: (raw.acceptableAnswers ?? [])
          .map((a) => a.trim())
          .filter(Boolean)
          .map((value) => ({ value })),
      };
      return { question };
    }

    default:
      return { reason: `unknown question type "${String(raw.type)}"` };
  }
};

export const parseAiOutput = (raw: string, ctx: ParseContext): ParseResult => {
  const empty: ParseResult = {
    ok: false,
    questions: [],
    dropped: [],
    difficultyFallbacks: [],
  };

  const json = extractJson(raw);
  if (json === null) {
    return {
      ...empty,
      error:
        "Couldn't find any JSON in that response. Paste the AI's full reply, or ask it to reply with JSON only.",
    };
  }

  const parsed = aiPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ...empty,
      error:
        "That JSON doesn't match the expected format. Make sure you copied the whole reply, and that you used the prompt from the button above.",
    };
  }

  const questions: ParsedQuestion[] = [];
  const dropped: DroppedQuestion[] = [];
  const difficultyFallbacks: number[] = [];

  parsed.data.questions.forEach((rawQuestion, index) => {
    const label = rawQuestion.text?.trim() || `Question ${index + 1}`;

    const { id: difficultyId, matched } = resolveDifficultyId(
      rawQuestion.difficulty,
      ctx.difficulties,
      ctx.quizDifficultyId
    );

    const built = buildQuestion(rawQuestion, {
      // Negative ids mark not-yet-saved questions, matching the manual builder's
      // convention. Offset by index so they stay unique within the batch.
      id: -(Date.now() + index),
      text: rawQuestion.text.trim(),
      categoryId: ctx.categoryId,
      languageId: ctx.languageId,
      difficultyId,
    });

    if ("reason" in built) {
      dropped.push({ index: index + 1, text: label, reason: built.reason });
      return;
    }

    if (!matched) difficultyFallbacks.push(questions.length + 1);

    questions.push({
      question: built.question,
      settings: resolveSettings(
        rawQuestion.pointSystem,
        rawQuestion.timeLimitInSeconds,
        questions.length
      ),
    });
  });

  if (questions.length === 0) {
    return {
      ...empty,
      dropped,
      error:
        "None of the generated questions were usable. Try generating again, or adjust your source material.",
    };
  }

  return { ok: true, questions, dropped, difficultyFallbacks };
};
