import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { QuestionType, type AnyQuestion } from "@/types/question-types";
import type { QuizQuestionAnalyticsRow } from "@/types/analytics-types";

import { MIN_ANSWERS_FOR_RATE, needsALook } from "./thresholds";

/**
 * One question, with its content and its performance in the same row.
 *
 * These were two separate lists — the Questions tab showed what the question *is*, the Analytics
 * tab showed how it *did*, and the ten rows were the same ten questions in both. Answering
 * "which question is badly worded" meant holding a number from one tab in your head while
 * reading text in the other.
 *
 * The join is on `questionId`. Analytics only carries the quiz's **current** questions
 * (`RemovedInVersion == null`), so a row can have content with no analytics — a question added
 * after the last play — but never the reverse. `stats` is therefore optional, and its absence
 * means "not yet answered", not "zero".
 */
export interface QuestionPerformanceRowProps {
  order: number;
  question: AnyQuestion;
  /** Undefined when the question has never been served — not the same as a zero score. */
  stats?: QuizQuestionAnalyticsRow;
  isOpen: boolean;
  onToggle: () => void;
  timeLimitInSeconds: number;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: "Multiple Choice",
  [QuestionType.TrueFalse]: "True / False",
  [QuestionType.TypeTheAnswer]: "Type The Answer",
};

const formatSeconds = (seconds: number) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  if (m === 0) return `${seconds.toFixed(1)}s`;
  return `${m}m ${Math.round(seconds % 60)}s`;
};

/**
 * The correct-rate cell, or an honest refusal to draw one.
 *
 * Under `MIN_ANSWERS_FOR_RATE` the bar and the percentage are both suppressed. "100%" off a
 * single answer looks exactly like "100%" off two hundred, and the whole point of this column is
 * to make a weak question visible — a column that can't tell those apart does the opposite.
 */
const CorrectRate = ({ stats }: { stats?: QuizQuestionAnalyticsRow }) => {
  const answered = stats?.timesAnswered ?? 0;

  if (answered < MIN_ANSWERS_FOR_RATE) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground tabular-nums cursor-default">
              —
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {answered === 0
              ? "No answers yet."
              : `Needs ${MIN_ANSWERS_FOR_RATE} answers before a rate means anything (has ${answered}).`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Progress value={stats!.correctRate} className="h-2 w-full min-w-16" />
      <span className="text-sm tabular-nums w-12 text-right">
        {stats!.correctRate}%
      </span>
    </div>
  );
};

export const QuestionPerformanceRow = ({
  order,
  question,
  stats,
  isOpen,
  onToggle,
  timeLimitInSeconds,
}: QuestionPerformanceRowProps) => {
  const flagged = needsALook(stats);

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        flagged ? "border-l-4 border-l-amber-500 border-border" : "border-border"
      )}
    >
      {/* The whole header is the expand affordance. min-h-11 (44px) per docs/RESPONSIVE.md —
          this is the row's primary action and it is the one people tap most. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
      >
        <span className="w-6 shrink-0 text-sm text-muted-foreground tabular-nums">
          {order}
        </span>

        {/* min-w-0 so the text truncates instead of squeezing the columns beside it
            (docs/RESPONSIVE.md, "Rows of buttons"). */}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {question.text}
          </span>
          {/* Below md the numbers move under the text rather than becoming their own
              columns — a six-column table on a phone is unreadable at any font size. */}
          <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
            {TYPE_LABELS[question.type]}
            {stats && stats.timesAnswered >= MIN_ANSWERS_FOR_RATE && (
              <> · {stats.correctRate}% correct</>
            )}
            {stats && stats.timesAnswered > 0 && (
              <> · {formatSeconds(stats.averageTimeSeconds)}</>
            )}
          </span>
        </span>

        <span className="hidden w-32 shrink-0 md:block">
          {flagged ? (
            <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-500">
              Needs a look
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              {TYPE_LABELS[question.type]}
            </span>
          )}
        </span>

        <span className="hidden w-40 shrink-0 md:block">
          <CorrectRate stats={stats} />
        </span>

        <span className="hidden w-16 shrink-0 text-right text-sm text-muted-foreground tabular-nums md:block">
          {stats ? formatSeconds(stats.averageTimeSeconds) : "—"}
        </span>

        <span className="hidden w-16 shrink-0 text-right text-sm text-muted-foreground tabular-nums sm:block">
          {stats?.timesAnswered ?? 0}
        </span>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="border-t border-border px-3 py-3">
          <QuestionDetail
            question={question}
            stats={stats}
            timeLimitInSeconds={timeLimitInSeconds}
          />
        </div>
      )}
    </div>
  );
};

/**
 * The expanded half: what the question actually asks, beside what we know about it.
 *
 * Per-option answer counts are **not** here. `UserAnswer.SelectedOptionId` and the multi-select
 * id list in `SubmittedAnswer` both hold the data, but neither is on the analytics DTO yet, so
 * showing a count would mean inventing one. See docs/proposals/quiz-view-redesign.md §2.
 */
const QuestionDetail = ({
  question,
  stats,
  timeLimitInSeconds,
}: {
  question: AnyQuestion;
  stats?: QuizQuestionAnalyticsRow;
  timeLimitInSeconds: number;
}) => (
  <div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {question.type === QuestionType.TypeTheAnswer ? "Accepted answers" : "Options"}
      </p>
      <AnswerSummary question={question} />
    </div>

    <div className="space-y-1.5 md:border-l md:border-border md:pl-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Details
      </p>
      <MetaLine label="Question ID" value={question.id} />
      <MetaLine label="Authored difficulty" value={question.difficulty?.level ?? "—"} />
      <MetaLine
        label="Time limit"
        value={timeLimitInSeconds ? `${timeLimitInSeconds}s` : "None"}
      />
      {stats && (
        <MetaLine
          label="Correct / incorrect"
          value={`${stats.correctCount} / ${stats.incorrectCount}`}
        />
      )}
    </div>
  </div>
);

const MetaLine = ({ label, value }: { label: string; value: string | number }) => (
  <p className="flex justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right">{value}</span>
  </p>
);

/**
 * What counts as right, per type. Deliberately read-only: this is the page you come to in order
 * to decide whether a question needs changing, not the page you change it on.
 */
const AnswerSummary = ({ question }: { question: AnyQuestion }) => {
  if (question.type === QuestionType.MultipleChoice) {
    return (
      <ul className="space-y-1">
        {question.answerOptions?.map((option) => (
          <li
            key={option.id}
            className={cn(
              "rounded border px-2 py-1 text-sm",
              option.isCorrect
                ? "border-green-600/40 bg-green-600/10 text-foreground"
                : "border-border text-muted-foreground"
            )}
          >
            {option.text}
          </li>
        ))}
      </ul>
    );
  }

  if (question.type === QuestionType.TrueFalse) {
    return (
      <p className="text-sm">
        Correct answer:{" "}
        <span className="font-medium">{question.correctAnswer ? "True" : "False"}</span>
      </p>
    );
  }

  return (
    <div className="space-y-1 text-sm">
      <p>
        Correct answer: <span className="font-medium">{question.correctAnswer}</span>
      </p>
      {question.acceptableAnswers?.length > 0 && (
        <p className="text-muted-foreground">
          Also accepted: {question.acceptableAnswers.join(", ")}
        </p>
      )}
      {/* Both settings change what counts as right, and neither is visible anywhere else on
          this page — an author looking at a low correct rate needs to know whether the
          question was strict on purpose. */}
      <p className="text-xs text-muted-foreground">
        {question.allowPartialMatch ? "Partial match on" : "Exact answer required"}
        {question.isCaseSensitive && " · case-sensitive"}
      </p>
    </div>
  );
};
