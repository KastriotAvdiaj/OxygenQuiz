import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui";
import { cn } from "@/utils/cn";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
  QuestionType,
} from "@/types/question-types";

import type {
  AiGenerateError,
  AiGenerationMode,
  AiQuotaStatus,
} from "../../api/generate-ai-quiz";
import type { ParseResult } from "./parse-ai-output";

import { AdvancedOptions } from "./components/advanced-options";
import { ConfirmDetailsCard } from "./components/confirm-details-card";
import { GenerateErrorPanel } from "./components/generate-error-panel";
import { GenerationInput } from "./components/generation-input";
import { ImportSummary } from "./components/import-summary";
import { QuotaNote } from "./components/quota-note";
import { WizardButton } from "./components/wizard-button";

export {
  ALL_AI_QUESTION_TYPES,
  DEFAULT_AI_QUESTION_TYPES,
} from "./components/question-type-options";
export { ImportSummary } from "./components/import-summary";

export interface AiQuizWizardViewProps {
  // ── Entity lookups (fetched by the container) ────────────────────────────────
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  isLoadingEntities: boolean;

  // ── Navigation targets. Props, not `useLocation`, because both dashboards mount
  //    this wizard under different prefixes. ────────────────────────────────────
  quizzesPath: string;
  /**
   * The bring-your-own-AI page. A sibling route, not a panel — see
   * docs/quiz/ai-quiz-two-paths.md. Linked from the foot of this card: it isn't one of the
   * two things the method dialog asks you to choose between, it's the same job done with
   * someone else's model, and that only becomes interesting once you're already here.
   */
  ownAiPath: string;

  // ── The one box ──────────────────────────────────────────────────────────────
  /**
   * Which field to render. Comes from the route (`/ai/topic`, `/ai/material`), chosen in the
   * method dialog before the user got here — this screen never asks.
   */
  mode: AiGenerationMode;
  topic: string;
  onTopicChange: (value: string) => void;
  sourceData: string;
  onSourceDataChange: (value: string) => void;

  // ── Advanced. All optional: null category/language means "let the AI suggest". ─
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  categoryId: number | null;
  onCategoryIdChange: (id: number) => void;
  languageId: number | null;
  onLanguageIdChange: (id: number) => void;
  difficultyId: number | null;
  onDifficultyIdChange: (id: number) => void;
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
  allowedTypes: QuestionType[];
  onToggleType: (type: QuestionType) => void;
  extraInstructions: string;
  onExtraInstructionsChange: (value: string) => void;

  // ── Generation ───────────────────────────────────────────────────────────────
  onGenerate: () => void;
  isGenerating: boolean;
  /** Held (not just toasted) because it decides what the panel offers next. */
  generateError: AiGenerateError | null;
  /** null while loading or when the endpoint isn't reachable. */
  quota: AiQuotaStatus | null;

  /** Questions arrived, but a category or language still needs picking before review. */
  needsConfirmation: boolean;
  suggestedCategoryName: string | null;
  suggestedLanguageName: string | null;
  onStartOver: () => void;

  /** null until the model answers. `ok` switches the view to the review handoff. */
  parseResult: ParseResult | null;

  /**
   * The prefilled quiz builder, rendered under the import summary once parsing
   * succeeded. A slot because the real builder owns mutations and its own context
   * provider — hoisting that into props would just move the problem. Stories pass a
   * stand-in. See docs/development/storybook.md ("Slot props").
   */
  builderSlot?: ReactNode;
}

/**
 * The AI quiz wizard's markup — the **generate-for-me** path. Composition only: every
 * substantial block lives in `./components/`, so this file stays a readable table of contents
 * rather than a wall of JSX you have to scroll to navigate.
 *
 * Its twin is `own-ai-quiz-view.tsx`, the bring-your-own-AI page. They share every component
 * on this screen and differ in one step — a Generate button here, copy/paste there. See
 * docs/quiz/ai-quiz-two-paths.md before changing either.
 *
 * **Three mutually exclusive screens**, in the order they're checked:
 *   1. Lookups still loading.
 *   2. Questions parsed → the real builder takes over (`builderSlot`).
 *   3. Otherwise: the one box, or the confirm-details card when a suggestion didn't resolve.
 *
 * There is no fourth for "the lookups failed": those queries throw, so the route's
 * `DashboardErrorElement` has already replaced this component by then. An in-page card for it
 * lived here for a while and could never render — see docs/development/error-handling.md.
 *
 * Props stay flat rather than grouped into objects. The container owns all the state, this
 * file owns none, and a story sets a screen by passing plain args — grouping would buy a
 * shorter signature at the cost of the thing that makes every state reachable from
 * Storybook. Keep this file free of hooks beyond navigation.
 */
export const AiQuizWizardView = ({
  categories,
  difficulties,
  languages,
  isLoadingEntities,
  quizzesPath,
  ownAiPath,
  mode,
  topic,
  onTopicChange,
  sourceData,
  onSourceDataChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  categoryId,
  onCategoryIdChange,
  languageId,
  onLanguageIdChange,
  difficultyId,
  onDifficultyIdChange,
  questionCount,
  onQuestionCountChange,
  allowedTypes,
  onToggleType,
  extraInstructions,
  onExtraInstructionsChange,
  onGenerate,
  isGenerating,
  generateError,
  quota,
  needsConfirmation,
  suggestedCategoryName,
  suggestedLanguageName,
  onStartOver,
  parseResult,
  builderSlot,
}: AiQuizWizardViewProps) => {
  const navigate = useNavigate();

  /** Enough to build a prompt from — the same bar for generating and for copying one. */
  const hasInput =
    mode === "Topic" ? topic.trim().length > 0 : sourceData.trim().length >= 40;

  /**
   * Why the Generate button isn't ready, or null when it is. Derived rather than stored, so
   * the message disappears the moment the user fixes the problem — no clearing logic, and no
   * chance of it lingering next to input it no longer describes.
   */
  const validationMessage = !hasInput
    ? mode === "Topic"
      ? "Tell the AI what the quiz should be about."
      : "Paste a bit more material — a couple of sentences at least."
    : allowedTypes.length === 0
      ? "Pick at least one question type below."
      : null;

  /**
   * The button stays enabled while the form is incomplete.
   *
   * A disabled button with a not-allowed cursor tells someone they can't proceed but never
   * why, and they have to guess which field is at fault. Letting the click through and
   * answering it is more work for us and less for them. `isGenerating` is different — that's
   * a request in flight, not a mistake to explain, and a second click would spend another
   * generation.
   */
  const [showValidation, setShowValidation] = useState(false);
  const inputRegion = useRef<HTMLDivElement>(null);

  /**
   * Wraps any action that needs a filled-in topic. Only Generate, now that Copy prompt lives
   * on its own page — but the two build the same request and must fail the same way, so the
   * guard stays a named wrapper rather than being inlined into the click handler. The
   * own-AI page has the twin of this; keep them in step.
   */
  const runWhenValid = (action: () => void) => () => {
    if (validationMessage) {
      setShowValidation(true);
      // Focus whichever field is mounted. One ref on the region beats threading a ref
      // through GenerationInput to two different element types for a single focus call.
      inputRegion.current
        ?.querySelector<HTMLElement>("input, textarea")
        ?.focus();
      return;
    }

    setShowValidation(false);
    action();
  };

  /**
   * Generation is unavailable rather than merely having failed, so there's no point
   * offering the button. The fallback opens itself in this state.
   */
  const generationBlocked =
    quota?.enabled === false ||
    generateError?.code === "FeatureDisabled" ||
    generateError?.code === "EmailNotVerified" ||
    generateError?.code === "QuotaExceeded";

  // ── Screen 1: still fetching the lookups
  if (isLoadingEntities) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Screen 2: parsing succeeded, so drop the user into the real quiz builder with
  // everything prefilled. They get inline editing, validation and the normal submit path,
  // and nothing is saved until they act.
  if (parseResult?.ok) {
    return (
      <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
        <ImportSummary
          result={parseResult}
          isFromTopic={mode === "Topic"}
          onStartOver={onStartOver}
        />
        <div className="flex-1 min-h-0">{builderSlot}</div>
      </div>
    );
  }

  // ── Screen 3: the wizard itself
  return (
    <div className="mx-auto w-full max-w-3xl py-6 px-4">
      <header className="mb-6">
        <div className="mb-5 sm:mb-6">
          <button
            onClick={() => navigate(quizzesPath)}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Create a quiz with AI
        </h1>
        {/* The mode is no longer named by a selected tab, so the subtitle carries it. It is
            also the only confirmation the user gets that the option they picked in the
            dialog is the one that loaded. */}
        {/* <p className="text-muted-foreground text-sm mt-1">
          {mode === "Topic"
            ? "Say what it's about and we'll draft it. You review everything before it saves."
            : "Paste your material and we'll draft questions from it. You review everything before it saves."}
        </p> */}
      </header>

      {/* Questions arrived but we can't place them yet. Shown *instead of* the topic box, so
          the user finishes the one thing standing between them and the review step rather
          than being invited to generate again. */}
      {needsConfirmation ? (
        <ConfirmDetailsCard
          categories={categories}
          languages={languages}
          categoryId={categoryId}
          onCategoryIdChange={onCategoryIdChange}
          languageId={languageId}
          onLanguageIdChange={onLanguageIdChange}
          suggestedCategoryName={suggestedCategoryName}
          suggestedLanguageName={suggestedLanguageName}
          onStartOver={onStartOver}
        />
      ) : (
        // No CardHeader: it existed to hold the mode tabs, and the tinted strip left behind
        // after they moved to the method dialog was a band of colour heading nothing. What
        // the card holds now is the whole of it — the question, the details that answer it,
        // and the button. Nothing on this screen is hidden behind a click any more: the
        // Advanced drawer became the visible `AdvancedOptions` form below.
        <Card className="bg-background border-2 border-primary/30">
          <CardContent className="space-y-5 pt-6">
            <div ref={inputRegion}>
              <GenerationInput
                mode={mode}
                topic={topic}
                onTopicChange={onTopicChange}
                sourceData={sourceData}
                onSourceDataChange={onSourceDataChange}
                disabled={isGenerating}
                error={
                  showValidation ? (validationMessage ?? undefined) : undefined
                }
              />
            </div>

            <AdvancedOptions
              categories={categories}
              difficulties={difficulties}
              languages={languages}
              title={title}
              onTitleChange={onTitleChange}
              description={description}
              onDescriptionChange={onDescriptionChange}
              categoryId={categoryId}
              onCategoryIdChange={onCategoryIdChange}
              languageId={languageId}
              onLanguageIdChange={onLanguageIdChange}
              difficultyId={difficultyId}
              onDifficultyIdChange={onDifficultyIdChange}
              questionCount={questionCount}
              onQuestionCountChange={onQuestionCountChange}
              allowedTypes={allowedTypes}
              onToggleType={onToggleType}
              extraInstructions={extraInstructions}
              onExtraInstructionsChange={onExtraInstructionsChange}
            />

            {generateError && <GenerateErrorPanel error={generateError} />}

            {/* The row always renders. Generate goes *disabled* rather than missing when
                generation is unavailable (kill switch, quota spent, unverified email): a
                button that could only fail shouldn't be pressable, but removing it left the
                card with no visible primary action and nothing to explain the gap. The link
                below is the way through, and `title` carries the reason for a pointer user —
                the error panel above says it in full whenever the cause raised one. */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <QuotaNote quota={quota} />
              <WizardButton
                type="button"
                disabled={isGenerating || generationBlocked}
                title={
                  generationBlocked
                    ? "Generating in the app isn't available right now — use your own AI below."
                    : undefined
                }
                onClick={runWhenValid(onGenerate)}
              >
                <span className="flex items-center gap-2">
                  {isGenerating ? (
                    <>
                      <Spinner size="sm" /> Writing questions…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Generate
                    </>
                  )}
                </span>
              </WizardButton>
            </div>

            {/* No progress bar until slice 2.2 streams one, so the least we can do is say
                how long "a while" is and that leaving kills it. */}
            {isGenerating && (
              <p className="text-muted-foreground text-xs text-center">
                This usually takes 10–30 seconds. Keep this tab open.
              </p>
            )}

            <Separator className="bg-primary/20" />

            {/* One way out, not three. "Create manually instead" left with the mode tabs —
                that decision belongs to the method dialog, and repeating it here is what made
                this card read as a menu. This one stays because it isn't the same question:
                it's this exact job with someone else's model, and it only becomes interesting
                once you're already looking at the form.

                It also has to stay for a hard reason. When the button above is disabled (kill
                switch, quota spent, unverified email) there is otherwise no way forward from
                this page except Back — so in that state the link stops being quiet and takes
                the primary colour, with a line above it saying why. */}
            {generationBlocked && (
              <p className="text-muted-foreground text-xs">
                Generating in the app isn't available right now.
              </p>
            )}
            <Link
              to={ownAiPath}
              className={cn(
                "text-sm",
                generationBlocked
                  ? "text-primary font-medium hover:underline"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Use your own AI instead (free)
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AiQuizWizardView;
