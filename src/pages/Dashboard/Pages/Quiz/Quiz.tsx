import { useParams, useNavigate } from "react-router";
import { Edit2, EyeOff, Eye, Share2 } from "lucide-react";

import { Spinner } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { ContentLayout } from "@/layouts/individual-content-layout";
import type { QuizStatus } from "@/types/quiz-types";

import { useQuizData } from "./api/get-quiz";
import { useQuizQuestionsData } from "./api/get-quiz-questions";
import { useQuizAnalytics } from "./api/get-quiz-analytics";
import { useCreateShareLink, buildShareUrl } from "./api/create-share-link";
import { useSetQuizStatus } from "./api/set-quiz-status";
import { DeleteQuiz } from "./components/delete-quiz";
import { IconButtonWithTooltip } from "../Question/Components/Re-Usable-Components/icon-button-with-tooltip";
import { AttemptsChart } from "./components/quiz-view/attempts-chart";
import { QuestionPerformanceTable } from "./components/quiz-view/question-performance-table";
import { QuizStatStrip } from "./components/quiz-view/quiz-stat-strip";
import { SIGNED_IN_ONLY_NOTE } from "./components/quiz-view/thresholds";

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
/**
 * The non-primary face for this page's action row. A background-coloured front with a
 * foreground-tinted edge, so a quiet button still reads as the same *kind* of object as the
 * primary one beside it rather than as a flat link.
 *
 * A constant rather than repeated inline, because two buttons wear it and a row whose members
 * drift apart is the problem this row already had once.
 */
const QUIET_FACE =
  "bg-background hover:bg-muted text-foreground border border-foreground/20";

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
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
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
    <ContentLayout title={`Quiz #${quiz.id}`}>
      {/* ── Actions, at the top. They used to sit under the tabs, which put the primary
          actions for the page below everything on it. Delete is not here: it lives in the
          footer, away from the controls people press often. */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        {/* One family, one size, three weights.

            These were three different kinds of button: a flat 32px shadcn outline for Share
            beside two ~40px lifted ones, which made Share read as a control from a different
            screen rather than the quietest of three actions. They are now all `LiftedButton`
            at `size="sm"`, and *colour* carries the hierarchy instead of size — Edit is the
            primary face, Share and Publish share the quiet one. Nothing here is a page-level
            primary action of the kind the default face is for: this is a toolbar. */}

        {/* Not on a Draft: the backend mints a token its own resolver 404s, so sharing one
            could only produce a link that fails at the recipient's end. */}
        {!isDraft && (
          <LiftedButton
            size="sm"
            onClick={handleShare}
            isPending={shareLink.isPending}
            className={QUIET_FACE}
            backgroundColorForBorder="bg-foreground/50"
            liftColor="foreground">
            <Share2 className="h-4 w-4" />
            {quiz.status === "Unlisted" ? "Copy share link" : "Share"}
          </LiftedButton>
        )}

        {/* Now wired. The endpoint has been complete and tested since the visibility work;
            only this mutation was missing, which is why the button shipped disabled with a
            "Feature not implemented" tooltip for as long as it did. */}
        <IconButtonWithTooltip
          variant="default"
          size="sm"
          iconPosition="start"
          tooltip={
            isDraft
              ? "Make this quiz public so anyone can find and play it"
              : "Return this quiz to draft — only you will see it"
          }
          icon={isDraft ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          buttonText={isDraft ? "Publish" : "Unpublish"}
          className={QUIET_FACE}
          backgroundColorForBorder="bg-foreground/50"
          liftColor="foreground"
          isPending={setStatus.isPending}
          onClick={handleSetStatus(isDraft ? "Public" : "Draft")}
        />

        <LiftedButton
          size="sm"
          onClick={() => navigate(`/dashboard/quizzes/edit-quiz/${quiz.id}`)}>
          <Edit2 className="h-4 w-4" />
          Edit Quiz
        </LiftedButton>

        {/* The phone equivalent of the row above, minus what already fits. */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigate(`/dashboard/quizzes/edit-quiz/${quiz.id}`)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Quiz
              </DropdownMenuItem>
              {!isDraft && (
                <DropdownMenuItem onClick={handleShare} disabled={shareLink.isPending}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Hero: what this quiz is. The description was buried under a tab; it is the one
          piece of prose the author wrote about their own quiz and it belongs at the top. */}
      <header className="space-y-3 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={isDraft ? "secondary" : "default"}
            className={!isDraft ? "bg-green-500 text-white" : ""}>
            {quiz.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {quiz.category.name} · {quiz.difficulty.level} · {quiz.language.language}
          </span>
        </div>

        <h1 className="text-3xl font-bold">{quiz.title}</h1>

        {quiz.description && (
          <p className="max-w-3xl leading-relaxed text-muted-foreground">
            {quiz.description}
          </p>
        )}

        {/* The facts the old properties grid carried, on one line, where each sits next to
            something that gives it context. */}
        <p className="text-sm text-muted-foreground">
          {quiz.questionCount} questions
          {quiz.timeLimitInSeconds > 0 && <> · {quiz.timeLimitInSeconds}s limit</>}
          {quiz.showFeedbackImmediately && <> · Instant feedback on</>}
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
      <section className="space-y-4 py-6">
        {analyticsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
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
          <>
            <QuizStatStrip analytics={analytics} />
            <div className="rounded-lg border border-border p-4">
              <h2 className="mb-2 text-sm font-medium">Attempts over time</h2>
              <AttemptsChart
                points={analytics.attemptsOverTime}
                totalAttempts={analytics.attempts}
              />
            </div>
          </>
        )}
      </section>

      <Separator />

      {/* ── Every question, with its numbers on the same row. */}
      <section className="py-6">
        {questionsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <QuestionPerformanceTable
            questions={questionsQuery.data ?? []}
            analytics={analytics?.questions ?? []}
          />
        )}
      </section>

      <Separator />

      {/* ── Footer: the identifiers nobody needs while working, and the action nobody should
          reach for by accident. */}
      <footer className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Quiz ID {quiz.id} · Version {quiz.version} · Created{" "}
          {new Date(quiz.createdAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>

        <DeleteQuiz
          useLiftedButton
          size="sm"
          className="w-fit bg-red-500 hover:bg-red-600"
          // Defer navigation one tick so the dialog can close and Radix can restore
          // <body> pointer-events before this page unmounts.
          finished={() => setTimeout(() => navigate("/dashboard/quizzes"), 0)}
          id={quiz.id}
        />
      </footer>
    </ContentLayout>
  );
};

export default QuizRoute;
