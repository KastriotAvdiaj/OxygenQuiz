import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import type { QuestionLanguage } from "@/types/question-types";
import { readLanguageChoice, startingLanguages } from "../default-language";
import { useQuizFilterState } from "../use-quiz-filter-state";

const lang = (id: number, language: string): QuestionLanguage => ({
  id,
  language,
  createdAt: "2026-01-01T00:00:00Z",
});
const LANGUAGES = [lang(1, "Albanian"), lang(3, " english "), lang(4, "German")];

afterEach(() => window.localStorage.clear());

describe("startingLanguages", () => {
  it("starts on English, matched by name", () => {
    expect(startingLanguages(LANGUAGES, null)).toEqual({ ids: [3], fromDefault: true });
  });

  it("starts unfiltered when there is no English row", () => {
    expect(startingLanguages([lang(1, "Albanian")], null)).toEqual({ ids: [], fromDefault: false });
  });

  it("uses the visitor's own choice, empty included, dropping ids that are gone", () => {
    expect(startingLanguages(LANGUAGES, [1, 99])).toEqual({ ids: [1], fromDefault: false });
    expect(startingLanguages(LANGUAGES, [])).toEqual({ ids: [], fromDefault: false });
  });
});

describe("useQuizFilterState with languages", () => {
  it("filters to English until the visitor chooses, then remembers the choice", () => {
    const { result } = renderHook(() => useQuizFilterState(undefined, undefined, LANGUAGES));
    expect(result.current.filters).toEqual([{ field: "languageId", operator: "in", values: [3] }]);
    expect(result.current.usingLanguageDefault).toBe(true);

    act(() => result.current.toggle("languageIds", 3)); // untick English
    expect(result.current.filters).toEqual([]);
    expect(result.current.usingLanguageDefault).toBe(false);
    expect(readLanguageChoice()).toEqual([]);
  });

  it("applies English once languages arrive after mounting (the lobby dialog)", () => {
    const { result, rerender } = renderHook(
      ({ languages }) => useQuizFilterState(undefined, undefined, languages),
      { initialProps: { languages: [] as QuestionLanguage[] } },
    );
    expect(result.current.filters).toEqual([]);

    rerender({ languages: LANGUAGES });
    expect(result.current.selections.languageIds).toEqual([3]);
  });

  it("drops the default without remembering it when English has nothing", () => {
    const { result } = renderHook(() => useQuizFilterState(undefined, undefined, LANGUAGES));
    act(() => result.current.dropLanguageDefault());
    expect(result.current.selections.languageIds).toEqual([]);
    expect(readLanguageChoice()).toBeNull();
  });

  it("a page's own reset is not remembered; the visitor's clear-all is", () => {
    const { result } = renderHook(() => useQuizFilterState(undefined, undefined, LANGUAGES));
    act(() => result.current.clear({ remember: false }));
    expect(readLanguageChoice()).toBeNull();
    act(() => result.current.clear());
    expect(readLanguageChoice()).toEqual([]);
  });

  it("has no language default without the lookup", () => {
    const { result } = renderHook(() => useQuizFilterState());
    expect(result.current.filters).toEqual([]);
  });
});
