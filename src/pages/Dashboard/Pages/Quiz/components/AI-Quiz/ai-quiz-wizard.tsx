import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useNotifications } from "@/common/Notifications";
import { QuestionType } from "@/types/question-types";

import { useQuizForm } from "../Create-Quiz-Form/use-quiz-form";
import { QuizQuestionProvider } from "../Create-Quiz-Form/Quiz-questions-context";
import CreateQuizForm from "../Create-Quiz-Form/create-quiz";
import { CreateQuizInput } from "../../api/create-quiz";

import { buildPrompt, AI_QUESTION_LIMITS } from "./prompt";
import { parseAiOutput, ParseResult } from "./parse-ai-output";
import {
  AiQuizWizardView,
  ALL_AI_QUESTION_TYPES,
  type AiWizardStep,
} from "./ai-quiz-wizard-view";

/**
 * Container for the AI quiz wizard: owns the entity queries, the wizard's form state, the
 * clipboard write, the parse call and the handoff into the real builder. All markup lives
 * in `ai-quiz-wizard-view.tsx`, which is prop-driven and therefore storyable — see
 * `ai-quiz-wizard-view.stories.tsx` and docs/development/storybook.md.
 *
 * The split is why this file has no JSX beyond composition: anything visual added here is
 * a state no story can reach.
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

  const [step, setStep] = useState<AiWizardStep>(1);

  // ── Step 1: quiz-level fields. These are the real entity IDs — chosen by a human,
  // never by the AI — and every generated question inherits category + language.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [difficultyId, setDifficultyId] = useState<number | null>(null);

  // ── Step 2: source material + generation options
  const [sourceData, setSourceData] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [allowedTypes, setAllowedTypes] = useState<QuestionType[]>([
    ...ALL_AI_QUESTION_TYPES,
  ]);
  const [extraInstructions, setExtraInstructions] = useState("");

  const [copied, setCopied] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const difficultyNames = useMemo(
    () => queryData.difficulties.map((d) => d.level),
    [queryData.difficulties]
  );

  const toggleType = (type: QuestionType) => {
    setAllowedTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
    );
  };

  /** Clamped here rather than in the view: the bounds are a domain rule, not a layout one. */
  const handleQuestionCountChange = (value: number) =>
    setQuestionCount(
      Math.min(
        AI_QUESTION_LIMITS.maxQuestions,
        Math.max(AI_QUESTION_LIMITS.minQuestions, value)
      )
    );

  const handleCopyPrompt = async () => {
    const prompt = buildPrompt({
      sourceData,
      questionCount,
      allowedTypes,
      difficultyNames,
      extraInstructions,
    });

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addNotification({
        type: "error",
        title: "Couldn't copy",
        message:
          "Your browser blocked clipboard access. Try again, or use a different browser.",
      });
    }
  };

  const handleAiResponseChange = (value: string) => {
    setAiResponse(value);
    // Editing the reply invalidates the previous verdict — keep the error from hanging
    // around next to text it no longer describes.
    if (parseResult) setParseResult(null);
  };

  const handleImport = () => {
    if (categoryId === null || languageId === null || difficultyId === null) return;

    const result = parseAiOutput(aiResponse, {
      categoryId,
      languageId,
      quizDifficultyId: difficultyId,
      difficulties: queryData.difficulties,
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

  // ── Handoff: parsing succeeded, so hand the builder the parsed questions plus the quiz
  // fields the user set in step 1. `aiImportMode` makes it submit through the atomic
  // /quiz/ai-import endpoint (docs/quiz/ai-quiz-architecture.md §7.3).
  const builderSlot =
    parseResult?.ok &&
    categoryId !== null &&
    languageId !== null &&
    difficultyId !== null ? (
      <QuizQuestionProvider initialQuestions={parseResult.questions}>
        <CreateQuizForm
          initialValues={
            {
              title: title.trim(),
              description: description.trim() || undefined,
              categoryId,
              languageId,
              difficultyId,
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
      categories={queryData.categories}
      difficulties={queryData.difficulties}
      languages={queryData.languages}
      isLoadingEntities={queryData.isLoading}
      hasEntityError={Boolean(queryData.error)}
      quizzesPath={`${dashboardBase}/quizzes`}
      manualCreatePath={manualPath}
      step={step}
      onStepChange={setStep}
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
      sourceData={sourceData}
      onSourceDataChange={setSourceData}
      questionCount={questionCount}
      onQuestionCountChange={handleQuestionCountChange}
      allowedTypes={allowedTypes}
      onToggleType={toggleType}
      extraInstructions={extraInstructions}
      onExtraInstructionsChange={setExtraInstructions}
      onCopyPrompt={handleCopyPrompt}
      copied={copied}
      aiResponse={aiResponse}
      onAiResponseChange={handleAiResponseChange}
      onImport={handleImport}
      parseResult={parseResult}
      builderSlot={builderSlot}
    />
  );
};

export default AiQuizWizard;
