import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Info } from "lucide-react";

import { BlobLoader, Spinner } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/cn";
import type { QuestionCategory, QuestionLanguage, QuestionType } from "@/types/question-types";

import type { FactPack } from "../../api/fact-quiz";
import { MAX_FACT_QUESTIONS } from "../../api/fact-quiz";
import type { ParseResult } from "./parse-ai-output";
import { ConfirmDetailsCard } from "./components/confirm-details-card";
import { InfoHint } from "./components/info-hint";
import { QuestionCountStepper } from "./components/question-count-stepper";
import { QuestionTypeOptions } from "./components/question-type-options";
import { StepMarker } from "./components/step-marker";
import { WizardButton } from "./components/wizard-button";

/** How a pack's languages are named here: the English name, then its own. */
const LANGUAGE_LABELS: Record<string, string> = {
  English: "English",
  Albanian: "Albanian · shqip",
};

/** A pack needs this many facts in a language before it's offered in it (`FactQuizBuilder`). */
const MIN_FACTS = 4;

export interface FactQuizViewProps {
  backPath: string;
  generatePath: string;
  manualCreatePath: string;

  packs: FactPack[];
  isLoadingPacks: boolean;
  packsFailed: boolean;
  selectedSlug: string | null;
  onSelectPack: (slug: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  questionCount: number;
  onQuestionCountChange: (count: number) => void;
  allowedTypes: QuestionType[];
  onToggleType: (type: QuestionType) => void;

  onBuild: () => void;
  isBuilding: boolean;
  buildError: string | null;

  // ── The same handoff as the other AI pages (useAiQuizDraft).
  isLoadingEntities: boolean;
  parseResult: ParseResult | null;
  needsConfirmation: boolean;
  categories: QuestionCategory[];
  languages: QuestionLanguage[];
  effectiveCategoryId: number | null;
  onCategoryIdChange: (id: number | null) => void;
  effectiveLanguageId: number | null;
  onLanguageIdChange: (id: number | null) => void;
  suggestedCategoryName: string | null;
  suggestedLanguageName: string | null;
  onStartOver: () => void;
  builderSlot?: ReactNode;
}

/**
 * "From facts": a quiz built from a Wikidata fact pack (docs/quiz/fact-quizzes.md).
 *
 * The other AI pages ask for a topic; this one asks you to pick from what we have facts for,
 * because that's what makes it different — every answer is a fact from Wikidata, with wrong
 * options taken from the same pack, and no model writes or checks anything. So it's free, and
 * it says so.
 *
 * Laid out like `OwnAiQuizView`: numbered steps in one card, the same stepper and type picker,
 * the same handoff to the review once the reply parses.
 */
export const FactQuizView = ({
  backPath,
  generatePath,
  manualCreatePath,
  packs,
  isLoadingPacks,
  packsFailed,
  selectedSlug,
  onSelectPack,
  language,
  onLanguageChange,
  questionCount,
  onQuestionCountChange,
  allowedTypes,
  onToggleType,
  onBuild,
  isBuilding,
  buildError,
  isLoadingEntities,
  parseResult,
  needsConfirmation,
  categories,
  languages,
  effectiveCategoryId,
  onCategoryIdChange,
  effectiveLanguageId,
  onLanguageIdChange,
  suggestedCategoryName,
  suggestedLanguageName,
  onStartOver,
  builderSlot,
}: FactQuizViewProps) => {
  const navigate = useNavigate();

  if (isLoadingEntities || isLoadingPacks) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <BlobLoader size="lg" />
      </div>
    );
  }

  // The reply parsed: the review, exactly as after a generation.
  if (parseResult?.ok) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 xl:max-w-none">
        <div>{builderSlot}</div>
      </div>
    );
  }

  const pack = packs.find((p) => p.slug === selectedSlug) ?? null;
  const packLanguages = pack
    ? Object.entries(pack.factsByLanguage).filter(([, n]) => n >= MIN_FACTS).map(([l]) => l)
    : [];
  const usable = pack?.factsByLanguage[language] ?? 0;
  const maxQuestions = Math.max(1, Math.min(MAX_FACT_QUESTIONS, usable));
  const typesOffered = allowedTypes.filter((t) => pack?.questionTypes.includes(t));
  const typesError = pack && typesOffered.length === 0 ? "Pick at least one type this pack can ask." : undefined;
  const canBuild = Boolean(pack) && packLanguages.includes(language) && typesOffered.length > 0 && !isBuilding;

  return (
    <div className="mx-auto w-full max-w-2xl py-6 px-4 short:py-0">
      <header className="mb-6 short:mb-2">
        <div className="mb-5 sm:mb-6 short:mb-1.5">
          <button
            onClick={() => navigate(backPath)}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </div>
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 short:text-lg">From facts</h1>
          <InfoHint label="About quizzes from facts">
            <p>
              Every answer is a fact from Wikidata, and the wrong options come from the same set —
              other capitals, other peaks. No AI decides what's true.
            </p>
            <p className="mt-2">Free: it doesn't use any of your daily generations.</p>
          </InfoHint>
        </div>
      </header>

      {needsConfirmation ? (
        <ConfirmDetailsCard
          categories={categories}
          languages={languages}
          effectiveCategoryId={effectiveCategoryId}
          onCategoryIdChange={onCategoryIdChange}
          effectiveLanguageId={effectiveLanguageId}
          onLanguageIdChange={onLanguageIdChange}
          suggestedCategoryName={suggestedCategoryName}
          suggestedLanguageName={suggestedLanguageName}
          onStartOver={onStartOver}
        />
      ) : (
        <Card className="bg-background border-2 border-primary/30">
          <CardContent className="space-y-8 pt-5 short:space-y-6 short:pt-3">
            <div>
              <div className="mb-2">
                <StepMarker step={1} title="Pick a set of facts" done={Boolean(pack)} />
              </div>
              {packsFailed ? (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Couldn't load the fact sets. Refresh to try again.
                </p>
              ) : packs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fact sets are available yet.</p>
              ) : (
                <div role="radiogroup" aria-label="Fact sets" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {packs.map((p) => {
                    const active = p.slug === selectedSlug;
                    const facts = p.factsByLanguage[language] ?? Math.max(...Object.values(p.factsByLanguage));
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onSelectPack(p.slug)}
                        className={cn(
                          // The question-type picker's rows: 44px+, bordered, the selected one solid.
                          "flex min-h-11 w-full min-w-0 items-start gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                          )}
                        >
                          {active && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium leading-tight break-words">
                            {p.title[language] ?? p.title.English ?? p.slug}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {p.description[language] ?? p.description.English}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {facts} facts{p.category ? ` · ${p.category}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {pack?.editorialNote && (
                // What's in the set, said where it's picked — "Kosovo counts" is a choice the
                // author should be able to see, not one hidden in a query.
                <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {pack.editorialNote}
                    {pack.builtAt && ` Facts from Wikidata, ${pack.builtAt}.`}
                  </span>
                </p>
              )}
            </div>

            <div>
              <div className="mb-2">
                <StepMarker step={2} title="Language" done={packLanguages.includes(language)} />
              </div>
              <div role="radiogroup" aria-label="Quiz language" className="grid grid-cols-2 gap-2">
                {["English", "Albanian"].map((l) => {
                  const offered = !pack || packLanguages.includes(l);
                  const active = l === language;
                  return (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={!offered}
                      onClick={() => onLanguageChange(l)}
                      className={cn(
                        "min-h-11 rounded-lg border-2 px-3 py-2 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        active ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/50",
                      )}
                    >
                      {LANGUAGE_LABELS[l] ?? l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2">
                <StepMarker step={3} title="Questions" done={typesOffered.length > 0} />
              </div>
              {/* No "How many" label: the stepper reads "10 questions" itself, and beside a label
                  it ran out of the card on a phone. */}
              <div className="flex">
                <QuestionCountStepper
                  value={Math.min(questionCount, maxQuestions)}
                  onChange={onQuestionCountChange}
                  min={1}
                  max={maxQuestions}
                />
              </div>
              <QuestionTypeOptions
                selected={allowedTypes}
                onToggle={onToggleType}
                available={pack?.questionTypes}
                label="Question types"
                error={typesError}
              />
            </div>

            <div className="flex flex-col items-end gap-2">
              <WizardButton type="button" disabled={!canBuild} onClick={onBuild}>
                <span className="flex items-center gap-2">
                  {isBuilding ? (
                    <>
                      <Spinner size="sm" /> Building…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" /> Build the quiz
                    </>
                  )}
                </span>
              </WizardButton>
              {buildError && (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {buildError}
                </p>
              )}
              {parseResult && !parseResult.ok && (
                <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {parseResult.error}
                </p>
              )}
            </div>

            <Separator className="bg-primary/20" />

            <div className="flex flex-col gap-1.5">
              <Link to={generatePath} className="text-muted-foreground hover:text-foreground text-sm">
                Write about any topic with AI instead
              </Link>
              <Link to={manualCreatePath} className="text-muted-foreground hover:text-foreground text-sm">
                Create manually instead
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FactQuizView;
