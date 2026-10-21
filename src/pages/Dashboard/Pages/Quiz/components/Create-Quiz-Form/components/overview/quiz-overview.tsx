import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertTriangle, Check, Plus, SlidersHorizontal, Undo2 } from "lucide-react";
import type { FieldErrors } from "react-hook-form";

import { LiftedButton } from "@/common/LiftedButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/form";
import { Switch } from "@/components/ui";
import type { QuizStatus } from "@/types/quiz-types";
import { cn } from "@/utils/cn";

import type { CreateQuizInput } from "../../../../api/create-quiz";
import { QuizStatusBadge } from "../../../quiz-view/quiz-status-badge";
import { useQuiz } from "../../Quiz-questions-context";
import type { QueryData } from "../../types";
import { AddQuestionMenu } from "../add-question-menu";
import {
  QuizDetailsFields,
  type QuizDetailsFieldsProps,
} from "../quiz-details-fields";
import { QuestionEditorDialog } from "./question-editor-dialog";
import { QuestionReviewCard } from "./question-review-card";
import { ReviewBackButton } from "./review-back-button";
import { useDragReorder } from "./use-drag-reorder";
import { useMasonry } from "./use-masonry";
import { useMediaQuery } from "@/hooks/use-media-query";

/** Tailwind's `xl` — where the overview goes two-column with a masonry of questions. */
const WIDE_QUERY = "(min-width: 1280px)";

/** The quiz-level fields whose errors the summary card has to surface — they live in a dialog. */
const QUIZ_FIELD_LABELS: Partial<Record<keyof CreateQuizInput, string>> = {
  title: "Title",
  description: "Description",
  categoryId: "Category",
  difficultyId: "Difficulty",
  languageId: "Language",
  status: "Status",
};

/** Per-viewer, per-flow memory of the "Show answers" switch. Browser storage can throw or be empty. */
const showAnswersKey = (flow: "ai" | "build") =>
  `oq:quiz-overview:show-answers:${flow}`;
const readShowAnswers = (flow: "ai" | "build", fallback: boolean): boolean => {
  try {
    const stored = window.localStorage.getItem(showAnswersKey(flow));
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
};
const writeShowAnswers = (flow: "ai" | "build", value: boolean) => {
  try {
    window.localStorage.setItem(showAnswersKey(flow), String(value));
  } catch {
    // A convenience only — the switch still works for this visit.
  }
};

export interface QuizOverviewProps extends Omit<
  QuizDetailsFieldsProps,
  "queryData"
> {
  queryData: Pick<QueryData, "categories" | "difficulties" | "languages">;
  /**
   * The AI flow opens with answers hidden — the author may be making the quiz to take it
   * themselves. Writing one by hand, you already know them.
   */
  flow: "ai" | "build";
  /** Lifted to the builder so a failed submit can open the question that needs fixing. */
  editingQuestionId: number | null;
  onEditingQuestionChange: (id: number | null) => void;
  /** Lifted too: a failed classification check opens it. */
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  /** The primary action, rendered by the builder — it owns the submit state and label. */
  submitButton: ReactNode;
  /** Under the bar: the manual flow's "Draft saved" line. */
  footnote?: ReactNode;
  /** Bumps on every submit attempt, so a failed one can bring the summary's errors into view. */
  submitCount: number;
  /** The builder's `<form>` id, for buttons rendered outside it (dialogs are portalled). */
  formId: string;
  /** AI review only: the Back button (asks first; can save as a draft instead). */
  reviewBack?: { onDiscard: () => void; costsAGeneration: boolean };
  /** AI review only: the import report, shown under Back (ImportNotices). */
  notices?: ReactNode;
}

/**
 * The quiz as a reading list: what it is, then every question in order, then one bar to act on
 * it. Phones get it for building and editing; the AI flow gets it on every screen, because
 * reviewing a generated quiz is reading down a list and fixing the odd question — and quite
 * often fixing nothing at all (docs/adr/0026-the-quiz-overview.md, docs/quiz/quiz-overview.md).
 *
 * Editing is never inline. A question opens in `QuestionEditorDialog`; the quiz's own fields
 * open in a dialog of their own. The list stays a list.
 */
export const QuizOverview = ({
  flow,
  editingQuestionId,
  onEditingQuestionChange,
  detailsOpen,
  onDetailsOpenChange,
  submitButton,
  footnote,
  submitCount,
  queryData,
  formId,
  reviewBack,
  notices,
  ...fields
}: QuizOverviewProps) => {
  const {
    addedQuestions,
    reorderQuestions,
    getQuestionErrors,
    setDisplayQuestion,
    requestRemoveQuestion,
    lastRemoval,
    removalCount,
    undoLastRemoval,
  } = useQuiz();
  const { watch, errors } = fields;

  const [showAnswers, setShowAnswers] = useState(() =>
    readShowAnswers(flow, flow === "build"),
  );
  const [revealedIds, setRevealedIds] = useState<Set<number>>(() => new Set());

  const toggleShowAnswers = (value: boolean) => {
    setShowAnswers(value);
    writeShowAnswers(flow, value);
    // Turning "Show answers" off hides everything again, including cards revealed one by one.
    if (!value) setRevealedIds(new Set());
  };

  const toggleReveal = (id: number) =>
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── Remove, with Undo ────────────────────────────────────────────────────────────────
  // Confirmed first, then undoable — the stack lives in the question context so the desktop
  // builder and this screen share it (question-history.ts). Undo stays offered until the quiz is
  // saved, walking removals back one at a time, each to where it was.
  const removeQuestion = (id: number) =>
    requestRemoveQuestion(id, () =>
      setRevealedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    );

  // ── Reordering ── drag by the grip, with edge auto-scroll (use-drag-reorder.ts).
  const {
    listRef,
    itemRef,
    handleProps,
    positionedId,
    liftedId,
    dragX,
    dragY,
  } = useDragReorder({
    items: addedQuestions,
    getId: (q) => q.id,
    onReorder: reorderQuestions,
  });

  // ── Wide screens ── a masonry of compact cards from `xl` (use-masonry.ts). Below it the list
  // is a plain column and the masonry is off.
  const isWide = useMediaQuery(WIDE_QUERY);
  const masonry = useMasonry({
    listRef,
    ids: addedQuestions.map((q) => q.id),
    enabled: isWide,
    minColumnWidth: 240,
    gap: 12,
  });

  const openEditor = (id: number) => {
    const question = addedQuestions.find((q) => q.id === id);
    if (question) setDisplayQuestion(question);
    onEditingQuestionChange(id);
  };

  // A failed submit whose problem is a quiz field — fields that live behind "Edit details" —
  // scrolls the summary into view, where the errors are listed. The submit button is at the
  // bottom of a long list; without this the press seems to do nothing. A DOM effect, keyed on
  // the attempt rather than on the errors, so it fires once per press.
  const summaryRef = useRef<HTMLElement>(null);
  const quizFieldErrors = Object.entries(QUIZ_FIELD_LABELS).filter(
    ([key]) => errors[key as keyof FieldErrors<CreateQuizInput>],
  );
  const hasQuizFieldErrors = quizFieldErrors.length > 0;
  useEffect(() => {
    if (submitCount > 0 && hasQuizFieldErrors) {
      summaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    // Only a new attempt should scroll — not every edit that changes the error set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  const title = watch("title")?.trim();
  const description = watch("description")?.trim();
  const status = (watch("status") ?? "Draft") as QuizStatus;
  const categoryName = queryData.categories.find(
    (c) => c.id === watch("categoryId"),
  )?.name;
  const difficultyName = queryData.difficulties.find(
    (d) => d.id === watch("difficultyId"),
  )?.level;
  const languageName = queryData.languages.find(
    (l) => l.id === watch("languageId"),
  )?.language;

  return (
    // reducedMotion="user": every framer animation below drops its movement for a user who
    // asked for less, keeping only opacity (docs/development/motion.md, "Reduced motion").
    <MotionConfig reducedMotion="user">
      {/* One column up to `xl`. From there a page this narrow left most of a wide screen empty
          down both sides, so it becomes two: the quiz on the left, held in view as the
          questions scroll past it, and the questions on the right as a masonry — as many
          columns as fit, so a bigger screen shows more of the quiz at once
          (docs/quiz/quiz-overview.md, "Wide screens"). Back and the notices span both columns,
          so the two cards start on the same line. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 xl:grid xl:max-w-[92rem] xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
        {reviewBack && (
          <div className="xl:col-span-2">
            <ReviewBackButton
              formId={formId}
              costsAGeneration={reviewBack.costsAGeneration}
              onDiscard={reviewBack.onDiscard}
              onSaveDraft={() => fields.setValue("status", "Draft")}
            />
          </div>
        )}
        {/* empty:hidden — the notices often render nothing, and an empty grid row still
            costs a gap. */}
        <div className="empty:hidden xl:col-span-2">{notices}</div>

        <div className="flex flex-col gap-5 xl:sticky xl:top-0">
          {/* ── The quiz ─────────────────────────────────────────────────────────── */}
          <section
            ref={summaryRef}
            aria-label="Quiz details"
            className={cn(
              "scroll-mt-4 rounded-lg border bg-card p-4 transition-colors duration-200 sm:p-5",
              hasQuizFieldErrors
                ? "border-destructive/70"
                : "border-border dark:border-foreground/30",
            )}
          >
            {/* Every value under its own label — the same names the details form uses — so
              nothing is left to guess: a bare "Test" or "Hard" pill said nothing about what
              it was a value *of*. */}
            <div className="flex items-start justify-between gap-3">
              <SummaryField label="Title" className="min-w-0">
                <span className="break-words text-lg font-semibold leading-snug">
                  {title || (
                    <span className="italic text-muted-foreground">
                      Untitled quiz
                    </span>
                  )}
                </span>
              </SummaryField>
              {/* Small, in the default lifted colour: someone looking for it finds it at once, and
                at this size it doesn't compete with the quiz itself for attention. */}
              <LiftedButton
                type="button"
                size="sm"
                onClick={() => onDetailsOpenChange(true)}
                outerClassName="shrink-0"
                className="flex items-center gap-1.5 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Edit details
              </LiftedButton>
            </div>

            {description && (
              <SummaryField label="Description" className="mt-3">
                <span className="line-clamp-3 break-words text-sm">
                  {description}
                </span>
              </SummaryField>
            )}

            {/* Three across while the summary spans the page; two in the narrow left column. */}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 xl:grid-cols-2">
              <SummaryField label="Status" as="dl-item">
                <QuizStatusBadge status={status} />
              </SummaryField>
              <SummaryField label="Category" as="dl-item" title={categoryName}>
                {categoryName ?? <NotSet />}
              </SummaryField>
              <SummaryField
                label="Difficulty"
                as="dl-item"
                title={difficultyName}
              >
                {difficultyName ?? <NotSet />}
              </SummaryField>
              <SummaryField label="Language" as="dl-item" title={languageName}>
                {languageName ?? <NotSet />}
              </SummaryField>
              <SummaryField label="Instant feedback" as="dl-item">
                {watch("showFeedbackImmediately") ? "On" : "Off"}
              </SummaryField>
              <SummaryField label="Shuffle questions" as="dl-item">
                {watch("shuffleQuestions") ? "On" : "Off"}
              </SummaryField>
            </dl>

            <AnimatePresence initial={false}>
              {hasQuizFieldErrors && (
                <motion.div
                  key="quiz-errors"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-3 space-y-1">
                    {quizFieldErrors.map(([key, label]) => (
                      <li
                        key={key}
                        className="flex items-center gap-1.5 text-xs text-destructive"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {label}:{" "}
                        {String(
                          errors[key as keyof FieldErrors<CreateQuizInput>]
                            ?.message ?? "needs a value",
                        )}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* ── The questions ────────────────────────────────────────────────────── */}
        {/* One card for the questions and the bar that acts on them (CLAUDE.md, "Inside a
            dashboard"): the list reads as one thing, and the bar is its footer rather than a
            separate floating panel. No overflow-hidden — that would break the bar's sticky. */}
        <section
          aria-label="Questions"
          className="flex flex-col gap-3 rounded-lg border border-border bg-card px-3 pt-4 sm:px-4 dark:border-foreground/30"
        >
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-base font-semibold text-foreground">
              Questions{" "}
              <span className="font-normal text-muted-foreground">
                ({addedQuestions.length})
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="overview-show-answers"
                className="text-sm font-medium text-muted-foreground"
              >
                Show answers
              </Label>
              <Switch
                id="overview-show-answers"
                checked={showAnswers}
                onCheckedChange={toggleShowAnswers}
              />
            </div>
          </div>

          {addedQuestions.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-12 text-center dark:border-foreground/30">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-foreground/20 text-muted-foreground">
                <Plus className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No questions yet
              </p>
              <p className="mt-1 max-w-[18rem] text-xs text-muted-foreground">
                Use “Add a question” below to browse the pool or write a new
                one.
              </p>
            </div>
          ) : (
            <ol
              ref={listRef as React.RefObject<HTMLOListElement>}
              // relative: the items measure their offsets against the list. From `xl` the
              // masonry places every card absolutely, so the list takes its height from it.
              className="relative flex flex-col gap-3"
              style={masonry ? { height: masonry.height } : undefined}
            >
              <AnimatePresence initial={false}>
                {addedQuestions.map((question, i) => (
                  <QuestionReviewCard
                    key={question.id}
                    question={question}
                    number={i + 1}
                    revealed={showAnswers || revealedIds.has(question.id)}
                    onToggleReveal={
                      showAnswers ? undefined : () => toggleReveal(question.id)
                    }
                    onEdit={() => openEditor(question.id)}
                    onRemove={() => removeQuestion(question.id)}
                    itemRef={itemRef(question.id)}
                    handleProps={handleProps(question.id)}
                    isDragging={liftedId === question.id}
                    isPositioned={positionedId === question.id}
                    dragX={dragX}
                    dragY={dragY}
                    slot={masonry?.slots.get(question.id)}
                    hasErrors={getQuestionErrors(question.id).length > 0}
                  />
                ))}
              </AnimatePresence>
            </ol>
          )}

          {/* ── The bar ── the card's footer, pinned to the bottom of the scrolling page so
              the way out is always under the thumb rather than past the last question.

              The sticky box sits at *minus* the page's padding (-bottom-4 for p-4, and so on per
              breakpoint): Chrome pins a sticky element inside the scroll container's padding,
              so plain bottom-0 left a strip of page showing under it. -mx undoes the card's
              own side padding so the bar spans the card edge to edge. */}
          {/* From `xl` it stops at the page's own padding instead (bottom-0), so the card ends
              above the bottom of the screen like it starts below the top: the bar draws the
              card's sides and bottom edge itself (-mx and border over the section's border),
              and an `after:` strip of page colour under it hides the questions scrolling
              through that padding. */}
          <div className="sticky -bottom-4 z-20 -mx-3 rounded-b-lg border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:-bottom-6 sm:-mx-4 sm:px-4 lg:-bottom-8 short:-bottom-4 dark:border-foreground/30 xl:bottom-0 xl:-mx-[calc(1rem+1px)] xl:-mb-px xl:border-x xl:border-b xl:px-[calc(1rem+1px)] xl:after:absolute xl:after:-inset-x-px xl:after:top-[calc(100%+1px)] xl:after:h-10 xl:after:bg-muted xl:after:content-['']">
            <AnimatePresence initial={false}>
              {lastRemoval && (
                <motion.div
                  key="undo"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    role="status"
                    className="mb-2.5 flex items-center justify-between gap-3 border-b border-border pb-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">
                      Question {lastRemoval.index + 1} removed.
                      {removalCount > 1 && <> {removalCount} removals to undo.</>}
                    </span>
                    <button
                      type="button"
                      onClick={undoLastRemoval}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 font-semibold text-primary hover:bg-primary/10"
                    >
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Sized to their labels (size="sm") and centred: two full-width lifted slabs read
                as heavier than anything they sit under. Add first, the way forward second. */}
            <div className="flex items-center justify-center gap-3">
              <AddQuestionMenu
                variant="secondary"
                side="top"
                onCreated={(question) => openEditor(question.id)}
              />
              {submitButton}
            </div>
            {footnote && <div className="mt-1.5 text-center">{footnote}</div>}
          </div>
        </section>
      </div>

      <QuestionEditorDialog
        questionId={editingQuestionId}
        onQuestionChange={(id) =>
          id === null ? onEditingQuestionChange(null) : openEditor(id)
        }
      />

      <Dialog open={detailsOpen} onOpenChange={onDetailsOpenChange}>
        <DialogContent
          className="flex max-w-lg flex-col gap-0 overflow-hidden p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex-none border-b border-border px-4 py-3 pr-12">
            <DialogTitle className="text-base font-semibold">
              Quiz details
            </DialogTitle>
            <DialogDescription className="sr-only">
              The quiz's title, classification, status and options. Changes
              apply as you edit.
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            <QuizDetailsFields queryData={queryData} {...fields} />
          </div>
          <div className="flex flex-none justify-end border-t border-border px-4 py-3">
            <LiftedButton
              type="button"
              onClick={() => onDetailsOpenChange(false)}
              className="flex items-center gap-2 px-6"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Done
            </LiftedButton>
          </div>
        </DialogContent>
      </Dialog>
    </MotionConfig>
  );
};

/**
 * A small muted label over its value. `dl-item` renders the dt/dd pair for the details grid.
 *
 * A grid value is cut to one line with an ellipsis (the grid is two narrow columns on a wide
 * screen), so `title` carries the full text for hover — "General Knowled…" names nothing.
 */
const SummaryField = ({
  label,
  children,
  className,
  as = "block",
  title,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  as?: "block" | "dl-item";
  title?: string;
}) =>
  as === "dl-item" ? (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        title={title}
        className="mt-0.5 truncate text-sm font-medium text-foreground"
      >
        {children}
      </dd>
    </div>
  ) : (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );

const NotSet = () => <span className="text-muted-foreground">Not set</span>;
