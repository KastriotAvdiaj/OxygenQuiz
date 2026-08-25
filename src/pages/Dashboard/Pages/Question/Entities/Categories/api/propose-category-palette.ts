import { useMutation } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";

/** One suggestion. `clashesWith` names an existing category it would be hard to tell apart from. */
export type PaletteCandidate = {
  colors: string[];
  clashesWith: string | null;
};

export type CategoryPaletteResult = {
  candidates: PaletteCandidate[];
  model: string;
};

/**
 * Ask for colour palettes that suit a category name.
 *
 * **Proposes only.** This creates nothing — the response is three candidates for the admin to
 * pick from, edit, or ignore. Saving still goes through the normal create/update endpoints.
 * See docs/adr/0003-the-model-proposes-the-code-decides.md.
 *
 * Three come back in one call on purpose, so "give me a different one" is a click through a
 * local list rather than a second model call — which is also why there is no regenerate button.
 */
export const proposeCategoryPalette = (
  categoryName: string
): Promise<CategoryPaletteResult> =>
  apiService.post(`/questioncategories/ai-palette`, { categoryName });

type Options = {
  mutationConfig?: MutationConfig<typeof proposeCategoryPalette>;
};

export const useProposeCategoryPalette = ({ mutationConfig }: Options = {}) =>
  useMutation({
    mutationFn: proposeCategoryPalette,
    ...mutationConfig,
  });
