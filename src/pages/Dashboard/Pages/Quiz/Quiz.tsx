import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { LoadingWave } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/common/Notifications";
import { ContentLayout } from "@/layouts/individual-content-layout";
import type { QuizStatus } from "@/types/quiz-types";

import { useQuizData } from "./api/get-quiz";
import { useQuizQuestionsData } from "./api/get-quiz-questions";
import { useQuizAnalytics } from "./api/get-quiz-analytics";
import { useCreateShareLink, buildShareUrl } from "./api/create-share-link";
import { useSetQuizStatus } from "./api/set-quiz-status";
import { DeleteQuiz } from "./components/delete-quiz";
import { AttemptsChart } from "./components/quiz-view/attempts-chart";
import { QuestionPerformanceTable } from "./components/quiz-view/question-performance-table";
import { QuizActionsMenu } from "./components/quiz-view/quiz-actions-menu";
import { QuizStatStrip } from "./components/quiz-view/quiz-stat-strip";
import { QuizStatusBadge } from "./components/quiz-view/quiz-status-badge";
import { formatDuration } from "./components/quiz-view/format-duration";
import {
  MIN_ATTEMPTS_FOR_TREND,
  SIGNED_IN_ONLY_NOTE,
} from "./components/quiz-view/thresholds";

/**
 * One quiz, as one page.
 *
 * <b>The three tabs are gone</b> (Overview / Questions / Analytics). They split one question —
 * "is this quiz any good, and which part of it isn't?" — across three screens, and listed the
 * same ten questions twice: content under Questions, performance under Analytics. Answering
 * anything meant holding a number from one tab in your head while reading text in another. The
 * page now runs top to bottom: what the quiz is, how it has done, then every question with its
 * own numbers attached.
 *
 * <b>The `QuizProperties` grid is gone with them.</b> It was a key-value block of ID, category,
 * time limit, created-at, language, difficulty, feedback and status — every one of which now
 * appears in the hero meta line or the footer, next to something that gives it meaning. Keeping
 * it would have been the same facts twice.
 *
 * Analytics are owner-scoped on the backend, and admins now get a bypass — but the query can
 * still fail, so every consumer of it here treats absence as "not available" and renders the
 * page without it rather than blocking on it. A quiz with no plays is the normal case.
 *
 * See docs/proposals/quiz-view-redesign.md for what was deliberately not built: per-option
 * answer counts, the insights column, the range toggle and the time-of-day view all need
 * analytics data that does not exist yet, and a plausible-looking number invented here would be
 * worse than an absent one.
 */
export const QuizRoute = () => {
  const params = useParams();
  const quizId = Number(params.quizId as string);
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const quizQuery = useQuizData({ quizId });
  const questionsQuery = useQuizQuestionsData({ quizId });
  const analyticsQuery = useQuizAnalytics({ quizId });
  const shareLink = useCreateShareLink();
  const setStatus = useSetQuizStatus();

  // Owned here rather than by the menu item, so the confirm dialog outlives the menu closing.
  const [deleteOpen, setDeleteOpen] = useState(false);

  /**
   * Publish / unpublish. The caller picks the target, because `quiz` (and so the current
   * status) is only in scope after the loading and error branches below — deciding it here
   * would mean closing over a binding declared further down the function.
   *
   * No confirmation step: it is one click to undo, and the status is stated right above the
   * title, so the result is visible the moment it happens.
   *
   * <b>Failure is not handled here.</b> Going Public legitimately 400s when the quiz still
   * carries an "Unspecified" category, language or difficulty, and the API answers with a
   * message naming exactly which — the shared axios interceptor already surfaces that. Adding
   * a second toast here would say the same thing twice, and a generic one would say less than
   * the API already does (see the same reasoning in ai-quiz-wizard.tsx).
   */
  const handleSetStatus = (next: QuizStatus) => () => {
    setStatus.mutate(
      { quizId, status: next },
      {
        onSuccess: () =>
          addNotification({
            type: "success",
            title: next === "Public" ? "Quiz published" : "Quiz moved back to draft",
          }),
      }
    );
  };

  const handleShare = () => {
    shareLink.mutate(quizId, {
      onSuccess: async ({ shareToken }) => {
        const url = buildShareUrl(shareToken);
        try {
          await navigator.clipboard.writeText(url);
          addNotification({ type: "success", title: "Share link copied to clipboard" });
        } catch {
          // Clipboard can be blocked (e.g. insecure context) — still surface the link.
          addNotification({ type: "success", title: "Share link ready", message: url });
        }
      },
      onError: () =>
        addNotification({ type: "error", title: "Couldn't create share link" }),
    });
  };

  if (quizQuery.isLoading) {
    // `LoadingWave` is the app's loader now; `Spinner` is what this page was written against
    // before that. The word carries the message, so the "Loading quiz..." line underneath is
    // gone with it — it was saying the same thing twice.
    return (
      <div className="w-full h-full flex items-center justify-center py-16">
        <LoadingWave size="lg" variant="muted" />
      </div>
    );
  }

  if (quizQuery.isError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">Failed to load quiz</p>
          <Button variant="outline" onClick={() => quizQuery.refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const quiz = quizQuery.data;
  if (!quiz) return null;

  const analytics = analyticsQuery.data;
  const isDraft = quiz.status === "Draft";

  return (
    // <b>The card is the width of what is in it.</b> Constraining the inner content box was
    // half a fix: the card still spanned the viewport, so the content sat centred inside a
    // frame with a wide empty band down each side. The measure now applies to the card, so the
    // border tracks the content instead of the window.
    //
    // Two measures, because the page has two shapes. Stacked (below `xl`) the widest element is
    // the six-column question row and `max-w-5xl` is right. Split into columns (from `xl`) the
    // page needs room for both at once, so it opens out to `max-w-7xl` — which is still a
    // measure, not full-bleed: past ~1280px more width only stretches the question rows.
    //
    // <b>No card title.</b> It read "Quiz #37": a database id, above an <h1> that already
    // carries the quiz's name. Nobody looking at a quiz needs its primary key, and two
    // headings for one page is one too many. `ContentLayout` drops the header bar entirely
    // when no title is passed.
    <ContentLayout className="mx-auto max-w-5xl xl:max-w-7xl">
      {/* Controlled, and rendered outside the menu on purpose (see `DeleteQuiz`). */}
      <DeleteQuiz
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        // Defer navigation one tick so the dialog can close and Radix can restore
        // <body> pointer-events before this page unmounts.
        finished={() => setTimeout(() => navigate("/dashboard/quizzes"), 0)}
        id={quiz.id}
      />

      {/* <b>Two columns from `xl` up: what the quiz IS on the left, what its questions DID on
          the right.</b> Stacked, a 15-question quiz pushes the whole left-hand story — title,
          description, the five numbers, the attempts chart — off the top of the screen the
          moment you start reading the questions, so the two halves of the job can never be
          held together. Side by side you keep the context while you scan.

          A fixed 22rem for the left column rather than a fraction: it holds a stat-tile pair
          and a chart, both of which have a natural size, and letting it grow with the viewport
          would only stretch them. Everything left over goes to the question rows, which are
          the part that actually wants width. Below `xl` this collapses to one column and the
          order is the reading order. */}
      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)] xl:gap-10">
        {/* ── Left: what this quiz is, and how it has done overall. */}
        <div className="min-w-0 space-y-6">
          {/* ── Hero. The description was buried under a tab; it is the one
              piece of prose the author wrote about their own quiz and it belongs at the top. */}
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <QuizStatusBadge status={quiz.status} />
              <span className="text-sm text-muted-foreground">
                {quiz.category.name} · {quiz.difficulty.level} · {quiz.language.language}
              </span>
            </div>

            {/* <b>Every action is in the ⋯ menu, and the menu sits on the title row.</b>
              This was a toolbar of three buttons in the top-right plus a fourth for the
              overflow — four controls occupying a full-width strip above a page whose own
              heading came second. The data-table rows already answer this with one 32px ⋯
              button and a labelled menu, so the same pattern here means one thing to learn
              instead of two.

              On the title row rather than back in the corner: the affordance now sits on the
              thing it acts on, and a single small button alone in the top-right of a wide
              card reads as something left behind. From `xl` the title is in the 22rem column
              and the menu rides along with it. */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="min-w-0 text-3xl font-bold">{quiz.title}</h1>
              <QuizActionsMenu
                quiz={quiz}
                isDraft={isDraft}
                onShare={handleShare}
                isSharePending={shareLink.isPending}
                onSetStatus={handleSetStatus(isDraft ? "Public" : "Draft")}
                isStatusPending={setStatus.isPending}
                onEdit={() => navigate(`/dashboard/quizzes/edit-quiz/${quiz.id}`)}
                onDelete={() => setDeleteOpen(true)}
              />
            </div>

            {quiz.description && (
              <p className="max-w-3xl leading-relaxed text-muted-foreground">
                {quiz.description}
              </p>
            )}

            {/* The facts the old properties grid carried, on one line, where each sits next to
                something that gives it context.

                Three fixes here, all of the same kind — the line was printing storage values
                rather than reading as a sentence:
                • `490s limit` is a field value, not a duration anyone parses. `formatDuration`
                  turns it into `8m 10s`. It is the quiz-wide limit, so it belongs in minutes;
                  the per-question limits in the expanded rows use the same function.
                • `Instant feedback on` reads as a setting name with a state appended — the kind
                  of label that belongs in a settings form, not in a description of the quiz.
                  "Answers checked as you go" says what the player experiences, which is what a
                  reader of this line is trying to picture.
                • "Created" was here *and* in the footer, in the same format, on the same screen.
                  It is kept here, beside the rest of what the quiz is, and dropped from the
                  footer, which now carries only the identifiers. */}
            <p className="text-sm text-muted-foreground">
              {quiz.questionCount} questions
              {quiz.timeLimitInSeconds > 0 && (
                <> · {formatDuration(quiz.timeLimitInSeconds)} limit</>
              )}
              {quiz.showFeedbackImmediately && <> · Answers checked as you go</>}
              {quiz.shuffleQuestions && <> · Shuffled</>}
              {" · Created "}
              {new Date(quiz.createdAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </header>

          <Separator />

          {/* ── How it has done. Absent rather than zeroed when analytics can't be read: a quiz
              that has never been played and a quiz whose stats we failed to fetch are different
              things, and showing "0 attempts" for the second one is a lie. */}
          <section className="space-y-4">
            {analyticsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingWave size="md" variant="muted" />
              </div>
            ) : !analytics ? (
              <p className="text-sm text-muted-foreground">
                Analytics aren&apos;t available for this quiz.
              </p>
            ) : analytics.attempts === 0 ? (
              <p className="text-sm text-muted-foreground">
                No plays yet — the numbers appear once someone takes this quiz.{" "}
                {SIGNED_IN_ONLY_NOTE}
              </p>
            ) : (
              /* <b>Two columns from `lg` up, one below.</b> Stacked, these two blocks left a
                 full-width strip of tiles above a full-width panel holding three lines of text —
                 a lot of vertical travel for very little, and the reason the card felt oversized
                 even once its width was fixed. Side by side they read as one answer to one
                 question: how much play, and when.

                 The stat tiles switch to a 2-wide grid (see `QuizStatStrip`'s `columns` prop)
                 because five tiles in a row do not fit half a card.

                 `xl:grid-cols-1` un-does the split again: from `xl` this whole block is already
                 inside the 22rem left-hand column, and two columns inside one narrow column is
                 how you get a chart 150px wide. */
              <div className="grid gap-4 lg:grid-cols-2 lg:items-start xl:grid-cols-1">
                <QuizStatStrip analytics={analytics} columns="two" />
                <div className="rounded-lg border border-border p-4">
                  {/* The heading follows the representation. Below the trend threshold the panel
                      is a list of the days that had plays, and calling that "over time" promises
                      a shape it deliberately isn't drawing. */}
                  <h2 className="mb-2 text-sm font-medium">
                    {analytics.attempts < MIN_ATTEMPTS_FOR_TREND
                      ? "Recent attempts"
                      : "Attempts over time"}
                  </h2>
                  <AttemptsChart
                    points={analytics.attemptsOverTime}
                    totalAttempts={analytics.attempts}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right: every question, with its numbers on the same row.
            The separator only earns its place in the stacked layout — from `xl` the column gap
            already does the dividing, and a horizontal rule across one column of two reads as
            a mistake. */}
        <div className="min-w-0">
          <Separator className="mb-6 xl:hidden" />
          <section className="pb-6">
            {questionsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingWave size="md" variant="muted" />
              </div>
            ) : (
              <QuestionPerformanceTable
                questions={questionsQuery.data ?? []}
                analytics={analytics?.questions ?? []}
              />
            )}
          </section>
        </div>
      </div>

      <Separator />

      {/* ── Footer.
          <b>Delete has moved out of here.</b> It used to float loose at the bottom of the page
          as a red lifted button with nothing around it — the largest, loudest control on the
          screen, in the one place where nothing else competed for attention, reachable by
          scrolling to the end and clicking once. It now sits in the overflow menu beside the
          other actions: destructive, marked as such, and two deliberate clicks away.

          <b>The quiz id has gone too.</b> It is a primary key; it means something to a query
          and nothing to the person reading the page. Version stays — it is a fact about the
          quiz's own history (every edit retires rows and bumps it, see
          docs/quiz/quiz-editing.md) and it explains why an old session can be playing
          different questions from the ones listed above. */}
      <footer className="py-6">
        <p className="text-xs text-muted-foreground">Version {quiz.version}</p>
      </footer>
    </ContentLayout>
  );
};

export default QuizRoute;
