import { queryOptions } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { apiService } from "@/lib/Api-client";

/** How many quick-play quizzes one category has at one difficulty (`QuickPlayComboDTO`). */
export interface QuickPlayCombo {
  categoryId: number;
  difficultyId: number;
  count: number;
}

export interface QuickPlayChoice {
  /** Omitted: any category. */
  categoryId?: number;
  /** Omitted: any difficulty. */
  difficultyId?: number;
  /** Empty: every language. */
  languageIds: number[];
  /** Quizzes this browser has already been handed. */
  exclude: number[];
  /** "Play one again": the player was told they have had them all and asked for one anyway. */
  allowRepeats?: boolean;
}

/**
 * What the server answered: a quiz to start, `exhausted` (there are quizzes for this choice and
 * this player has had every one), or `none` (nothing matches at all — a 404).
 */
export type QuickPlayPick = { kind: "quiz"; quizId: number } | { kind: "exhausted" } | { kind: "none" };

const csv = (ids: number[]) => (ids.length ? ids.join(",") : undefined);

export const getQuickPlayOptions = (languageIds: number[]): Promise<QuickPlayCombo[]> =>
  apiService.get("/quick-play/options", { params: { languageIds: csv(languageIds) } });

/**
 * One builder for the page and its route loader, so the loader warms the entry the page reads
 * (docs/development/loading-states.md §6).
 */
export const quickPlayOptionsQueryOptions = (languageIds: number[]) =>
  queryOptions({
    queryKey: ["quick-play", "options", [...languageIds].sort((a, b) => a - b)],
    queryFn: () => getQuickPlayOptions(languageIds),
    staleTime: 60_000,
  });

export const pickQuickPlay = async (choice: QuickPlayChoice): Promise<QuickPlayPick> => {
  try {
    const pick = await apiService.get<{ quizId: number | null; exhausted: boolean }>("/quick-play/pick", {
      params: {
        categoryId: choice.categoryId,
        difficultyId: choice.difficultyId,
        languageIds: csv(choice.languageIds),
        exclude: csv(choice.exclude),
        allowRepeats: choice.allowRepeats || undefined,
      },
    });
    return pick.quizId != null ? { kind: "quiz", quizId: pick.quizId } : { kind: "exhausted" };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return { kind: "none" };
    throw error;
  }
};
