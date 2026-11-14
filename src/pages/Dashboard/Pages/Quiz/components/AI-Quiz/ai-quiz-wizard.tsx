import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  isAiJobFinished,
  markAiJobSeen,
  useActiveAiJob,
  useAiQuota,
  useReadAiSource,
  AiGenerateError,
  type AiGrounding,
  type AiGroundingAnswers,
} from "../../api/generate-ai-quiz";
import type { SourceFileInfo } from "./components/generation-input";

import { AiQuizWizardView } from "./ai-quiz-wizard-view";
import { useAiQuizDraft } from "./use-ai-quiz-draft";
import { useAiGenerationJob, type AiJobRun } from "./use-ai-generation-job";

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

  const generation = useAiGenerationJob();
  const quotaQuery = useAiQuota();
  const navigate = useNavigate();
  const location = useLocation();
  const readSource = useReadAiSource();

  /**
   * Which file the material box's text came from. Wizard-only state: the own-AI page has no
   * material mode, and nothing about the file outlives this screen — the text does, in the
   * draft, and that is all generation needs.
   */
  const [sourceFile, setSourceFile] = useState<SourceFileInfo | null>(null);
  const [uploadError, setUploadError] = useState<string | undefined>();

  /**
   * Reads the file on the server and puts its text in the box. Replaces what was there: one
   * source per quiz. A refused file leaves the box as it was, so a bad pick costs nothing.
   */
  const handleUploadFile = (file: File) => {
    setUploadError(undefined);
    readSource.mutate(file, {
      onSuccess: (result) => {
        draft.setSourceData(result.text);
        setSourceFile({ name: file.name, language: result.language, truncated: result.truncated });
        // A generation error about the *previous* text no longer describes what's in the box.
        setGenerateError(null);
      },
      onError: (error) => {
        setUploadError(
          error instanceof AiGenerateError ? error.message : "That file couldn't be read.",
        );
      },
    });
  };

  /**
   * Grounding's question, while one is open, and the author's answers so far. Answers
   * accumulate — a language, then an article — and go out with every retry of the same request,
   * because the server asks one thing at a time and must not ask the first again.
   * docs/quiz/ai-quiz-generation-flow.md §2e.
   */
  const [sourceChoice, setSourceChoice] = useState<AiGrounding | null>(null);
  const [sourceAnswers, setSourceAnswers] = useState<AiGroundingAnswers>({});

  /**
   * Runs a job to its end and puts the outcome where a reply has always gone: the questions
   * into the draft, a failure into the error panel, a question from grounding into its card.
   *
   * Either way the job is then marked collected, so the server neither offers it again nor
   * owes a notification for it. Fire-and-forget: if that call is lost the worst case is a
   * notification about a quiz already on screen.
   */
  const run = (job: AiJobRun) => {
    setGenerateError(null);

    generation.mutate(job, {
      onSuccess: ({ jobId, result }) => {
        void markAiJobSeen(jobId).catch(() => undefined);
        setSourceChoice(null);
        draft.setPayload(result.payload, result.grounding ?? null);
        void quotaQuery.refetch();
      },
      onError: (error) => {
        // Stopped watching (a newer run replaced this one): not an outcome.
        if (!(error instanceof AiGenerateError)) return;
        if (error.jobId) void markAiJobSeen(error.jobId).catch(() => undefined);

        // Not a failure: grounding needs the author. Nothing was spent — the server asks
        // before reserving — so there is no quota to refresh and no error to show.
        if (error.code === "SourceNeedsChoice" && error.grounding) {
          setSourceChoice(error.grounding);
          return;
        }
        setSourceChoice(null);
        // State, not a toast. The inline panel is the better surface: it persists, it sits
        // beside the button that failed, and it changes what it offers per error code. A
        // toast saying the same thing is a third copy of one message — the request already
        // sets `skipErrorToast` so the shared interceptor stays quiet too.
        setGenerateError(error);
        void quotaQuery.refetch();
      },
    });
  };

  const runGeneration = (answers: AiGroundingAnswers) => {
    draft.setPayload(null);
    // Where the "your quiz is ready" notification should bring them back to: this page, under
    // whichever dashboard it was opened from.
    run({ input: { ...draft.buildInput(), ...answers, returnPath: location.pathname } });
  };

  /**
   * A generation left behind — the author pressed "Keep browsing", closed the tab, or came here
   * from the notification. Asked once per visit; if there is one, this page joins it: still
   * running, the progress card comes back; finished, its outcome arrives as if it just had.
   *
   * An Effect because it starts watching something outside React (a job on the server) in
   * response to an answer arriving, and there is no user action to hang it on. The ref makes
   * it once per job: StrictMode runs Effects twice, and joining twice would poll twice.
   */
  const activeJob = useActiveAiJob();
  const joined = useRef<string | null>(null);
  const leftBehind = activeJob.data ?? null;
  useEffect(() => {
    if (!leftBehind || joined.current === leftBehind.id) return;
    joined.current = leftBehind.id;
    // A finished success would overwrite whatever is in the draft; only do that when the
    // draft has no questions of its own yet. Either way it is collected, so it isn't offered
    // on every later visit.
    if (isAiJobFinished(leftBehind) && leftBehind.status === "Succeeded" && draft.parseResult?.ok) {
      void markAiJobSeen(leftBehind.id).catch(() => undefined);
      return;
    }
    run({ attach: leftBehind });
    // `run` and `draft` are new each render; this is keyed on the job alone, on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftBehind]);

  /**
   * "Keep browsing": leave the wizard with the job still running. Nothing else to do — the
   * polling stops when this page unmounts, and that is how the server learns to notify.
   */
  const handleKeepBrowsing = () => navigate("/");

  /** A fresh press of Generate: any earlier answers belonged to an earlier topic. */
  const handleGenerate = () => {
    setSourceAnswers({});
    runGeneration({});
  };

  /** One answer to grounding's question, added to the ones already given, and asked again. */
  const handleAnswerSource = (answer: AiGroundingAnswers) => {
    const answers = { ...sourceAnswers, ...answer };
    setSourceAnswers(answers);
    runGeneration(answers);
  };

  /** Back to the form from a question. Nothing was spent, so nothing to undo but the answers. */
  const handleDismissSourceChoice = () => {
    setSourceChoice(null);
    setSourceAnswers({});
  };

  /** Discards the questions and returns to the topic box. */
  const handleStartOver = () => {
    draft.resetPayload();
    setGenerateError(null);
    handleDismissSourceChoice();
  };

  return (
    <AiQuizWizardView
      categories={draft.categories}
      languages={draft.languages}
      isLoadingEntities={draft.isLoadingEntities}
      quizzesPath={draft.paths.quizzes}
      ownAiPath={draft.paths.ownAi}
      mode={draft.mode}
      topic={draft.topic}
      onTopicChange={draft.setTopic}
      sourceData={draft.sourceData}
      onSourceDataChange={draft.setSourceData}
      onUploadFile={handleUploadFile}
      isReadingFile={readSource.isPending}
      sourceFile={sourceFile}
      uploadError={uploadError}
      topicPath={draft.paths.generate}
      sourceChoice={sourceChoice}
      onAnswerSource={handleAnswerSource}
      onDismissSourceChoice={handleDismissSourceChoice}
      onCategoryIdChange={draft.setCategoryId}
      onLanguageIdChange={draft.setLanguageId}
      questionCount={draft.questionCount}
      onQuestionCountChange={draft.setQuestionCount}
      allowedTypes={draft.allowedTypes}
      onToggleType={draft.toggleType}
      extraInstructions={draft.extraInstructions}
      onExtraInstructionsChange={draft.setExtraInstructions}
      addImages={draft.addImages}
      onAddImagesChange={draft.setAddImages}
      onGenerate={handleGenerate}
      isGenerating={generation.isPending}
      generationStage={generation.stage}
      onKeepBrowsing={handleKeepBrowsing}
      generateError={generateError}
      quota={quotaQuery.data ?? null}
      needsConfirmation={draft.needsConfirmation}
      effectiveCategoryId={draft.effectiveCategoryId}
      effectiveLanguageId={draft.effectiveLanguageId}
      suggestedCategoryName={draft.suggestedCategoryName}
      suggestedLanguageName={draft.suggestedLanguageName}
      onStartOver={handleStartOver}
      parseResult={draft.parseResult}
      builderSlot={draft.builderSlot}
    />
  );
};

export default AiQuizWizard;
