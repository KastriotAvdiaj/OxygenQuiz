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
 * handoff — the difference is the middle step: two numbered actions with a trip through
 * ChatGPT between them, instead of one Generate button. Composition only; no hooks beyond
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
    <div className="mx-auto w-full max-w-2xl py-6 px-4">
      <header className="mb-6">
        <div className="mb-5 sm:mb-6">
          <button
            onClick={() => navigate(generatePath)}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Use your own AI
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Free, and it works even when ours is busy. Say what the quiz is about,
          copy the prompt into ChatGPT, Claude or Gemini, then paste the reply
          back here.
        </p>
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
          <CardContent className="space-y-4 pt-5">
            {/* The same question the wizard asks, because the prompt is built from the same
                request — this page just can't inherit the answer. */}
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
              <p className="mb-1 text-sm font-medium">1. Copy the prompt</p>
              <p className="mb-3 text-xs text-muted-foreground">
                It's the exact prompt we'd send ourselves — nothing is held back
                for the paid path.
              </p>
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
            </div>

            <div>
              <p className="mb-1 text-sm font-medium">2. Paste the AI's reply</p>
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
