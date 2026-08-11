import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useNotifications } from "@/common/Notifications";
import { QuestionType } from "@/types/question-types";

import { useQuizForm } from "../Create-Quiz-Form/use-quiz-form";
import { QuizQuestionProvider } from "../Create-Quiz-Form/Quiz-questions-context";
import CreateQuizForm from "../Create-Quiz-Form/create-quiz";
import { CreateQuizInput } from "../../api/create-quiz";
import {
  useGenerateAiQuiz,
  useAiQuota,
  getAiPrompt,
  AiGenerateError,
  type AiGenerateInput,
  type AiGenerateResult,
  type AiGenerationMode,
} from "../../api/generate-ai-quiz";

import { AI_QUESTION_LIMITS } from "./prompt";
import { parseAiOutput, ParseResult } from "./parse-ai-output";
import {
  AiQuizWizardView,
  ALL_AI_QUESTION_TYPES,
} from "./ai-quiz-wizard-view";

/**
 * Container for the AI quiz wizard. Owns the entity queries, the wizard's state, the
 * generate call, the clipboard write and the handoff into the real builder. All markup
 * lives in `ai-quiz-wizard-view.tsx`, which is prop-driven and therefore storyable — see
 * `ai-quiz-wizard-view.stories.tsx` and docs/development/storybook.md.
 *
 * **The shape of the flow** (docs/quiz/ai-quiz-generation-flow.md §1a): the first screen is
 * a topic and a Generate button. Title, category and language come back from the model and
 * land pre-filled in the review step, where a human confirms them. Everything else has a
 * default behind an "Advanced" disclosure. The user can still override any of it up front,
 * in which case we don't ask the model to guess that field at all.
 */
export const AiQuizWizard = () => {
  const { queryData } = useQuizForm();
  const { addNotification } = useNotifications();
  const location = useLocation();

  const dashboardBase = location.pathname.startsWith("/my-dashboard")
    ? "/my-dashboard"
    : "/dashboard";
  const manualPath =
    dashboardBase === "/my-dashboard"
      ? "/my-dashboard/quizzes/create"
      : "/dashboard/quizzes/create-quiz";

  // ── What the user is generating from
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
  const [questionCount, setQuestionCount] = useState(10);
  const [allowedTypes, setAllowedTypes] = useState<QuestionType[]>([
    ...ALL_AI_QUESTION_TYPES,
  ]);
  const [extraInstructions, setExtraInstructions] = useState("");

  // ── Generation result, held raw until we have the ids needed to parse it
  const [generated, setGenerated] = useState<AiGenerateResult | null>(null);
  const [generateError, setGenerateError] = useState<AiGenerateError | null>(null);

  // ── Copy-paste fallback
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const generateMutation = useGenerateAiQuiz();
  const quotaQuery = useAiQuota();

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

  // ── Resolve the model's suggestions back to ids.
  // Names, not ids, cross the API — resolution happens here against lists we already have,
  // exactly as difficulty names have always been resolved (see parse-ai-output.ts).
  const suggestedCategoryId = useMemo(() => {
    const name = generated?.suggestedCategory;
    if (!name) return null;
    return (
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null
    );
  }, [generated?.suggestedCategory, categories]);

  const suggestedLanguageId = useMemo(() => {
    const name = generated?.suggestedLanguage;
    if (!name) return null;
    return (
      languages.find((l) => l.language.toLowerCase() === name.toLowerCase())?.id ?? null
    );
  }, [generated?.suggestedLanguage, languages]);

  // A user's explicit pick always wins over the model's suggestion. Derived, not stored:
  // state mirroring state has to be kept in sync forever and is always a render behind.
  const effectiveCategoryId = categoryId ?? suggestedCategoryId;
  const effectiveLanguageId = languageId ?? suggestedLanguageId;
  const effectiveDifficultyId = difficultyId ?? defaultDifficultyId;
  const effectiveTitle = title.trim() || generated?.suggestedTitle?.trim() || topic.trim();

  /**
   * Parse the generated payload once every id it needs is known.
   *
   * Memoised for correctness rather than speed: the result seeds
   * `QuizQuestionProvider`'s `initialQuestions`, so handing it a fresh array on every
   * render invites the provider to reset the user's edits mid-review.
   */
  const generatedParse = useMemo<ParseResult | null>(() => {
    if (!generated) return null;
    if (
      effectiveCategoryId === null ||
      effectiveLanguageId === null ||
      effectiveDifficultyId === null
    ) {
      return null;
    }

    return parseAiOutput(generated.payload, {
      categoryId: effectiveCategoryId,
      languageId: effectiveLanguageId,
      quizDifficultyId: effectiveDifficultyId,
      difficulties,
    });
  }, [
    generated,
    effectiveCategoryId,
    effectiveLanguageId,
    effectiveDifficultyId,
    difficulties,
  ]);

  /**
   * Whichever path produced questions. Generation and copy-paste converge here, and
   * everything downstream is identical for both — which is the whole point of the design.
   */
  const activeParse = generatedParse ?? parseResult;

  /**
   * We have a payload but not the ids to place it. Happens when the model couldn't match a
   * category or language and the user hadn't picked one. Rather than fail the generation —
   * the questions are perfectly good — the view asks for the missing field.
   */
  const needsConfirmation =
    generated !== null &&
    (effectiveCategoryId === null || effectiveLanguageId === null);

  const toggleType = (type: QuestionType) =>
    setAllowedTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    );

  /** Clamped here rather than in the view: the bounds are a domain rule, not a layout one. */
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

  const handleGenerate = () => {
    setGenerateError(null);
    setParseResult(null);

    generateMutation.mutate(buildInput(), {
      onSuccess: (result) => {
        setGenerated(result);
        void quotaQuery.refetch();
      },
      onError: (error) => {
        const aiError =
          error instanceof AiGenerateError
            ? error
            : new AiGenerateError("Unknown", "Quiz generation failed.");

        // Held in state as well as notified: the notification disappears, and the error
        // decides what the panel offers next (verify email, wait, use copy-paste).
        setGenerateError(aiError);
        addNotification({
          type: "error",
          title: "Couldn't generate",
          message: aiError.message,
        });
      },
    });
  };

  /** Fetches the prompt from the server — the same one generation would send — and copies it. */
  const handleCopyPrompt = async () => {
    setIsCopying(true);
    try {
      const { prompt } = await getAiPrompt(buildInput());
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      addNotification({
        type: "error",
        title: "Couldn't copy",
        message:
          error instanceof AiGenerateError
            ? error.message
            : "Your browser blocked clipboard access. Try again, or use a different browser.",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleAiResponseChange = (value: string) => {
    setAiResponse(value);
    // Editing the reply invalidates the previous verdict — keep the error from hanging
    // around next to text it no longer describes.
    if (parseResult) setParseResult(null);
  };

  const handleImport = () => {
    if (
      effectiveCategoryId === null ||
      effectiveLanguageId === null ||
      effectiveDifficultyId === null
    ) {
      addNotification({
        type: "error",
        title: "Missing details",
        message: "Pick a category, language and difficulty before importing.",
      });
      return;
    }

    const result = parseAiOutput(aiResponse, {
      categoryId: effectiveCategoryId,
      languageId: effectiveLanguageId,
      quizDifficultyId: effectiveDifficultyId,
      difficulties,
    });

    setParseResult(result);

    if (!result.ok) {
      addNotification({
        type: "error",
        title: "Couldn't import",
        message: result.error ?? "That response couldn't be read.",
      });
    }
  };

  /** Discards the generated questions and returns to the topic box. */
  const handleStartOver = () => {
    setGenerated(null);
    setGenerateError(null);
    setParseResult(null);
    setAiResponse("");
  };

  // ── Handoff: questions parsed, so hand the builder everything prefilled.
  // `aiImportMode` makes it submit through the atomic /quiz/ai-import endpoint
  // (docs/quiz/ai-quiz-architecture.md §7.3).
  const builderSlot =
    activeParse?.ok &&
    effectiveCategoryId !== null &&
    effectiveLanguageId !== null &&
    effectiveDifficultyId !== null ? (
      <QuizQuestionProvider initialQuestions={activeParse.questions}>
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

  return (
    <AiQuizWizardView
      categories={categories}
      difficulties={difficulties}
      languages={languages}
      isLoadingEntities={queryData.isLoading}
      hasEntityError={Boolean(queryData.error)}
      quizzesPath={`${dashboardBase}/quizzes`}
      manualCreatePath={manualPath}
      mode={mode}
      onModeChange={setMode}
      topic={topic}
      onTopicChange={setTopic}
      sourceData={sourceData}
      onSourceDataChange={setSourceData}
      title={title}
      onTitleChange={setTitle}
      description={description}
      onDescriptionChange={setDescription}
      categoryId={categoryId}
      onCategoryIdChange={setCategoryId}
      languageId={languageId}
      onLanguageIdChange={setLanguageId}
      difficultyId={difficultyId}
      onDifficultyIdChange={setDifficultyId}
      questionCount={questionCount}
      onQuestionCountChange={handleQuestionCountChange}
      allowedTypes={allowedTypes}
      onToggleType={toggleType}
      extraInstructions={extraInstructions}
      onExtraInstructionsChange={setExtraInstructions}
      onGenerate={handleGenerate}
      isGenerating={generateMutation.isPending}
      generateError={generateError}
      quota={quotaQuery.data ?? null}
      needsConfirmation={needsConfirmation}
      suggestedCategoryName={generated?.suggestedCategory ?? null}
      suggestedLanguageName={generated?.suggestedLanguage ?? null}
      onStartOver={handleStartOver}
      onCopyPrompt={handleCopyPrompt}
      copied={copied}
      isCopying={isCopying}
      aiResponse={aiResponse}
      onAiResponseChange={handleAiResponseChange}
      onImport={handleImport}
      parseResult={activeParse}
      builderSlot={builderSlot}
    />
  );
};

export default AiQuizWizard;
