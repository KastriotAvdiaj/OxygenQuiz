import { useCallback, useMemo, useState } from "react";
import { rule, type FilterRule } from "@/lib/filtering";
import type { QuestionLanguage } from "@/types/question-types";
import { readLanguageChoice, saveLanguageChoice, startingLanguages } from "./default-language";

export type QuizFacetKey = "categoryIds" | "difficultyIds" | "languageIds";

export interface QuizFilterSelections {
  categoryIds: number[];
  difficultyIds: number[];
  languageIds: number[];
}

const NO_IDS: number[] = [];

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
 * @param initial Selections to start with (read once, on mount) — e.g. the category
 *   named in `/choose-quiz?category=` (category-param.ts).
 */
export function useQuizFilterState(
  onAfterChange?: () => void,
  initial?: Partial<Omit<QuizFilterSelections, "languageIds">>,
  /**
   * The language lookup, to start on English (default-language.ts). Omit for no language
   * default. The default is derived during render, not copied into state, so a picker whose
   * languages arrive after it mounts (the lobby dialog) still starts on English.
   */
  languages?: readonly QuestionLanguage[],
) {
  const [selections, setSelections] = useState<Omit<QuizFilterSelections, "languageIds">>(() => ({
    categoryIds: initial?.categoryIds ?? [],
    difficultyIds: initial?.difficultyIds ?? [],
  }));
  // null = the visitor hasn't touched the language facet on this page: use the starting languages.
  const [languageChoice, setLanguageChoice] = useState<number[] | null>(null);
  const [stored] = useState(() => (languages ? readLanguageChoice() : null));
  // Set when the starting English finds no quizzes, so the picker can show every language.
  const [defaultDropped, setDefaultDropped] = useState(false);

  // Memoised so the ids keep one identity between renders, and the filters with them.
  const starting = useMemo(
    () => (languages ? startingLanguages(languages, stored) : { ids: NO_IDS, fromDefault: false }),
    [languages, stored]
  );
  const languageIds =
    languageChoice ?? (defaultDropped && starting.fromDefault ? NO_IDS : starting.ids);
  const usingLanguageDefault = languageChoice === null && starting.fromDefault && !defaultDropped;

  const allSelections = useMemo<QuizFilterSelections>(
    () => ({ ...selections, languageIds }),
    [selections, languageIds]
  );

  const toggle = useCallback(
    (facet: QuizFacetKey, id: number) => {
      if (facet === "languageIds") {
        const next = languageIds.includes(id)
          ? languageIds.filter((x) => x !== id)
          : [...languageIds, id];
        setLanguageChoice(next);
        if (languages) saveLanguageChoice(next);
      } else {
        setSelections((prev) => {
          const current = prev[facet];
          const next = current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id];
          return { ...prev, [facet]: next };
        });
      }
      onAfterChange?.();
    },
    [onAfterChange, languageIds, languages]
  );

  /**
   * The visitor's "clear all": every facet off, every language included — remembered, like any
   * language choice. `remember: false` is for the page's own resets (an empty `?category=`).
   */
  const clear = useCallback(
    ({ remember = true }: { remember?: boolean } = {}) => {
      setSelections({ categoryIds: [], difficultyIds: [] });
      setLanguageChoice([]);
      if (remember && languages) saveLanguageChoice([]);
      onAfterChange?.();
    },
    [onAfterChange, languages]
  );

  /** The starting English found nothing: show every language, without remembering it. */
  const dropLanguageDefault = useCallback(() => {
    setDefaultDropped(true);
    onAfterChange?.();
  }, [onAfterChange]);

  const filters = useMemo<FilterRule[]>(
    () =>
      (Object.keys(FACET_FIELDS) as QuizFacetKey[])
        .filter((facet) => allSelections[facet].length > 0)
        .map((facet) => rule.in(FACET_FIELDS[facet], allSelections[facet])),
    [allSelections]
  );

  const activeCount =
    allSelections.categoryIds.length +
    allSelections.difficultyIds.length +
    allSelections.languageIds.length;

  /** Stable identity of the current selections — handy as a React key/dep. */
  const selectionKey = useMemo(
    () =>
      (Object.keys(FACET_FIELDS) as QuizFacetKey[])
        .map((facet) => `${facet}:${[...allSelections[facet]].sort((a, b) => a - b).join(",")}`)
        .join("|"),
    [allSelections]
  );

  return {
    selections: allSelections,
    toggle,
    clear,
    filters,
    activeCount,
    selectionKey,
    /** True while the list is on the starting English the visitor didn't choose. */
    usingLanguageDefault,
    dropLanguageDefault,
  };
}
