import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import type { QuestionType } from "@/types/question-types";

import { CreateQuizInput } from "../../api/create-quiz";
import type {
  AiGenerateInput,
  AiGenerationMode,
} from "../../api/generate-ai-quiz";
import CreateQuizForm from "../Create-Quiz-Form/create-quiz";
import { QuizQuestionProvider } from "../Create-Quiz-Form/Quiz-questions-context";
import { useQuizForm } from "../Create-Quiz-Form/use-quiz-form";

import { DEFAULT_AI_QUESTION_TYPES } from "./components/question-type-options";
import {
  extractQuizSuggestions,
  parseAiOutput,
  type ParseResult,
} from "./parse-ai-output";
import { AI_QUESTION_LIMITS, DEFAULT_QUESTION_COUNT } from "./prompt";

/**
 * Everything the two AI creation paths have in common (docs/quiz/ai-quiz-two-paths.md).
 *
 * The paths differ in one step: who runs the model. **Generate for me** posts to our API;
 * **Use your own AI** copies the prompt out and takes a reply back. Around that step they are
 * the same feature — the same request to describe, the same Advanced options, and the same
 * job once a reply exists: read it, resolve the names it used into ids, and hand the
 * questions to the builder. That middle is what lives here.
 *
 * It is a hook rather than a shared parent component because the two paths are two routes.
 * A parent would have to own the router, and the state deliberately does *not* survive the
 * trip between them: they are separate attempts, and carrying a half-filled topic across is a
 * surprise, not a convenience.
 *
 * Each container keeps only what is genuinely its own — the generate mutation and quota on
 * one side, the clipboard and the pasted reply on the other.
 */
export const useAiQuizDraft = () => {
  const { queryData } = useQuizForm();
  const location = useLocation();

  // Both dashboards mount these routes under their own prefix, so every path is derived
  // rather than hard-coded. See the route table in docs/quiz/ai-quiz-two-paths.md.
  const isUserDashboard = location.pathname.startsWith("/my-dashboard");
  const dashboardBase = isUserDashboard ? "/my-dashboard" : "/dashboard";
  const createBase = isUserDashboard
    ? "/my-dashboard/quizzes/create"
    : "/dashboard/quizzes/create-quiz";

  const paths = {
    quizzes: `${dashboardBase}/quizzes`,
    manualCreate: createBase,
    generate: `${createBase}/ai`,
    ownAi: `${createBase}/ai/own`,
  };

  // ── What the user is creating from
  const [mode, setMode] = useState<AiGenerationMode>("Topic");
  const [topic, setTopic] = useState("");
  const [sourceData, setSourceData] = useState("");

  // ── Advanced: all optional. `null` means "let the model decide" for category and
  // language, and "use the default" for difficulty.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [difficultyId, setDifficultyId] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [allowedTypes, setAllowedTypes] = useState<QuestionType[]>([
    ...DEFAULT_AI_QUESTION_TYPES,
  ]);
  const [extraInstructions, setExtraInstructions] = useState("");

  /**
   * The model's reply, held raw until we have the ids needed to place it.
   *
   * **One field for both paths.** Generation and copy-paste produce the same JSON, so they
   * converge here — *before* anything is resolved, not after. Keeping the generated result
   * in its own state was the bug: the title/category/language the model returns were read
   * only on the generate path, so a pasted reply carrying all three still demanded them by
   * hand. See docs/quiz/ai-quiz-generation-flow.md §1a.
   */
  const [payload, setPayload] = useState<string | null>(null);

  const { categories, difficulties, languages } = queryData;

  /**
   * The quiz's overall difficulty when the user didn't pick one. Prefers a mid-weighted
   * level over "first in the list", since the list is user-defined and its first entry
   * carries no meaning. Per-question difficulty is chosen by the model regardless; this is
   * the quiz's rating and the fallback for anything unrecognised.
   */
  const defaultDifficultyId = useMemo(() => {
    if (difficulties.length === 0) return null;
    const sorted = [...difficulties].sort((a, b) => a.weight - b.weight);
    return sorted[Math.floor(sorted.length / 2)].id;
  }, [difficulties]);

  /** The quiz-level fields the model returned, read from the payload whichever path it came by. */
  const suggestions = useMemo(
    () => (payload ? extractQuizSuggestions(payload) : null),
    [payload],
  );

  // Names, not ids, are what the model deals in — resolution happens here against lists we
  // already have, exactly as difficulty names have always been resolved.
  const suggestedCategoryId = useMemo(() => {
    const name = suggestions?.category;
    if (!name) return null;
    return (
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ??
      null
    );
  }, [suggestions?.category, categories]);

  const suggestedLanguageId = useMemo(() => {
    const name = suggestions?.language;
    if (!name) return null;
    return (
      languages.find((l) => l.language.toLowerCase() === name.toLowerCase())
        ?.id ?? null
    );
  }, [suggestions?.language, languages]);

  // A user's explicit pick always wins over the model's suggestion. Derived, not stored:
  // state mirroring state has to be kept in sync forever and is always a render behind.
  const effectiveCategoryId = categoryId ?? suggestedCategoryId;
  const effectiveLanguageId = languageId ?? suggestedLanguageId;
  const effectiveDifficultyId = difficultyId ?? defaultDifficultyId;
  const effectiveTitle = title.trim() || suggestions?.title?.trim() || topic.trim();

  /** Every id the questions need is known, so they can be built. */
  const canPlaceQuestions =
    effectiveCategoryId !== null &&
    effectiveLanguageId !== null &&
    effectiveDifficultyId !== null;

  /**
   * The parsed payload, or null while we're still missing an id.
   *
   * Memoised for correctness rather than speed: the result seeds
   * `QuizQuestionProvider`'s `initialQuestions`, so handing it a fresh array on every
   * render invites the provider to reset the user's edits mid-review.
   */
  const parseResult = useMemo<ParseResult | null>(() => {
    if (!payload) return null;

    // A reply with no questions can't be placed and never will be — run the parser anyway so
    // the user gets its real diagnosis ("couldn't find any JSON", "wrong shape") instead of
    // being asked to pick a category for something that isn't a quiz. The ids below are
    // unused on this path: the parser bails long before it builds a question.
    if (suggestions?.hasQuestions === false) {
      return parseAiOutput(payload, {
        categoryId: effectiveCategoryId ?? 0,
        languageId: effectiveLanguageId ?? 0,
        quizDifficultyId: effectiveDifficultyId ?? 0,
        difficulties,
      });
    }

    if (!canPlaceQuestions) return null;

    return parseAiOutput(payload, {
      categoryId: effectiveCategoryId!,
      languageId: effectiveLanguageId!,
      quizDifficultyId: effectiveDifficultyId!,
      difficulties,
    });
  }, [
    payload,
    suggestions?.hasQuestions,
    canPlaceQuestions,
    effectiveCategoryId,
    effectiveLanguageId,
    effectiveDifficultyId,
    difficulties,
  ]);

  /**
   * Real questions in hand, but not the ids to place them. The model named a category or
   * language we don't have (or named none) and the user hadn't picked one either. The
   * questions are perfectly good, so the view asks for the one missing field rather than
   * throwing the reply away.
   */
  const needsConfirmation =
    payload !== null && suggestions?.hasQuestions === true && !canPlaceQuestions;

  const toggleType = (type: QuestionType) =>
    setAllowedTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    );

  /** Clamped here rather than in a view: the bounds are a domain rule, not a layout one. */
  const handleQuestionCountChange = (value: number) =>
    setQuestionCount(
      Math.min(
        AI_QUESTION_LIMITS.maxGeneratedQuestions,
        Math.max(AI_QUESTION_LIMITS.minQuestions, value),
      ),
    );

  /**
   * Builds the request. The vocabularies we send are the ones the model may choose from —
   * and we only send the ones we actually want it to choose. A category the user already
   * picked isn't offered, so the model can't second-guess them and we don't pay for the
   * tokens.
   *
   * Both paths build it: `POST /quiz/ai-generate` takes it as a body, `POST /quiz/ai-prompt`
   * turns it into the text you paste elsewhere. That is what keeps the two paths honest —
   * one request shape, one prompt, no second copy to drift (plan §5.1).
   */
  const buildInput = (): AiGenerateInput => ({
    mode,
    topic: mode === "Topic" ? topic.trim() : undefined,
    sourceText: mode === "Source" ? sourceData.trim() : undefined,
    languageName:
      languageId !== null
        ? languages.find((l) => l.id === languageId)?.language
        : undefined,
    languageNames: languages.map((l) => l.language),
    categoryNames: categoryId !== null ? [] : categories.map((c) => c.name),
    difficultyNames: difficulties.map((d) => d.level),
    questionCount,
    allowedTypes,
    extraInstructions: extraInstructions.trim() || undefined,
  });

  // ── Handoff: questions parsed, so hand the builder everything prefilled.
  // `aiImportMode` makes it submit through the atomic /quiz/ai-import endpoint
  // (docs/quiz/ai-quiz-architecture.md §7.3).
  const builderSlot: ReactNode =
    parseResult?.ok &&
    effectiveCategoryId !== null &&
    effectiveLanguageId !== null &&
    effectiveDifficultyId !== null ? (
      <QuizQuestionProvider initialQuestions={parseResult.questions}>
        <CreateQuizForm
          initialValues={
            {
              title: effectiveTitle,
              description: description.trim() || undefined,
              categoryId: effectiveCategoryId,
              languageId: effectiveLanguageId,
              difficultyId: effectiveDifficultyId,
              status: "Draft",
              timeLimitInSeconds: 0,
              showFeedbackImmediately: false,
              shuffleQuestions: false,
            } satisfies Partial<CreateQuizInput>
          }
          aiImportMode
        />
      </QuizQuestionProvider>
    ) : undefined;

  return {
    // Lookups
    categories,
    difficulties,
    languages,
    /**
     * No `hasEntityError` companion to this. The three lookups are what these pages are
     * made of — you can't pick a category the list never loaded, and `buildInput` sends
     * those very names as the vocabulary the model may choose from — so they keep the
     * global `throwOnError` and a failure lands on the route's `DashboardErrorElement`.
     * Both views used to carry an in-page error card for this; it was unreachable, because
     * the throw happens before the view renders. See docs/development/error-handling.md.
     */
    isLoadingEntities: queryData.isLoading,

    // Where the other screens live
    paths,

    // The one box
    mode,
    setMode,
    topic,
    setTopic,
    sourceData,
    setSourceData,

    // Advanced
    title,
    setTitle,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    languageId,
    setLanguageId,
    difficultyId,
    setDifficultyId,
    questionCount,
    setQuestionCount: handleQuestionCountChange,
    allowedTypes,
    toggleType,
    extraInstructions,
    setExtraInstructions,

    // The reply, and everything downstream of it
    buildInput,
    payload,
    setPayload,
    /** Discards the questions and returns to the input. Containers add their own resets. */
    resetPayload: () => setPayload(null),
    parseResult,
    needsConfirmation,
    suggestedCategoryName: suggestions?.category ?? null,
    suggestedLanguageName: suggestions?.language ?? null,
    builderSlot,
  };
};
