import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { apiService } from "@/lib/Api-client";
import type { QuestionType } from "@/types/question-types";

import type { AiGrounding } from "./generate-ai-quiz";

/**
 * Quizzes built from Wikidata fact packs (docs/quiz/fact-quizzes.md). No model: the server fills
 * templates from a reviewed file of facts and answers in the same shape a generation does, so the
 * reply goes through the wizard's parser and review unchanged.
 */

/** One pack, as `GET /quiz/fact-packs` lists it. Mirrors `FactPackDTO`. */
export interface FactPack {
  slug: string;
  /** By language name — "English", "Albanian". */
  title: Record<string, string>;
  description: Record<string, string>;
  category: string | null;
  /** Languages the pack can build in, with how many facts each can use. */
  factsByLanguage: Record<string, number>;
  /** The question types its templates produce. */
  questionTypes: QuestionType[];
  /** The day its facts were fetched from Wikidata. */
  builtAt: string | null;
  /** What it includes and why — e.g. that Kosovo counts as a European state. */
  editorialNote: string | null;
}

export interface FactQuizInput {
  packSlug: string;
  languageName: string;
  questionCount: number;
  allowedTypes: QuestionType[];
  /** The app's difficulty names, so each question is rated in them. */
  difficultyNames: string[];
}

export interface FactQuizResult {
  /** A model reply's JSON: `{ title, category, language, questions }`. */
  payload: string;
  /** "Grounded" in `wikidata`; its `text` is every fact stated, for the quote check. */
  grounding: AiGrounding;
}

/** Packs ship with the app and change only on a deploy. */
export const factPackKeys = { all: ["fact-packs"] as const };

/** Kept in step with the server: `FactQuizBuilder.MaxQuestions`. */
export const MAX_FACT_QUESTIONS = 20;

export const getFactPacks = (): Promise<FactPack[]> => apiService.get<FactPack[]>("/quiz/fact-packs");

export const useFactPacks = () =>
  useQuery({
    queryKey: factPackKeys.all,
    queryFn: getFactPacks,
    staleTime: Infinity,
    // The page says so itself ("Couldn't load the fact sets") rather than swapping to the
    // route's error screen: the rest of the page, and its links to the other paths, still work.
    throwOnError: false,
  });

/** The server's message when it has one ("isn't available in German"), else a generic one. */
export class FactQuizError extends Error {}

export const buildFactQuiz = (input: FactQuizInput): Promise<FactQuizResult> =>
  apiService
    // The page shows the reason itself, next to the button that failed.
    .post<FactQuizResult>("/quiz/fact-quiz", input, { skipErrorToast: true })
    .catch((error: AxiosError<{ message?: string }>) => {
      throw new FactQuizError(
        error?.response?.data?.message ?? "Couldn't build the quiz. Check your connection and try again.",
      );
    });

/** Creates nothing — saving goes through the builder's `ai-import`, like a generated quiz. */
export const useBuildFactQuiz = () => useMutation({ mutationFn: buildFactQuiz });
