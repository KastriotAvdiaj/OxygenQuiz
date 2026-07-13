/**
 * Drives a guest (no-account) singleplayer quiz attempt — see docs/auth/guest-play.md.
 *
 * Deliberately much simpler than `useQuizSession`: there is no "resume an existing session"
 * concept (a guest only ever has the one session this hook just created) and no abandon/restart
 * flow, since a guest only gets one attempt per browser. It exists as its own hook rather than a
 * branch inside `useQuizSession` so the authenticated flow's resume/abandon state machine never
 * has to reason about guests.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateGuestQuizSession, useGetGuestNextQuestion } from "@/pages/Quiz/Sessions/api/guest-quiz-session";
import { QuizSession, CurrentQuestion, InstantFeedbackAnswerResult } from "@/types/quiz-session-types";
import { extractErrorMessage } from "./use-quiz-session";

interface UseGuestQuizSessionParams {
  quizId: number;
}

export const useGuestQuizSession = ({ quizId }: UseGuestQuizSessionParams) => {
  const navigate = useNavigate();

  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<InstantFeedbackAnswerResult | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [completedAnswers, setCompletedAnswers] = useState<InstantFeedbackAnswerResult[]>([]);

  const createSessionMutation = useCreateGuestQuizSession();
  const getNextQuestionMutation = useGetGuestNextQuestion();

  const hasInitialized = useRef(false);

  const fetchNextQuestion = useCallback(
    (sessionId: string) => {
      setLastAnswerResult(null);
      setCurrentQuestion(null);
      setError(null);

      getNextQuestionMutation.mutate(
        { sessionId },
        {
          onSuccess: (questionData) => setCurrentQuestion(questionData),
          onError: (err: any) => {
            const message = extractErrorMessage(err);
            if (message.includes("completed") || message.includes("No more questions")) {
              navigate(`/quiz/results-guest/${sessionId}`);
              return;
            }
            setError(`Failed to load next question: ${message}`);
          },
        }
      );
    },
    [getNextQuestionMutation, navigate]
  );

  useEffect(() => {
    if (hasInitialized.current) return;

    // Guard an invalid quiz id (e.g. a non-numeric URL param → NaN) with a clear
    // error rather than silently leaving the page on "Preparing your quiz..." forever.
    if (!quizId) {
      hasInitialized.current = true;
      setError("This quiz could not be found.");
      return;
    }

    hasInitialized.current = true;

    createSessionMutation.mutate(
      { quizId },
      {
        onSuccess: (sessionData) => {
          setQuizSession(sessionData);
          fetchNextQuestion(sessionData.id);
        },
        onError: (err: any) => {
          setError(extractErrorMessage(err, "Failed to start guest quiz session"));
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const handleAnswerSubmissionSuccess = useCallback(
    (answerResult: InstantFeedbackAnswerResult) => {
      const hasInstantFeedback = quizSession?.hasInstantFeedback ?? false;
      setCompletedAnswers((prev) => [...prev, answerResult]);

      if (hasInstantFeedback) {
        setLastAnswerResult(answerResult);
      } else if (answerResult.isQuizComplete) {
        navigate(`/quiz/results-guest/${quizSession!.id}`);
      } else {
        setCurrentQuestionNumber((prev) => prev + 1);
        fetchNextQuestion(quizSession!.id);
      }
    },
    [navigate, quizSession, fetchNextQuestion]
  );

  return {
    quizSession,
    currentQuestion,
    lastAnswerResult,
    currentQuestionNumber,
    error,
    completedAnswers,
    isInitialLoading: !quizSession || (!currentQuestion && !error),
    setCurrentQuestionNumber,
    fetchNextQuestion,
    handleAnswerSubmissionSuccess,
  };
};
