import { useMutation } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";

/** Response from POST /api/quiz/{id}/share-link. */
export type ShareLinkResponse = {
  shareToken: string;
};

/**
 * Generates (or returns the existing) share-link token for an owned quiz so it can be played while
 * Unlisted. Owner-only on the backend. See docs/quiz/quiz-visibility.md.
 */
/**
 * <b>`apiService`, not `api`.</b> The bare `api` instance's response interceptor returns the
 * whole axios response — only `apiService` unwraps `.data`. Typing `api.post(...)` as
 * `Promise<ShareLinkResponse>` compiled fine and lied: the caller destructured `shareToken`
 * off an `AxiosResponse`, got `undefined`, and produced `/play/shared/undefined`.
 *
 * Most other files calling `api` directly are mutations whose body nobody reads, so the same
 * mistake is invisible there. It bites wherever the response is used.
 */
export const createShareLink = (quizId: number): Promise<ShareLinkResponse> =>
  apiService.post(`/quiz/${quizId}/share-link`);

/** Builds the absolute play URL a user can open to play an Unlisted quiz. */
export const buildShareUrl = (shareToken: string): string =>
  `${window.location.origin}/play/shared/${shareToken}`;

type UseCreateShareLinkOptions = {
  mutationConfig?: MutationConfig<typeof createShareLink>;
};

export const useCreateShareLink = ({
  mutationConfig,
}: UseCreateShareLinkOptions = {}) => {
  return useMutation({
    mutationFn: createShareLink,
    ...mutationConfig,
  });
};
