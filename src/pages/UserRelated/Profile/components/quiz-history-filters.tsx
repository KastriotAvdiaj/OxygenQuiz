import { useCallback, useMemo, useState } from "react";
import { rule, sortBy, type FilterRule, type SortRule } from "@/lib/filtering";
import { useDebounce } from "@/hooks/use-debounce";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { SearchInput } from "@/lib/Search-Input";
import type { ActiveFilterPill } from "@/components/ui/active-filter-pills";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import {
  FacetSection,
  QuizFilterPanel,
  useQuizFilterState,
  type FacetOption,
  type QuizFacetKey,
} from "@/pages/Quiz/components/quiz-filters";
import {
  SESSION_HISTORY_STATUS,
  type UserSessionsQuery,
} from "@/pages/Quiz/Sessions/api/get-user-sessions";

/**
 * Filters for the play history (docs/quiz/user-stats-history.md § Filtering).
 *
 * Almost all of it is reuse: the category / difficulty / language facets are the catalogue's
 * own `useQuizFilterState` + `QuizFilterPanel`, which already serialize to `categoryId` /
 * `difficultyId` / `languageId` `in` rules — the history endpoint whitelists the same names
 * (`QuizSessionFilterFields`), so they work unchanged. What history adds on top is only what a
 * *play* has and a quiz doesn't: a status, a date it was played, and a score to sort by.
 */

export type HistorySort =
  | "newest"
  | "oldest"
  | "score-desc"
  | "score-asc"
  | "points-desc"
  | "title-asc";

export const HISTORY_SORT_LABELS: Record<HistorySort, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  "score-desc": "Highest Score",
  "score-asc": "Lowest Score",
  "points-desc": "Most Points",
  "title-asc": "Quiz A → Z",
};

const HISTORY_SORT_RULES: Record<HistorySort, SortRule> = {
  newest: sortBy("startTime", "desc"),
  oldest: sortBy("startTime", "asc"),
  // "Score" is the /100 headline (share correct — the `accuracy` field), not raw points: sorting
  // by points put a 3/10 on a long quiz above a 10/10 on a short one.
  "score-desc": sortBy("accuracy", "desc"),
  "score-asc": sortBy("accuracy", "asc"),
  "points-desc": sortBy("totalScore", "desc"),
  "title-asc": sortBy("quizTitle", "asc"),
};

const STATUS_OPTIONS: FacetOption[] = [
  { id: SESSION_HISTORY_STATUS.Completed, label: "Completed" },
  { id: SESSION_HISTORY_STATUS.InProgress, label: "In progress" },
  { id: SESSION_HISTORY_STATUS.Abandoned, label: "Abandoned" },
];

/**
 * A `yyyy-mm-dd` from the date input → the ISO instant that day starts in the *viewer's*
 * timezone. Sending the bare date would be read as UTC midnight server-side, which shifts the
 * range by the viewer's offset — a quiz played at 00:30 in Prishtina would fall on the day
 * before. `addDays` lets the upper bound be the start of the following day, so "to" is
 * inclusive of the whole day it names (`startTime < next midnight`).
 */
const localDayStart = (ymd: string, addDays = 0) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d + addDays).toISOString();
};

const formatDay = (ymd: string) =>
  new Date(`${ymd}T00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface Lookups {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
}

/**
 * All history filter state in one place. `onAfterChange` runs on every change so the caller
 * can reset to page 1 in the same render (the catalogue's convention — an effect would fire
 * one render late and query an out-of-range page).
 */
export function useQuizHistoryFilters(
  { categories, difficulties, languages }: Lookups,
  onAfterChange: () => void
) {
  const [search, setSearchRaw] = useState("");
  const [sort, setSortRaw] = useState<HistorySort>("newest");
  const [statusIds, setStatusIds] = useState<number[]>([]);
  const [from, setFromRaw] = useState("");
  const [to, setToRaw] = useState("");

  const facets = useQuizFilterState(onAfterChange);

  const debouncedSearch = useDebounce(search, 400);

  const setSearch = useCallback(
    (value: string) => {
      setSearchRaw(value);
      onAfterChange();
    },
    [onAfterChange]
  );
  const setSort = useCallback(
    (value: HistorySort) => {
      setSortRaw(value);
      onAfterChange();
    },
    [onAfterChange]
  );
  const toggleStatus = useCallback(
    (id: number) => {
      setStatusIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      onAfterChange();
    },
    [onAfterChange]
  );
  const setFrom = useCallback(
    (value: string) => {
      setFromRaw(value);
      onAfterChange();
    },
    [onAfterChange]
  );
  const setTo = useCallback(
    (value: string) => {
      setToRaw(value);
      onAfterChange();
    },
    [onAfterChange]
  );

  const { clear: clearFacets } = facets;
  /** What the panel's own "Clear all" clears — search lives in the toolbar, not the panel. */
  const clearPanel = useCallback(() => {
    setStatusIds([]);
    setFromRaw("");
    setToRaw("");
    clearFacets(); // also calls onAfterChange
  }, [clearFacets]);
  const clearAll = useCallback(() => {
    setSearchRaw("");
    clearPanel();
  }, [clearPanel]);

  /** Filters inside the panel (everything but search) — drives the panel's "Clear all". */
  const panelCount =
    facets.activeCount + statusIds.length + (from ? 1 : 0) + (to ? 1 : 0);
  const activeCount = panelCount + (search ? 1 : 0);

  const query = useMemo<Omit<UserSessionsQuery, "page" | "pageSize">>(() => {
    const filters: FilterRule[] = [...facets.filters];
    if (statusIds.length) filters.push(rule.in("status", statusIds));
    if (from) filters.push(rule.gte("startTime", localDayStart(from)));
    if (to) filters.push(rule.lt("startTime", localDayStart(to, 1)));
    return {
      search: debouncedSearch || undefined,
      sort: [HISTORY_SORT_RULES[sort]],
      filters,
    };
  }, [facets.filters, statusIds, from, to, debouncedSearch, sort]);

  // One removable pill per active value, labelled from the lookups the panel already loaded.
  const pills: ActiveFilterPill[] = [];
  if (search)
    pills.push({ id: "search", label: `“${search}”`, onRemove: () => setSearch("") });
  const facetSources: {
    facet: QuizFacetKey;
    labelOf: (id: number) => string | undefined;
  }[] = [
    { facet: "categoryIds", labelOf: (id) => categories.find((c) => c.id === id)?.name },
    { facet: "difficultyIds", labelOf: (id) => difficulties.find((d) => d.id === id)?.level },
    { facet: "languageIds", labelOf: (id) => languages.find((l) => l.id === id)?.language },
  ];
  for (const { facet, labelOf } of facetSources) {
    for (const id of facets.selections[facet]) {
      const label = labelOf(id);
      if (label)
        pills.push({ id: `${facet}-${id}`, label, onRemove: () => facets.toggle(facet, id) });
    }
  }
  for (const id of statusIds) {
    const label = STATUS_OPTIONS.find((o) => o.id === id)?.label;
    if (label) pills.push({ id: `status-${id}`, label, onRemove: () => toggleStatus(id) });
  }
  if (from) pills.push({ id: "from", label: `From ${formatDay(from)}`, onRemove: () => setFrom("") });
  if (to) pills.push({ id: "to", label: `Until ${formatDay(to)}`, onRemove: () => setTo("") });

  return {
    search,
    setSearch,
    sort,
    setSort,
    facets,
    statusIds,
    toggleStatus,
    from,
    setFrom,
    to,
    setTo,
    clearPanel,
    clearAll,
    panelCount,
    activeCount,
    query,
    pills,
  };
}

export type QuizHistoryFiltersState = ReturnType<typeof useQuizHistoryFilters>;

/**
 * The catalogue's facet panel with the two history-only sections appended through its
 * `children` slot, so all five read as one list with one "Clear all".
 */
export function QuizHistoryFilterPanel({
  lookups,
  state,
  showSearch = false,
  className,
}: {
  lookups: Lookups;
  state: QuizHistoryFiltersState;
  /**
   * Put the search field at the top of the panel, as the dashboard's other filter panels do
   * (My Quizzes). With it here, the panel's "Clear all" clears the search too.
   */
  showSearch?: boolean;
  className?: string;
}) {
  return (
    <QuizFilterPanel
      categories={lookups.categories}
      difficulties={lookups.difficulties}
      languages={lookups.languages}
      selections={state.facets.selections}
      onToggle={state.facets.toggle}
      onClearAll={showSearch ? state.clearAll : state.clearPanel}
      activeCount={showSearch ? state.activeCount : state.panelCount}
      className={className}
      leading={
        showSearch && (
          <div className="mb-4 border-b border-border/60 pb-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Search
            </h3>
            {/* SearchInput keeps its own text, so remount it when the search is cleared from
                outside (a pill, "Clear all") — otherwise the old text lingers in the field. */}
            <SearchInput
              key={state.search ? "active" : "idle"}
              placeholder="Search your history..."
              onSearch={state.setSearch}
              initialValue={state.search}
            />
          </div>
        )
      }
    >
      <FacetSection
        title="Status"
        options={STATUS_OPTIONS}
        selectedIds={state.statusIds}
        onToggle={state.toggleStatus}
        defaultOpen={false}
      />
      <div className="py-3">
        <DateRangeFilter
          label="Played"
          from={state.from}
          to={state.to}
          onFromChange={state.setFrom}
          onToChange={state.setTo}
        />
      </div>
    </QuizFilterPanel>
  );
}
