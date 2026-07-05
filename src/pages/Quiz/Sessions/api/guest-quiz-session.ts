// Guest play (see docs/auth/guest-play.md): same shapes as the authenticated quiz-session API,
// but talking to the anonymous /guest-quiz-sessions surface instead of /QuizSessions. Kept as a
// separate file (mirroring the separate backend controller) so the authenticated flow's
// resume/abandon logic never has to know guest play exists.

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { MutationConfig, QueryConfig } from "@/lib/React-query";
import {
  QuizSession,
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../quiz-session-types";
import { SubmitAnswerInput } from "./submit-answer";

export const getGuestCanPlay = (): Promise<{ canPlay: boolean }> => {
  return apiService.get("/guest-quiz-sessions/can-play");
};

export const useGuestCanPlay = ({ enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: ["guest-can-play"],
    queryFn: getGuestCanPlay,
    staleTime: 0,
    enabled,
  });
};

export const createGuestQuizSession = ({
  quizId,
}: {
  quizId: number;
}): Promise<QuizSession> => {
  return apiService.post("/guest-quiz-sessions", { quizId });
};

export const useCreateGuestQuizSession = ({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof createGuestQuizSession> } = {}) => {
  return useMutation({
    mutationFn: createGuestQuizSession,
    ...mutationConfig,
  });
};

export const getGuestNextQuestion = ({
  sessionId,
}: {
  sessionId: string;
}): Promise<CurrentQuestion> => {
  return apiService.get(`/guest-quiz-sessions/${sessionId}/next-question`);
};

export const useGetGuestNextQuestion = ({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof getGuestNextQuestion> } = {}) => {
  return useMutation({
    mutationFn: getGuestNextQuestion,
    ...mutationConfig,
  });
};

export const submitGuestAnswer = ({
  data,
}: {
  data: SubmitAnswerInput;
}): Promise<InstantFeedbackAnswerResult> => {
  return apiService.post("/guest-quiz-sessions/answer", data);
};

export const useSubmitGuestAnswer = ({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof submitGuestAnswer> } = {}) => {
  return useMutation({
    mutationFn: submitGuestAnswer,
    ...mutationConfig,
  });
};

export const getGuestSessionResults = ({
  sessionId,
}: {
  sessionId: string;
}): Promise<QuizSession> => {
  return apiService.get(`/guest-quiz-sessions/${sessionId}/results`);
};

export const useGetGuestSessionResults = ({
  sessionId,
  queryConfig,
}: {
  sessionId: string;
  queryConfig?: QueryConfig<typeof getGuestSessionResults>;
}) => {
  return useQuery({
    queryKey: ["guest-quiz-session-results", sessionId],
    queryFn: () => getGuestSessionResults({ sessionId }),
    enabled: !!sessionId,
    ...queryConfig,
  });
};

/**
 * Spends this browser's one free guest quiz: permanently deletes the session/answers on the
 * backend and sets the guest_played cookie. Call once the guest has seen their results.
 */
export const finishGuestSession = ({
  sessionId,
}: {
  sessionId: string;
}): Promise<void> => {
  return apiService.post(`/guest-quiz-sessions/${sessionId}/finish`);
};

export const useFinishGuestSession = ({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof finishGuestSession> } = {}) => {
  return useMutation({
    mutationFn: finishGuestSession,
    ...mutationConfig,
  });
};
