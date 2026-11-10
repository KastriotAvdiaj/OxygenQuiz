import type { QuestionLanguage } from "@/types/question-types";

/**
 * Which languages the quiz catalogue starts filtered to (docs/quiz/quiz-discovery.md, "Starting in
 * English"). Every visitor starts on English until the app can tell where they are; once someone
 * ticks or unticks a language themselves, that choice is remembered in this browser and the
 * default no longer applies — an empty choice ("every language") included.
 */

/** Matched by name, like `?category=` (category-param.ts): ids differ between dev and live. */
export const DEFAULT_LANGUAGE_NAME = "English";

const STORAGE_KEY = "oxygen.quiz-languages";

export const findDefaultLanguageId = (languages: readonly QuestionLanguage[]): number | undefined =>
  languages.find(
    (l) => l.language.trim().toLowerCase() === DEFAULT_LANGUAGE_NAME.toLowerCase(),
  )?.id;

/** The visitor's own language choice, or null if they never made one. Storage can throw. */
export const readLanguageChoice = (): number[] | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((n) => Number.isInteger(n)) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveLanguageChoice = (ids: readonly number[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private mode or storage off: the choice lasts as long as the page does.
  }
};

/**
 * The languages a picker starts on: the remembered choice (dropping ids that no longer exist),
 * else English, else nothing — a site with no English row starts unfiltered rather than empty.
 * `fromDefault` says whether the visitor chose it or we did; only our choice falls back when it
 * finds no quizzes.
 */
export const startingLanguages = (
  languages: readonly QuestionLanguage[],
  stored: readonly number[] | null,
): { ids: number[]; fromDefault: boolean } => {
  if (stored !== null) {
    const known = new Set(languages.map((l) => l.id));
    return { ids: languages.length ? stored.filter((id) => known.has(id)) : [...stored], fromDefault: false };
  }
  const english = findDefaultLanguageId(languages);
  return { ids: english === undefined ? [] : [english], fromDefault: english !== undefined };
};
