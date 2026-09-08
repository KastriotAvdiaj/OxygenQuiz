import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { Quiz, QuizStatus } from "@/types/quiz-types";

export type SetQuizStatusDTO = {
  quizId: number;
  status: QuizStatus;
};

/**
 * Sets a quiz's status — the Publish / Unpublish action.
 *
 * `PATCH /quiz/{id}/status` has existed and been tested server-side since the visibility work
 * (docs/quiz/quiz-visibility.md); this client half was the only missing piece, which is why the
 * dashboard button shipped `disabled` with a "Feature not implemented" tooltip.
 *
 * <b>`apiService`, not `api`</b> — the bare instance returns the whole axios response, so the
 * updated quiz would arrive wrapped. That mistake is what produced `/play/shared/undefined`
 * from the share-link endpoint; see create-share-link.ts.
 *
 * Going **Public** can legitimately fail: `EnsurePublishableAsync` rejects a quiz whose
 * category, language or difficulty is still the seeded "Unspecified" placeholder, and answers
 * 400 with a message naming the offending fields. That message is worth surfacing verbatim —
 * it tells the author exactly what to fill in — so the caller shows it rather than a generic
 * failure.
 */
export const setQuizStatus = ({
  quizId,
  status,
}: SetQuizStatusDTO): Promise<Quiz> =>
  apiService.patch(`/quiz/${quizId}/status`, { status });

type UseSetQuizStatusOptions = {
  mutationConfig?: MutationConfig<typeof setQuizStatus>;
};

export const useSetQuizStatus = ({
  mutationConfig,
}: UseSetQuizStatusOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      // The same three key families delete-quiz invalidates: status decides what appears in
      // the public catalogue and in the dashboard's status column, so every list is stale the
      // moment it changes — not just the single quiz.
      queryClient.invalidateQueries({ queryKey: ["quiz"] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["myQuizzes"] });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: setQuizStatus,
  });
};
