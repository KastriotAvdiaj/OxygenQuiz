import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
} from "lucide-react";

import { Spinner } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/cn";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
  QuestionType,
} from "@/types/question-types";

import type { ParseResult } from "./parse-ai-output";

import { AdvancedOptions } from "./components/advanced-options";
import { ConfirmDetailsCard } from "./components/confirm-details-card";
import { GenerationInput } from "./components/generation-input";
import { ImportSummary } from "./components/import-summary";
import { InfoHint } from "./components/info-hint";
import { StepMarker } from "./components/step-marker";
import { WizardButton } from "./components/wizard-button";

export interface OwnAiQuizViewProps {
  // ── Entity lookups (fetched by the container) ────────────────────────────────
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  isLoadingEntities: boolean;

  // ── Navigation targets. Props, not `useLocation`, because both dashboards mount
  //    this page under different prefixes. ───────────────────────────────────────
  generatePath: string;
  manualCreatePath: string;

  /**
   * What the quiz is about. Asked here too — this page builds its own prompt, so it can't
   * inherit the wizard's answer.
   *
   * **Topic only, no mode tabs.** Source material is a *generation* feature: we send it to
   * the model as part of the request and truncate it server-side. This path can't — the
   * user copies a prompt into someone else's chat window, and pasting their notes there is
   * something they do themselves, at whatever length that tool accepts. Offering "From my
   * material" here would promise a handoff we don't perform.
   */
  topic: string;
  onTopicChange: (value: string) => void;

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

  // ── The round trip ───────────────────────────────────────────────────────────
  onCopyPrompt: () => void;
  copied: boolean;
  isCopying: boolean;
  /**
   * Set when the prompt arrived but the clipboard refused it (see the container). Rendered
   * for the user to select by hand — never null-checked away, because at that point it is
   * the only copy of the thing they came here for.
   */
  promptToCopyByHand: string | null;
  aiResponse: string;
  onAiResponseChange: (value: string) => void;
  onImport: () => void;
  /** null before any attempt. `ok` switches the view to the review handoff. */
  parseResult: ParseResult | null;

  /** Questions arrived, but a category or language still needs picking before review. */
  needsConfirmation: boolean;
  suggestedCategoryName: string | null;
  suggestedLanguageName: string | null;
  onStartOver: () => void;

  /** The prefilled quiz builder — a slot for the same reason as in the wizard view. */
  builderSlot?: ReactNode;
}

/**
 * "Use your own AI", as a page.
 *
 * Same three screens as the wizard (`ai-quiz-wizard-view.tsx`), same components, same
 * handoff — the difference is the middle step: **three numbered steps** with a trip through
 * ChatGPT between them, instead of one Generate button. Describing the quiz is step 1; it
 * used to be an unnumbered preamble above a button labelled "1.", which is the only place in
 * either path where a user can genuinely lose their place. See `components/step-marker.tsx`. Composition only; no hooks beyond
 * navigation and the two bits of "has the user tried yet?" feedback below.
 */
export const OwnAiQuizView = ({
  categories,
  difficulties,
  languages,
  isLoadingEntities,
  generatePath,
  manualCreatePath,
  topic,
  onTopicChange,
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
  onCopyPrompt,
  copied,
  isCopying,
  promptToCopyByHand,
  aiResponse,
  onAiResponseChange,
  onImport,
  parseResult,
  needsConfirmation,
  suggestedCategoryName,
  suggestedLanguageName,
  onStartOver,
  builderSlot,
}: OwnAiQuizViewProps) => {
  const navigate = useNavigate();

  /**
   * Why Copy prompt isn't ready, or null when it is. Derived rather than stored, so the
   * message disappears the moment the user fixes the problem. Same bar as the generate
   * path's topic mode — keep the two in step.
   */
  const validationMessage =
    topic.trim().length === 0
      ? "Tell the AI what the quiz should be about."
      : allowedTypes.length === 0
        ? "Pick at least one question type under Advanced."
        : null;

  // Both buttons stay clickable while the form is incomplete and explain themselves on
  // press, rather than greying out and leaving the user to guess which box is at fault.
  const [showValidation, setShowValidation] = useState(false);
  const [showPasteError, setShowPasteError] = useState(false);
  const inputRegion = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const pasteMissing = aiResponse.trim().length === 0;

  const handleCopyClick = () => {
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
    onCopyPrompt();
  };

  const handleImportClick = () => {
    if (pasteMissing) {
      setShowPasteError(true);
      replyRef.current?.focus();
      return;
    }

    setShowPasteError(false);
    onImport();
  };

  // ── Screen 1: still fetching the lookups
  if (isLoadingEntities) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Screen 2: the reply parsed, so drop the user into the real builder with everything
  // prefilled. Identical handoff to the generate path — that convergence is the point.
  if (parseResult?.ok) {
    return (
      <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
        {/* Always topic-based here, so the fact-check nudge always applies. */}
        <ImportSummary result={parseResult} isFromTopic onStartOver={onStartOver} />
        <div className="flex-1 min-h-0">{builderSlot}</div>
      </div>
    );
  }

  // ── Screen 3: the page itself
  return (
    <div className="mx-auto w-full max-w-2xl py-6 px-4 short:py-0">
      <header className="mb-6 short:mb-2">
        <div className="mb-5 sm:mb-6 short:mb-1.5">
          <button
            onClick={() => navigate(generatePath)}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </div>
        {/* The subtitle that used to sit here explained the flow in prose — and then the
            three numbered steps below explained it again, better, in the order you do it.
            What was left over was "why this page exists" and "are you giving me a worse
            prompt because I'm not paying", which are both worth answering and neither of
            which needs to be on screen while you work. They moved into the ⓘ. */}
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 short:text-lg">
            Use your own AI
          </h1>
          <InfoHint label="About using your own AI">
            <p>
              Free, and it works even when ours is busy — you run the prompt in
              ChatGPT, Claude or Gemini instead of us running it for you.
            </p>
            <p className="mt-2">
              It's the exact prompt we'd send ourselves. Nothing is held back for
              the paid path.
            </p>
          </InfoHint>
        </div>
      </header>

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
        // No header strip: the wizard's is the mode tabs, and there is only one mode here.
        <Card className="bg-background border-2 border-primary/30">
          <CardContent className="space-y-4 pt-5 short:space-y-3 short:pt-3">
            {/* The same question the wizard asks, because the prompt is built from the same
                request — this page just can't inherit the answer. It carries a step number
                here and not there: see `step-marker.tsx`. */}
            <StepMarker
              step={1}
              title="Describe the quiz"
              done={topic.trim().length > 0}
            />
            <div ref={inputRegion}>
              <GenerationInput
                mode="Topic"
                topic={topic}
                onTopicChange={onTopicChange}
                sourceData=""
                onSourceDataChange={() => undefined}
                disabled={false}
                error={
                  showValidation ? (validationMessage ?? undefined) : undefined
                }
                // "Copy prompt" is this page's first action, and `handleCopyClick`
                // carries the same validation guard the wizard's Generate does — keep
                // the two in step (docs/quiz/ai-quiz-two-paths.md §3).
                onSubmit={handleCopyClick}
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

            <Separator className="bg-primary/20" />

            <div className="rounded-lg border-2 border-dashed border-primary/40 p-4">
              <div className="mb-3">
                <StepMarker step={2} title="Copy the prompt" done={copied} />
              </div>
              <WizardButton
                type="button"
                disabled={isCopying}
                onClick={handleCopyClick}
              >
                <span className="flex items-center gap-2">
                  {isCopying ? (
                    <>
                      <Spinner size="sm" /> Preparing…
                    </>
                  ) : copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy prompt
                    </>
                  )}
                </span>
              </WizardButton>

              {promptToCopyByHand && (
                <div className="mt-3">
                  <p className="mb-1.5 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    Your browser wouldn't let us reach the clipboard. Here's the
                    prompt — select it and copy it yourself.
                  </p>
                  <Textarea
                    readOnly
                    variant="settings"
                    // Select-all on focus so "click, Ctrl+C" still works in two actions.
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-h-[120px] font-mono text-xs"
                    value={promptToCopyByHand}
                    aria-label="The prompt, to copy manually"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="mb-1">
                <StepMarker
                  step={3}
                  title="Paste the AI's reply"
                  // `pasteMissing` is already derived above for the validation message —
                  // reuse it rather than computing "is there text in the box" twice.
                  done={!pasteMissing}
                />
              </div>
              <Textarea
                ref={replyRef}
                variant="settings"
                className={cn(
                  "min-h-[180px] font-mono text-xs",
                  showPasteError &&
                    pasteMissing &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                placeholder='{ "questions": [ ... ] }'
                value={aiResponse}
                onChange={(e) => onAiResponseChange(e.target.value)}
                aria-invalid={showPasteError && pasteMissing}
                aria-describedby={
                  showPasteError && pasteMissing ? "ai-paste-error" : undefined
                }
              />

              {/* Derived, so it clears itself the moment anything is pasted. */}
              {showPasteError && pasteMissing && (
                <p
                  id="ai-paste-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Paste the AI's reply here first.
                </p>
              )}

              {parseResult && !parseResult.ok && (
                <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                  <p className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {parseResult.error}
                  </p>
                  {parseResult.dropped.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-xs text-destructive/90">
                      {/* Capped at five: a reply where everything failed produces one reason
                          per question, and a wall of them buries the actual problem. */}
                      {parseResult.dropped.slice(0, 5).map((d) => (
                        <li key={d.index}>
                          Question {d.index}: {d.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3">
                <WizardButton type="button" onClick={handleImportClick}>
                  <span className="flex items-center gap-1">
                    Review questions <ArrowRight className="h-4 w-4" />
                  </span>
                </WizardButton>
              </div>
            </div>

            <Separator className="bg-primary/20" />

            <div className="flex flex-col gap-1.5">
              <Link
                to={generatePath}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Let us generate it instead
              </Link>
              <Link
                to={manualCreatePath}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Create manually instead
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default OwnAiQuizView;
