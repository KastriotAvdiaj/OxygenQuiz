import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

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
  apiService.post(
    `/questioncategories/ai-palette`,
    { categoryName },
    {
      // The button renders the failure beside itself, in the server's own words. The
      // interceptor's toast on top of that is the duplicate.
      // See docs/development/error-handling.md.
      skipErrorToast: true,
    }
  );

/** Last resort: a network failure, or a body with nothing readable in it. */
export const PALETTE_ERROR_FALLBACK =
  "Couldn't get suggestions. Pick colours by hand, or try again.";

/**
 * The server's own words about why the proposal failed.
 *
 * `CategoryPaletteService` distinguishes three failures that call for three different next
 * steps — the answer wasn't usable (try again), the budget is spent (pick by hand today), AI
 * is switched off (pick by hand, full stop). They arrive as `AppValidationException` →
 * `ProblemDetails.Title` via `GlobalExceptionHandler`. Collapsing them into one generic line
 * throws away the only part that tells the admin what to do next, which is the opposite of
 * what "failure is loud" was for.
 *
 * Reads the same keys as the interceptor's `parseApiError` (`src/lib/Api-client.ts`), for the
 * same reasons — including the bare-string body the older controllers still produce.
 * Deliberately does **not** show a 5xx: that message may be an EF exception or a stack trace.
 */
export const paletteErrorMessage = (error: unknown): string => {
  const response = (error as AxiosError | undefined)?.response;
  if (!response || response.status >= 500) return PALETTE_ERROR_FALLBACK;

  const data: unknown = response.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (!data || typeof data !== "object") return PALETTE_ERROR_FALLBACK;

  const body = data as Record<string, unknown>;

  // `ValidationProblemDetails` — machine-generated from C# property names, and its title is
  // "One or more validation errors occurred.", which is worse than saying nothing.
  if (body.errors && typeof body.errors === "object") return PALETTE_ERROR_FALLBACK;

  const authored = ["detail", "title", "message"]
    .map((key) => body[key])
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    );

  return authored?.trim() ?? PALETTE_ERROR_FALLBACK;
};

/** Whether the server can answer at all, and why not when it can't. */
export type PaletteAvailability = {
  available: boolean;
  /** User-facing sentence, or null when available. Never names a config key. */
  reason: string | null;
};

export const getPaletteAvailability = (): Promise<PaletteAvailability> =>
  apiService.get("/questioncategories/ai-palette/availability");

/**
 * Drives whether "Suggest colours" is offered at all.
 *
 * **Configuration, not budget.** The server answers "is the AI switched on and configured here",
 * which is a standing fact worth a disabled button and a tooltip. A spent daily budget is not:
 * it changes under the admin's feet, so a cached `false` would be wrong within the hour. That one
 * stays an inline message on the failed click, which `paletteErrorMessage` already renders in the
 * server's own words.
 *
 * `throwOnError: false` is load-bearing, for the same reason `useAiQuota` sets it: the global
 * default in `lib/React-query.ts` throws query errors into the nearest error boundary, and a
 * decorative availability check must never replace the category form with "Something went wrong".
 * `undefined` means unknown, and unknown is treated as available — the button then fails
 * informatively on click instead of being greyed out by a network blip.
 */
export const usePaletteAvailability = () =>
  useQuery({
    queryKey: ["ai-palette-availability"],
    queryFn: getPaletteAvailability,
    retry: false,
    throwOnError: false,
    // Configuration does not change while an admin fills in a form; it changes on deploy.
    staleTime: 5 * 60_000,
  });

type Options = {
  mutationConfig?: MutationConfig<typeof proposeCategoryPalette>;
};

export const useProposeCategoryPalette = ({ mutationConfig }: Options = {}) =>
  useMutation({
    mutationFn: proposeCategoryPalette,
    ...mutationConfig,
  });
