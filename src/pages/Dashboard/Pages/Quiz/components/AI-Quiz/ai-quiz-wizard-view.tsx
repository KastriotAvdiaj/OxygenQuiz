import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Spinner, BlobLoader } from "@/components/ui";
import { cn } from "@/utils/cn";
import type {
  QuestionCategory,
  QuestionLanguage,
  QuestionType,
} from "@/types/question-types";

import type {
  AiGenerateError,
  AiGenerationMode,
  AiGrounding,
  AiGroundingAnswers,
  AiQuotaStatus,
} from "../../api/generate-ai-quiz";
import type { ParseResult } from "./parse-ai-output";


import { AdvancedOptions } from "./components/advanced-options";
import { ConfirmDetailsCard } from "./components/confirm-details-card";
import { GenerateErrorPanel } from "./components/generate-error-panel";
import { GeneratingOverlay } from "./components/generating-overlay";
import { useGenerationWait } from "./components/use-generation-wait";
import { LeaveGenerationDialog } from "./components/leave-generation-dialog";
import {
  GenerationInput,
  type SourceFileInfo,
} from "./components/generation-input";
import { SourceChoiceCard } from "./components/source-choice-card";
import { QuotaNote } from "./components/quota-note";
import { WizardButton } from "./components/wizard-button";

export {
  ALL_AI_QUESTION_TYPES,
  DEFAULT_AI_QUESTION_TYPES,
} from "./components/question-type-options";
export { ImportNotices } from "./components/import-notices";

export interface AiQuizWizardViewProps {
  // ── Entity lookups (fetched by the container) ────────────────────────────────
  categories: QuestionCategory[];
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
  /** Source mode: read an uploaded file into the material box (`POST /quiz/ai-source`). */
  onUploadFile?: (file: File) => void;
  isReadingFile?: boolean;
  /** The file the material box's text came from; null when it was typed or pasted. */
  sourceFile?: SourceFileInfo | null;
  uploadError?: string;
  /**
   * The topic-mode wizard. Source mode's way out when material mode is unavailable — the
   * own-AI page is topic-only, so sending someone there with a document in hand loses it.
   */
  topicPath?: string;

  // ── Grounding (docs/quiz/ai-quiz-generation-flow.md §2e) ──
  /**
   * The server's question, when grounding needs the author before it can go on: which
   * language, which article, or whether to go ahead from memory while Wikipedia is down.
   * Shown in place of the form, like `ConfirmDetailsCard`. Asked before anything is spent.
   */
  sourceChoice?: AiGrounding | null;
  /** An answer to `sourceChoice`. An empty object is "try again" — the same question, re-asked. */
  onAnswerSource?: (answer: AiGroundingAnswers) => void;
  /** Back to the form without answering. */
  onDismissSourceChoice?: () => void;

  // ── Advanced. All optional: null category/language means "let the AI suggest". ─
  /**
   * Category and language are no longer asked for *before* generating — the form that used
   * to has gone (see `AdvancedOptions`). These two remain because `ConfirmDetailsCard` sets
   * them afterwards, when the model's own proposal didn't resolve.
   */
  onCategoryIdChange: (id: number) => void;
  onLanguageIdChange: (id: number) => void;
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
  allowedTypes: QuestionType[];
  onToggleType: (type: QuestionType) => void;
  extraInstructions: string;
  onExtraInstructionsChange: (value: string) => void;
  addImages?: boolean;
  onAddImagesChange?: (value: boolean) => void;

  // ── Generation ───────────────────────────────────────────────────────────────
  onGenerate: () => void;
  isGenerating: boolean;
  /** Held (not just toasted) because it decides what the panel offers next. */
  generateError: AiGenerateError | null;
  /** null while loading or when the endpoint isn't reachable. */
  quota: AiQuotaStatus | null;

  /** Questions arrived, but a category or language still needs picking before review. */
  needsConfirmation: boolean;
  /**
   * What the quiz will be saved with once the model's suggestions have been resolved — the
   * user's pick, or the resolved suggestion, or null when neither produced anything. The
   * confirmation card asks for exactly the fields that are null here; `categoryId` /
   * `languageId` above stay the raw picks, because the Advanced form must keep showing the
   * user their own choice and nothing else.
   */
  effectiveCategoryId: number | null;
  effectiveLanguageId: number | null;
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

  // ── Leaving mid-generation ───────────────────────────────────────────────────
  /**
   * The router blocked a navigation while a generation was in flight. Armed in the
   * container by `useNavigationGuard`; a prop rather than a hook here so a story can open
   * the dialog by passing `true`.
   */
  showLeaveDialog?: boolean;
  onConfirmLeave?: () => void;
  onCancelLeave?: () => void;

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
  languages,
  isLoadingEntities,
  quizzesPath,
  ownAiPath,
  mode,
  topic,
  onTopicChange,
  sourceData,
  onSourceDataChange,
  onUploadFile,
  isReadingFile = false,
  sourceFile = null,
  uploadError,
  topicPath,
  sourceChoice = null,
  onAnswerSource,
  onDismissSourceChoice,
  onCategoryIdChange,
  onLanguageIdChange,
  questionCount,
  onQuestionCountChange,
  allowedTypes,
  onToggleType,
  extraInstructions,
  onExtraInstructionsChange,
  addImages,
  onAddImagesChange,
  onGenerate,
  isGenerating,
  generateError,
  quota,
  needsConfirmation,
  effectiveCategoryId,
  effectiveLanguageId,
  suggestedCategoryName,
  suggestedLanguageName,
  onStartOver,
  parseResult,
  builderSlot,
  showLeaveDialog = false,
  onConfirmLeave,
  onCancelLeave,
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
  const topicMessage = !hasInput
    ? mode === "Topic"
      ? "Tell the AI what the quiz should be about."
      : "Paste a bit more material — a couple of sentences at least."
    : null;
  // Mirrors the API, which refuses an empty type list (AiGenerationService.ValidateContent).
  const typesMessage =
    allowedTypes.length === 0 ? "Pick at least one question type." : null;
  // Each message shows under its own field — a missing type used to be reported under the
  // topic box, with the cursor sent there too, far from the cards that needed fixing.
  const validationMessage = topicMessage ?? typesMessage;

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
  const optionsRegion = useRef<HTMLDivElement>(null);

  /**
   * Wraps any action that needs a filled-in topic. Only Generate, now that Copy prompt lives
   * on its own page — but the two build the same request and must fail the same way, so the
   * guard stays a named wrapper rather than being inlined into the click handler. The
   * own-AI page has the twin of this; keep them in step.
   */
  const runWhenValid = (action: () => void) => () => {
    if (validationMessage) {
      setShowValidation(true);
      // Focus the first field at fault. One ref per region beats threading refs through
      // GenerationInput (two different element types) and AdvancedOptions for a focus call.
      (topicMessage
        ? inputRegion.current?.querySelector<HTMLElement>("input, textarea")
        : optionsRegion.current?.querySelector<HTMLElement>('[role="checkbox"]')
      )?.focus();
      return;
    }

    setShowValidation(false);
    action();
  };

  /**
   * Generation is unavailable rather than merely having failed, so there's no point
   * offering the button. The fallback opens itself in this state.
   */
  /**
   * Material mode is closed until the configured model is strong enough for it
   * (`AllowsSourceMode` on the server). The method dialog won't offer it then, so this is
   * someone arriving by URL or a bookmark.
   */
  const sourceModeClosed = mode === "Source" && quota?.sourceModeEnabled === false;

  const generationBlocked =
    sourceModeClosed ||
    quota?.enabled === false ||
    generateError?.code === "FeatureDisabled" ||
    generateError?.code === "EmailNotVerified" ||
    generateError?.code === "QuotaExceeded";

  /**
   * Rendered by **every** branch below, not just the wizard.
   *
   * The blocker is armed on `isGenerating`, which today can only be true on screen 3 — but
   * "today" is the whole problem. `useNavigationGuard`'s contract is that a blocked
   * navigation always has a visible way out, and the multiplayer lobby shipped the other
   * version of this: the blocker armed on one branch, the dialog defined on another, and a
   * click that stranded the router in "blocked" with no proceed and no reset, re-rendering
   * the subtree on every further click until the question timer froze. One element used in
   * all three returns costs a line each and cannot drift that way.
   */
  /**
   * The set-piece for the wait itself, from the first frame to the last.
   * `useGenerationWait` owns the timing: a floor so a fast success can't flash it,
   * a beat on the questions landing, and a straight exit on failure so the error
   * panel is never stuck behind an animation.
   */
  const generationPhase = useGenerationWait(isGenerating, {
    // Questions arrived — either straight into the review, or into the one-field
    // confirm card. Both are the model having done its job.
    succeeded: parseResult?.ok === true || needsConfirmation,
    // The request failed, or it came back and the parser could make nothing of it.
    // Either way the next thing on screen is a panel explaining it, not a quiz.
    // A question from grounding counts too: the next thing on screen is the card asking it.
    failed:
      generateError !== null ||
      sourceChoice !== null ||
      (parseResult !== null && !parseResult.ok),
  });

  /**
   * Rendered by every branch, like `leaveDialog` below — with one reason of its own.
   * A successful generation moves the view to the review screen while the overlay may
   * still be holding out its minimum, so the branch it unmounts on is not the branch it
   * mounted on.
   */
  const generatingOverlay = generationPhase ? (
    <GeneratingOverlay
      phase={generationPhase}
      mode={mode}
      questionCount={parseResult?.ok ? parseResult.questions.length : undefined}
    />
  ) : null;

  /**
   * Whether a result is allowed to take the screen yet.
   *
   * <b>The bug this closes.</b> `parseResult.ok` flips the moment the payload parses,
   * which is while the overlay is still saying the model is writing. The review screen
   * was therefore built, mounted and sitting there for the whole of the success beat,
   * and the overlay's fade was not a transition to it — it was a curtain coming off
   * something that had already happened. Anything the builder did on mount happened
   * under a screen claiming the work was still in progress.
   *
   * So the two are sequenced rather than crossfaded: the overlay keeps the screen while
   * it is working and while it says the questions are ready, and the result arrives on
   * `leaving` — inside the 300ms fade, which is enough for the builder to mount and
   * paint, so the reveal is never a blank frame — with an entrance of its own.
   *
   * `aborting` and `null` are both "the overlay is not claiming anything", so results
   * show immediately: on a failure what is behind is the form and its error panel, and
   * holding *that* back would be the same mistake pointing the other way.
   */
  const resultsMayShow =
    generationPhase !== "generating" && generationPhase !== "succeeded";

  /** The entrance every post-generation screen shares, so they arrive the same way. */
  const arriving = "animate-in fade-in-0 slide-in-from-bottom-3 duration-500 ease-out";

  const leaveDialog = (
    <LeaveGenerationDialog
      isOpen={showLeaveDialog}
      onConfirm={() => onConfirmLeave?.()}
      onCancel={() => onCancelLeave?.()}
    />
  );

  // ── Screen 1: still fetching the lookups
  if (isLoadingEntities) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <BlobLoader size="lg" />
        {leaveDialog}
        {generatingOverlay}
      </div>
    );
  }

  // ── Screen 2: parsing succeeded, so the builder opens on its overview — the quiz to read
  // and publish as it is, with any question a tap away from its editor (docs/adr/0026-the-quiz-overview.md).
  // Nothing is saved until they act.
  //
  // No `lg:h-full` here any more: the overview is a page that scrolls, and a fixed height
  // would end its pinned bar partway down (the bar is sticky within this box).
  if (parseResult?.ok && resultsMayShow) {
    return (
      // The overview's own column. Back, the import report and the overview itself are all
      // rendered by the builder now (create-quiz.tsx → QuizOverview), so they can reach the
      // form — Back can save the quiz as a draft. `xl:max-w-none`: from `xl` the overview goes
      // two-column and sets its own width (docs/quiz/quiz-overview.md, "Wide screens").
      <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-3 xl:max-w-none", arriving)}>
        <div>{builderSlot}</div>
        {leaveDialog}
        {generatingOverlay}
      </div>
    );
  }

  // ── Screen 3: the wizard itself
  return (
    // `short:` steps throughout this screen: the whole form is meant to be answerable without
    // scrolling, and on a ~800px-tall laptop it wasn't. Spacing and type only — nothing is
    // hidden and no target shrinks below the 36px floor (docs/RESPONSIVE.md, "Short viewports").
    //
    // These were tightened a second time in the Aug 23 pass. The shell gave back 77px (the
    // header) plus a padding step, which left the Generate button 30px above the fold against
    // a 60px requirement — so the last 30 came from the chrome around the form: the heading
    // block, the card's internal rhythm, and the `Details` heading. The lead question
    // ("What's this quiz about?") was deliberately left alone: it is the one required
    // thing on the screen and its weight is what says so.
    //
    // `FitsTheFold` in the stories file is what holds this. If you need space here, take it
    // from spacing and type — ADR 0001 rules out taking it from the fields.
    // min-h-full + justify-center: centred in the dashboard's <main> (this is its direct child,
    // and <main> has a height), so a phone doesn't show the form at the top over half a screen
    // of empty page. When the form is taller than the screen it simply grows and scrolls.
    //
    // Centred on a phone only, where the form is shorter than the screen and would otherwise
    // sit on half a page of nothing. From `sm` up it starts at the top with a margin — on a
    // laptop or a large monitor a centred form floats mid-screen, a long way from the page's
    // edge it belongs to.
    //
    // `animate-in`: the form fades in when it appears — on arrival, and when Back on the
    // review returns here (docs/development/motion.md).
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center py-6 px-4 animate-in fade-in-0 duration-300 motion-reduce:animate-none sm:justify-start sm:pt-8 short:py-0 short:sm:pt-4">
      <header className="mb-6 short:mb-2">
        <div className="mb-5 flex items-center justify-between sm:mb-6 short:mb-1.5">
          <button
            onClick={() => navigate(quizzesPath)}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
          {/* Development only — for checking this screen in both themes without leaving it
              (the dashboard header that normally carries the toggle is hidden on this route).
              `import.meta.env.DEV` is false in a production build, so this is dropped there. */}
          {import.meta.env.DEV && <ModeToggle className="h-8 px-2.5" />}
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2 short:text-lg">
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
      {needsConfirmation && resultsMayShow ? (
        <div className={arriving}>
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
        </div>
      ) : sourceChoice && resultsMayShow && onAnswerSource ? (
        // Grounding needs one answer before it can go on. Same slot, same reason as the
        // confirm card above: the wizard pausing to ask for one thing, with nothing spent.
        <div className={arriving}>
          <SourceChoiceCard
            question={sourceChoice}
            topic={topic}
            busy={isGenerating}
            onPickLanguage={(language) => onAnswerSource({ sourceLanguage: language })}
            onPickArticle={(title) => onAnswerSource({ sourceTitle: title })}
            onDecline={() => onAnswerSource({ sourceDeclined: true })}
            onRetry={() => onAnswerSource({})}
            onWriteFromMemory={() => onAnswerSource({ sourceAcceptFromMemory: true })}
            onEditTopic={() => onDismissSourceChoice?.()}
          />
        </div>
      ) : (
        // No CardHeader: it existed to hold the mode tabs, and the tinted strip left behind
        // after they moved to the method dialog was a band of colour heading nothing. What
        // the card holds now is the whole of it — the question, the details that answer it,
        // and the button. Nothing on this screen is hidden behind a click any more: the
        // Advanced drawer became the visible `AdvancedOptions` form below.
        // The dashboard card (CLAUDE.md, "Inside a dashboard"): on the muted page a plain
        // hairline frame, not the primary one — the card needs an edge, not emphasis.
        <Card className="bg-card border border-border dark:border-foreground/30">
          <CardContent className="space-y-8 pt-6 short:space-y-6 short:pt-3">
            <div ref={inputRegion}>
              <GenerationInput
                mode={mode}
                topic={topic}
                onTopicChange={onTopicChange}
                sourceData={sourceData}
                onSourceDataChange={onSourceDataChange}
                // No upload while the mode is closed: the server would refuse the file anyway.
                onUploadFile={sourceModeClosed ? undefined : onUploadFile}
                isReadingFile={isReadingFile}
                sourceFile={sourceFile}
                uploadError={uploadError}
                disabled={isGenerating}
                error={showValidation ? (topicMessage ?? undefined) : undefined}
                // The same wrapper the button uses, so Enter cannot skip validation.
                onSubmit={runWhenValid(onGenerate)}
              />
            </div>

            <div ref={optionsRegion}>
              <AdvancedOptions
                questionCount={questionCount}
                onQuestionCountChange={onQuestionCountChange}
                allowedTypes={allowedTypes}
                onToggleType={onToggleType}
                typesError={showValidation ? (typesMessage ?? undefined) : undefined}
                extraInstructions={extraInstructions}
                onExtraInstructionsChange={onExtraInstructionsChange}
                addImages={addImages}
                onAddImagesChange={onAddImagesChange}
              />
            </div>

            {generateError && <GenerateErrorPanel error={generateError} />}

            {/* The row always renders. Generate goes *disabled* rather than missing when
                generation is unavailable (kill switch, quota spent, unverified email): a
                button that could only fail shouldn't be pressable, but removing it left the
                card with no visible primary action and nothing to explain the gap. The link
                below is the way through, and `title` carries the reason for a pointer user —
                the error panel above says it in full whenever the cause raised one. */}
            {/* Left cell carries every quiet line about *whether* you can generate —
                the allowance, the model, why the button is dead, and the way around it.
                They used to be stacked down the card with a `Separator` between; that
                cost ~40px of a screen whose primary action was already below the fold,
                to separate a footnote from the thing it footnotes.

                `min-w-0` on the cell and `shrink-0` on the button: flex shrink takes
                width out of an item's *content* box while its padding stays, so without
                these a long quota line squeezes the button's label instead of wrapping
                its own text (docs/RESPONSIVE.md, "Rows of buttons"). */}
            <div className="flex items-end justify-between gap-4 pt-1">
              <div className="min-w-0 space-y-1">
                <QuotaNote quota={quota} />

                {/* One way out, not three. "Create manually instead" left with the mode
                    tabs — that decision belongs to the method dialog, and repeating it
                    here is what made this card read as a menu. This one stays because it
                    isn't the same question: it's this exact job with someone else's
                    model, and it only becomes interesting once you're already looking at
                    the form.

                    It also has to stay for a hard reason. When the button beside it is
                    disabled (kill switch, quota spent, unverified email) there is
                    otherwise no way forward from this page except Back — so in that state
                    the link stops being quiet and takes the primary colour, with a line
                    above it saying why. Moving it into this row changed where it sits,
                    not that behaviour: see docs/quiz/ai-quiz-two-paths.md §2. */}
                {/* Since 2026-10-17 the link shows only in that blocked state. The rest of the
                    time it was an offer competing with Generate; when Generate is dead it is
                    the only way off this page, and the only entry to the own-AI page at all. */}
                {generationBlocked && (
                  <>
                    <p className="text-muted-foreground text-xs">
                      {sourceModeClosed
                        ? "Creating a quiz from your own material isn't available yet."
                        : "Generating in the app isn't available right now."}
                    </p>
                    {/* The own-AI page is topic-only; offering it in Source mode would drop the
                        material, so the way out there is the topic wizard. */}
                    {mode === "Source" ? (
                      topicPath && (
                        <Link
                          to={topicPath}
                          className="block text-sm font-medium text-primary hover:underline"
                        >
                          Create from a topic instead
                        </Link>
                      )
                    ) : (
                      <Link
                        to={ownAiPath}
                        className="block text-sm font-medium text-primary hover:underline"
                      >
                        Use your own AI instead (free)
                      </Link>
                    )}
                  </>
                )}
              </div>

              <WizardButton
                type="button"
                className="shrink-0"
                // Not while a file is being read: Generate would send the text it is about to replace.
                disabled={isGenerating || generationBlocked || isReadingFile}
                title={
                  sourceModeClosed
                    ? "Creating a quiz from your own material isn't available yet."
                    : generationBlocked
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
                      {/* "Generate quiz", not "Generate". The button sits in a row with a
                          quota note and a link to another generator, and the sparkle is
                          decoration — it names the vibe, not the object. Naming the noun
                          also survives the screen-reader case, where the icon says
                          nothing at all. */}
                      <Sparkles className="h-4 w-4" /> Generate quiz
                    </>
                  )}
                </span>
              </WizardButton>
            </div>

            {/* No "this takes 10-30 seconds" line here any more. It only rendered while
                `isGenerating`, which is exactly when `GeneratingOverlay` is covering this
                card — so it was written for a reader who could not see it. The overlay
                carries the same sentence, where it is actually on top. */}

          </CardContent>
        </Card>
      )}

      {leaveDialog}
      {generatingOverlay}
    </div>
  );
};

export default AiQuizWizardView;
