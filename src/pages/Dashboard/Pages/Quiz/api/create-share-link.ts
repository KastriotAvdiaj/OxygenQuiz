import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";

/** Response from POST /api/quiz/{id}/share-link. */
export type ShareLinkResponse = {
  shareToken: string;
};

/**
 * Generates (or returns the existing) share-link token for an owned quiz so it can be played while
 * Unlisted. Owner-only on the backend. See docs/quiz-visibility.md.
 */
export const createShareLink = (quizId: number): Promise<ShareLinkResponse> =>
  api.post(`/quiz/${quizId}/share-link`);

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
