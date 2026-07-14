import { useCallback, useMemo, useState } from "react";
import { rule, type FilterRule } from "@/lib/filtering";

export type QuizFacetKey = "categoryIds" | "difficultyIds" | "languageIds";

export interface QuizFilterSelections {
  categoryIds: number[];
  difficultyIds: number[];
  languageIds: number[];
}

const EMPTY_SELECTIONS: QuizFilterSelections = {
  categoryIds: [],
  difficultyIds: [],
  languageIds: [],
};

/** Facet key → the whitelisted filter field it queries (QuizFilterFields.cs). */
const FACET_FIELDS: Record<QuizFacetKey, string> = {
  categoryIds: "categoryId",
  difficultyIds: "difficultyId",
  languageIds: "languageId",
};

/**
 * Multi-select facet state shared by both quiz pickers (/choose-quiz and the
 * multiplayer lobby dialog). Selections serialize to `in` filter rules — the
 * backend whitelists `In` on categoryId/difficultyId/languageId.
 *
 * @param onAfterChange Runs after every toggle/clear; callers use it to reset
 *   pagination in the same render (an effect would fire one render late and
 *   briefly query an out-of-range page — see Quiz-Selection.tsx).
 */
export function useQuizFilterState(onAfterChange?: () => void) {
  const [selections, setSelections] =
    useState<QuizFilterSelections>(EMPTY_SELECTIONS);

  const toggle = useCallback(
    (facet: QuizFacetKey, id: number) => {
      setSelections((prev) => {
        const current = prev[facet];
        const next = current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id];
        return { ...prev, [facet]: next };
      });
      onAfterChange?.();
    },
    [onAfterChange]
  );

  const clear = useCallback(() => {
    setSelections(EMPTY_SELECTIONS);
    onAfterChange?.();
  }, [onAfterChange]);

  const filters = useMemo<FilterRule[]>(
    () =>
      (Object.keys(FACET_FIELDS) as QuizFacetKey[])
        .filter((facet) => selections[facet].length > 0)
        .map((facet) => rule.in(FACET_FIELDS[facet], selections[facet])),
    [selections]
  );

  const activeCount =
    selections.categoryIds.length +
    selections.difficultyIds.length +
    selections.languageIds.length;

  /** Stable identity of the current selections — handy as a React key/dep. */
  const selectionKey = useMemo(
    () =>
      (Object.keys(FACET_FIELDS) as QuizFacetKey[])
        .map((facet) => `${facet}:${[...selections[facet]].sort((a, b) => a - b).join(",")}`)
        .join("|"),
    [selections]
  );

  return { selections, toggle, clear, filters, activeCount, selectionKey };
}
