import { useMemo, useState } from "react";

import { SegmentedControl } from "@/components/ui";
import type { QuizQuestionAnalyticsRow } from "@/types/analytics-types";
import type { QuizQuestionDTO } from "@/types/quiz-types";

import { QuestionPerformanceRow } from "./question-performance-row";
import { MIN_ANSWERS_FOR_RATE, SIGNED_IN_ONLY_NOTE, needsALook } from "./thresholds";

type SortKey = "order" | "hardest" | "slowest";

const SORT_OPTIONS = [
  { value: "order" as const, label: "Quiz order" },
  { value: "hardest" as const, label: "Hardest first" },
  { value: "slowest" as const, label: "Slowest first" },
];

export interface QuestionPerformanceTableProps {
  questions: QuizQuestionDTO[];
  /** Empty when analytics are unavailable — the table still lists the questions. */
  analytics: QuizQuestionAnalyticsRow[];
}

/**
 * The quiz's questions and how each one performs, in one list.
 *
 * Replaces both the Questions tab (content) and the Analytics per-question table (performance),
 * which listed the same questions twice. It also replaces the Questions tab's grid/list view
 * toggle: the masonry grid existed to fit content cards, and an expandable row already collapses
 * to one line and opens to the full card.
 *
 * <b>Rows stay independently open</b> rather than being an accordion with one open at a time.
 * The task this page exists for is comparing two weak questions, and a control that shuts one
 * when you open the other makes exactly that impossible.
 */
export const QuestionPerformanceTable = ({
  questions,
  analytics,
}: QuestionPerformanceTableProps) => {
  const [sort, setSort] = useState<SortKey>("order");
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const statsById = useMemo(
    () => new Map(analytics.map((row) => [row.questionId, row])),
    [analytics]
  );

  // Derived during render rather than stored (CLAUDE.md, "Derive during render instead of
  // storing"): sorting is a pure function of the questions and the chosen key, and holding a
  // sorted copy in state would need re-syncing on every refetch.
  const ordered = useMemo(() => {
    const rows = [...questions];

    if (sort === "hardest") {
      // Questions without enough answers sort last regardless of their apparent rate — a 0%
      // built from one answer is not the hardest question, it is the least-known one, and
      // floating it to the top is precisely the false alarm MIN_ANSWERS_FOR_RATE prevents.
      return rows.sort((a, b) => {
        const sa = statsById.get(a.questionId);
        const sb = statsById.get(b.questionId);
        const aRated = (sa?.timesAnswered ?? 0) >= MIN_ANSWERS_FOR_RATE;
        const bRated = (sb?.timesAnswered ?? 0) >= MIN_ANSWERS_FOR_RATE;
        if (aRated !== bRated) return aRated ? -1 : 1;
        if (!aRated) return a.orderInQuiz - b.orderInQuiz;
        return sa!.correctRate - sb!.correctRate;
      });
    }

    if (sort === "slowest") {
      return rows.sort((a, b) => {
        const sa = statsById.get(a.questionId)?.averageTimeSeconds ?? 0;
        const sb = statsById.get(b.questionId)?.averageTimeSeconds ?? 0;
        return sb - sa;
      });
    }

    return rows.sort((a, b) => a.orderInQuiz - b.orderInQuiz);
  }, [questions, sort, statsById]);

  const flaggedCount = useMemo(
    () => questions.filter((q) => needsALook(statsById.get(q.questionId))).length,
    [questions, statsById]
  );

  const toggle = (questionId: number) =>
    setOpenIds((open) => {
      const next = new Set(open);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });

  if (questions.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        This quiz has no questions yet.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-lg font-semibold">Questions</h2>
          <p className="text-xs text-muted-foreground">
            {flaggedCount > 0
              ? `${flaggedCount} of ${questions.length} are answered correctly less than half the time.`
              : SIGNED_IN_ONLY_NOTE}
          </p>
        </div>
        <SegmentedControl
          value={sort}
          onValueChange={(value) => setSort(value as SortKey)}
          options={SORT_OPTIONS}
          aria-label="Sort questions"
        />
      </div>

      {/* Column headings for the numeric columns only — the row itself is a button, not a
          <tr>, because the expanded half is a two-column panel that no table cell can hold. */}
      <div className="hidden items-center gap-3 px-3 text-xs uppercase tracking-wider text-muted-foreground md:flex">
        <span className="w-6">#</span>
        <span className="min-w-0 flex-1">Question</span>
        <span className="w-32">Type</span>
        <span className="w-40">Correct rate</span>
        <span className="w-16 text-right">Avg. time</span>
        <span className="w-16 text-right">Answered</span>
        <span className="w-4" aria-hidden />
      </div>

      <div className="space-y-2">
        {ordered.map((entry) => (
          <QuestionPerformanceRow
            key={entry.questionId}
            order={entry.orderInQuiz}
            question={entry.question}
            stats={statsById.get(entry.questionId)}
            isOpen={openIds.has(entry.questionId)}
            onToggle={() => toggle(entry.questionId)}
            timeLimitInSeconds={entry.timeLimitInSeconds}
          />
        ))}
      </div>
    </section>
  );
};
