import { useState } from "react";

import { useNotifications } from "@/common/Notifications";

import { AiGenerateError, getAiPrompt } from "../../api/generate-ai-quiz";

import { OwnAiQuizView } from "./own-ai-quiz-view";
import { useAiQuizDraft } from "./use-ai-quiz-draft";

/**
 * Container for the **bring-your-own-AI** path: we build the prompt, you run it in whatever
 * model you already pay for, and you paste the reply back.
 *
 * A route of its own rather than a panel inside the wizard (docs/quiz/ai-quiz-two-paths.md).
 * It is not a smaller version of generating — it is a round trip through another app, and it
 * needs the whole screen to describe: say what the quiz is about, copy, leave, come back,
 * paste. Folded into the wizard it was first an accordion that pushed Generate off-screen and
 * then a drawer covering the page it belonged to; both were the same mistake, which is that a
 * second flow was being hidden inside the first.
 *
 * Everything shared with the generate path lives in `useAiQuizDraft`. What's here is the
 * clipboard and the pasted reply.
 *
 * <b>Topic only.</b> The draft's `mode` stays at its `"Topic"` default and this page never
 * offers the tabs: source material is something we send *to the model* on the generate path
 * and truncate server-side, which is not a thing we can do through someone else's chat
 * window. See docs/quiz/ai-quiz-two-paths.md.
 */
export const OwnAiQuiz = () => {
  const draft = useAiQuizDraft();
  const { addNotification } = useNotifications();

  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  /**
   * The prompt, shown on screen because the clipboard refused it.
   *
   * <b>Why this exists.</b> The write happens *after* an awaited request, and a clipboard
   * write is only allowed while the click that triggered it is still "recent" — Chrome gives
   * roughly five seconds of transient activation, Safari is stricter still, and a slow server
   * spends that budget before we ever reach `writeText`. Also `navigator.clipboard` is simply
   * undefined outside a secure context. Copying the prompt is the entire purpose of this page,
   * so "your browser blocked it" cannot be the end of the road: we already have the text, so
   * put it on screen and let the user select it.
   */
  const [promptToCopyByHand, setPromptToCopyByHand] = useState<string | null>(
    null,
  );

  /** Fetches the prompt from the server — the same one generation would send — and copies it. */
  const handleCopyPrompt = async () => {
    setIsCopying(true);
    setPromptToCopyByHand(null);

    let prompt: string;
    try {
      ({ prompt } = await getAiPrompt(draft.buildInput()));
    } catch (error) {
      // Couldn't get the text at all. A toast, because there is nothing to show instead.
      addNotification({
        type: "error",
        title: "Couldn't build the prompt",
        message:
          error instanceof AiGenerateError
            ? error.message
            : "Something went wrong building the prompt. Try again.",
      });
      setIsCopying(false);
      return;
    }

    // Two failures, two outcomes: above we have nothing to offer, here we have the prompt and
    // only the clipboard failed — which is recoverable without another round trip.
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setPromptToCopyByHand(prompt);
    } finally {
      setIsCopying(false);
    }
  };

  const handleAiResponseChange = (value: string) => {
    setAiResponse(value);
    // Editing the reply invalidates the previous verdict — keep the error from hanging
    // around next to text it no longer describes.
    if (draft.payload) draft.resetPayload();
  };

  /**
   * Hands the pasted reply to exactly the same pipeline a generated one goes through.
   *
   * No id guard here, and that's deliberate: the reply carries its own title, category and
   * language, so demanding them up front asks the user for things the model already
   * answered. If they genuinely can't be resolved, `needsConfirmation` catches it downstream
   * and asks only for what's missing.
   */
  const handleImport = () => draft.setPayload(aiResponse);

  /** Discards the questions and returns to the paste box. */
  const handleStartOver = () => {
    draft.resetPayload();
    setAiResponse("");
  };

  return (
    <OwnAiQuizView
      categories={draft.categories}
      difficulties={draft.difficulties}
      languages={draft.languages}
      isLoadingEntities={draft.isLoadingEntities}
      generatePath={draft.paths.generate}
      manualCreatePath={draft.paths.manualCreate}
      topic={draft.topic}
      onTopicChange={draft.setTopic}
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
      onCopyPrompt={handleCopyPrompt}
      copied={copied}
      promptToCopyByHand={promptToCopyByHand}
      isCopying={isCopying}
      aiResponse={aiResponse}
      onAiResponseChange={handleAiResponseChange}
      onImport={handleImport}
      parseResult={draft.parseResult}
      needsConfirmation={draft.needsConfirmation}
      suggestedCategoryName={draft.suggestedCategoryName}
      suggestedLanguageName={draft.suggestedLanguageName}
      onStartOver={handleStartOver}
      builderSlot={draft.builderSlot}
    />
  );
};

export default OwnAiQuiz;
