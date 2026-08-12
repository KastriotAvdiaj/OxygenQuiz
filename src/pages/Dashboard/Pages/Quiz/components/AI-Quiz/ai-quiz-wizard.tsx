import { useState } from "react";

import {
  useGenerateAiQuiz,
  useAiQuota,
  AiGenerateError,
} from "../../api/generate-ai-quiz";

import { AiQuizWizardView } from "./ai-quiz-wizard-view";
import { useAiQuizDraft } from "./use-ai-quiz-draft";

/**
 * Container for the **generate-for-me** path: we call the model, on our budget, and the
 * questions come back into the review step.
 *
 * Everything this shares with the bring-your-own-AI page at `own-ai-quiz.tsx` — the entity
 * queries, the request the user is describing, the Advanced options, and the whole
 * reply → parse → builder pipeline — lives in `useAiQuizDraft`. What's left here is the one
 * thing only this path does: spend a generation. See docs/quiz/ai-quiz-two-paths.md.
 *
 * All markup lives in `ai-quiz-wizard-view.tsx`, which is prop-driven and therefore storyable
 * — see `ai-quiz-wizard-view.stories.tsx` and docs/development/storybook.md.
 */
export const AiQuizWizard = () => {
  const draft = useAiQuizDraft();

  /** Held (not just toasted) because it decides what the panel offers next. */
  const [generateError, setGenerateError] = useState<AiGenerateError | null>(
    null,
  );

  const generateMutation = useGenerateAiQuiz();
  const quotaQuery = useAiQuota();

  const handleGenerate = () => {
    setGenerateError(null);
    draft.setPayload(null);

    generateMutation.mutate(draft.buildInput(), {
      onSuccess: (result) => {
        draft.setPayload(result.payload);
        void quotaQuery.refetch();
      },
      onError: (error) => {
        // State, not a toast. The inline panel is the better surface: it persists, it sits
        // beside the button that failed, and it changes what it offers per error code. A
        // toast saying the same thing is a third copy of one message — the request already
        // sets `skipErrorToast` so the shared interceptor stays quiet too.
        setGenerateError(
          error instanceof AiGenerateError
            ? error
            : new AiGenerateError("Unknown", "Quiz generation failed."),
        );
      },
    });
  };

  /** Discards the questions and returns to the topic box. */
  const handleStartOver = () => {
    draft.resetPayload();
    setGenerateError(null);
  };

  return (
    <AiQuizWizardView
      categories={draft.categories}
      difficulties={draft.difficulties}
      languages={draft.languages}
      isLoadingEntities={draft.isLoadingEntities}
      hasEntityError={draft.hasEntityError}
      quizzesPath={draft.paths.quizzes}
      manualCreatePath={draft.paths.manualCreate}
      ownAiPath={draft.paths.ownAi}
      mode={draft.mode}
      onModeChange={draft.setMode}
      topic={draft.topic}
      onTopicChange={draft.setTopic}
      sourceData={draft.sourceData}
      onSourceDataChange={draft.setSourceData}
      title={draft.title}
      onTitleChange={draft.setTitle}
      description={draft.description}
      onDescriptionChange={draft.setDescription}
      categoryId={draft.categoryId}
      onCategoryIdChange={draft.setCategoryId}
      languageId={draft.languageId}
      onLanguageIdChange={draft.setLanguageId}
      difficultyId={draft.difficultyId}
      onDifficultyIdChange={draft.setDifficultyId}
      questionCount={draft.questionCount}
      onQuestionCountChange={draft.setQuestionCount}
      allowedTypes={draft.allowedTypes}
      onToggleType={draft.toggleType}
      extraInstructions={draft.extraInstructions}
      onExtraInstructionsChange={draft.setExtraInstructions}
      onGenerate={handleGenerate}
      isGenerating={generateMutation.isPending}
      generateError={generateError}
      quota={quotaQuery.data ?? null}
      needsConfirmation={draft.needsConfirmation}
      suggestedCategoryName={draft.suggestedCategoryName}
      suggestedLanguageName={draft.suggestedLanguageName}
      onStartOver={handleStartOver}
      parseResult={draft.parseResult}
      builderSlot={draft.builderSlot}
    />
  );
};

export default AiQuizWizard;
