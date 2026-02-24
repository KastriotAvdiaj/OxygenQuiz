/**
 * A comprehensive hook to manage the state and flow of a single quiz-taking session.
 *
 * @description This hook is the central engine for a user's quiz experience. It handles:
 * 1. Creating a new quiz session on the backend.
 * 2. Detecting and resuming existing active sessions.
 * 3. Fetching questions sequentially.
 * 4. Tracking the current question number and user progress.
 * 5. Managing loading, error, and validation states.
 * 6. Handling the result of an answer submission and navigating to the next question or the results page.
 * 7. Providing a retry mechanism for initialization failures.
 * 8. Tracking completed answer results for progress display.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateQuizSession } from "@/pages/Quiz/Sessions/api/create-quiz-session";
import { useGetNextQuestion } from "@/pages/Quiz/Sessions/api/get-next-question";
import { getQuizSession } from "@/pages/Quiz/Sessions/api/get-quiz-session";
import {
  resolveAndResume,
  abandonAndRestartSession,
  getUserSessions,
} from "@/pages/Quiz/Sessions/api/resume-quiz-session";
import {
  QuizSession,
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "@/pages/Quiz/Sessions/quiz-session-types";
import { useNotifications } from "@/common/Notifications";

interface UseQuizSessionParams {
  quizId: number;
  userId: string;
}

interface UseQuizSessionReturn {
  // State
  quizSession: QuizSession | null;
  currentQuestion: CurrentQuestion | null;
  lastAnswerResult: InstantFeedbackAnswerResult | null;
  currentQuestionNumber: number;
  error: string | null;
  retryCount: number;
  isValidationError: boolean;
  completedAnswers: InstantFeedbackAnswerResult[];

  // Active session state (for resume/abandon UI)
  existingActiveSession: QuizSession | null;

  // Loading states
  isInitialLoading: boolean;
  isInitializing: boolean;

  // Actions
  handleRetry: () => void;
  fetchNextQuestion: (sessionId: string) => void;
  handleAnswerSubmissionSuccess: (
    answerResult: InstantFeedbackAnswerResult
  ) => void;
  setLastAnswerResult: (result: InstantFeedbackAnswerResult | null) => void;
  setCurrentQuestionNumber: (
    value: number | ((prev: number) => number)
  ) => void;

  // Resume/Abandon actions
  handleResumeSession: () => void;
  handleAbandonAndRestart: () => void;
}

// --- Helper Functions ---

export const extractErrorMessage = (
  error: any,
  defaultMessage = "An error occurred"
): string => {
  return (
    error?.response?.data?.message || error?.message || defaultMessage
  );
};

const handleQuestionFetchError = (
  error: any,
  sessionId: string,
  navigate: ReturnType<typeof useNavigate>
): string => {
  const errorMessage = extractErrorMessage(error);

  if (
    errorMessage.includes("completed") ||
    errorMessage.includes("No more questions")
  ) {
    navigate(`/quiz/results/${sessionId}`);
    return "";
  }

  return `Failed to load next question: ${errorMessage}`;
};

/**
 * Detects if a backend error indicates an existing active session.
 */
const isActiveSessionError = (error: any): boolean => {
  const message = extractErrorMessage(error, "");
  return message.includes("active session");
};

// --- The Main Hook ---

export const useQuizSession = ({
  quizId,
  userId,
}: UseQuizSessionParams): UseQuizSessionReturn => {
  const navigate = useNavigate();

  // --- Core State ---
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<CurrentQuestion | null>(null);
  const [lastAnswerResult, setLastAnswerResult] =
    useState<InstantFeedbackAnswerResult | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isValidationError, setIsValidationError] = useState(false);
  const [completedAnswers, setCompletedAnswers] = useState<
    InstantFeedbackAnswerResult[]
  >([]);

  // --- Active Session State ---
  const [existingActiveSession, setExistingActiveSession] =
    useState<QuizSession | null>(null);

  // --- API Mutations ---
  const createSessionMutation = useCreateQuizSession();
  const getNextQuestionMutation = useGetNextQuestion();

  // --- Initialization Logic ---
  const initializationRef = useRef<{
    hasInitialized: boolean;
    isInitializing: boolean;
  }>({
    hasInitialized: false,
    isInitializing: false,
  });

  const dependencyKey = `${quizId}-${userId}-${retryCount}`;
  const lastDependencyKey = useRef(dependencyKey);

  if (lastDependencyKey.current !== dependencyKey) {
    initializationRef.current = {
      hasInitialized: false,
      isInitializing: false,
    };
    lastDependencyKey.current = dependencyKey;
    setCompletedAnswers([]);
    setExistingActiveSession(null);
  }

  // --- Derived State ---
  const isInitialLoading =
    (!quizSession || !currentQuestion) && !error && !existingActiveSession;
  const isInitializing = initializationRef.current.isInitializing;

  // --- Action Handlers ---

  const fetchNextQuestion = useCallback(
    (sessionId: string) => {
      setLastAnswerResult(null);
      setCurrentQuestion(null);
      setError(null);

      getNextQuestionMutation.mutate(
        { sessionId },
        {
          onSuccess: (questionData) => {
            setCurrentQuestion(questionData);
          },
          onError: (error: any) => {
            console.error("Failed to get next question:", error);
            const errorMessage = handleQuestionFetchError(
              error,
              sessionId,
              navigate
            );
            if (errorMessage) {
              setError(errorMessage);
            }
          },
        }
      );
    },
    [getNextQuestionMutation, navigate]
  );

  /**
   * Sets session state and fetches the first question — shared between create & resume flows.
   */
  const activateSession = useCallback(
    (sessionData: QuizSession, answeredCount: number = 0) => {
      const session: QuizSession = {
        quizId: sessionData.quizId,
        userId: sessionData.userId,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        totalScore: sessionData.totalScore,
        isCompleted: sessionData.isCompleted,
        userAnswers: sessionData.userAnswers,
        id: sessionData.id,
        quizTitle: sessionData.quizTitle,
        totalQuestions: sessionData.totalQuestions,
        hasInstantFeedback: sessionData.hasInstantFeedback,
        category: sessionData.category,
      };

      setQuizSession(session);
      setError(null);
      setExistingActiveSession(null);
      setCurrentQuestionNumber(answeredCount + 1);
      initializationRef.current.hasInitialized = true;

      fetchNextQuestion(session.id);
    },
    [fetchNextQuestion]
  );

  /**
   * Resumes an existing active session using the backend's mathematical catch-up.
   * The backend auto-times-out expired questions and returns the correct resume point.
   */
  const handleResumeSession = useCallback(async () => {
    if (!existingActiveSession) return;

    try {
      setError(null);
      initializationRef.current.isInitializing = true;

      // Single call — backend resolves all timed-out questions and returns the correct state
      const result = await resolveAndResume({
        sessionId: existingActiveSession.id,
        userId,
      });

      setQuizSession(result.session);
      setExistingActiveSession(null);
      initializationRef.current.hasInitialized = true;

      if (result.isQuizComplete) {
        // All remaining questions timed out while the user was away
        navigate(`/quiz/results/${result.session.id}`);
        return;
      }

      if (result.activeQuestion) {
        // Resume on the resolved question with adjusted time
        setCurrentQuestion(result.activeQuestion);
        setCurrentQuestionNumber(result.questionNumber);
      } else {
        // Fallback: fetch next question (shouldn't normally happen)
        setCurrentQuestionNumber(result.questionNumber);
        fetchNextQuestion(result.session.id);
      }
    } catch (err: any) {
      setError(
        extractErrorMessage(err, "Failed to resume session. Please try again.")
      );
    } finally {
      initializationRef.current.isInitializing = false;
    }
  }, [existingActiveSession, userId, navigate, fetchNextQuestion]);

  /**
   * Abandons the existing session and creates a fresh one.
   */
  const handleAbandonAndRestart = useCallback(async () => {
    if (!existingActiveSession) return;

    try {
      setError(null);
      initializationRef.current.isInitializing = true;

      const sessionData = await abandonAndRestartSession({
        sessionId: existingActiveSession.id,
        data: { quizId, userId },
      });

      activateSession(sessionData, 0);
    } catch (err: any) {
      setError(
        extractErrorMessage(
          err,
          "Failed to restart session. Please try again."
        )
      );
    } finally {
      initializationRef.current.isInitializing = false;
    }
  }, [existingActiveSession, quizId, userId, activateSession]);

  const initializeQuizSession = useCallback(async () => {
    if (
      initializationRef.current.hasInitialized ||
      initializationRef.current.isInitializing ||
      !quizId ||
      !userId
    ) {
      return;
    }

    try {
      initializationRef.current.isInitializing = true;
      setError(null);
      setIsValidationError(false);
      setExistingActiveSession(null);

      const sessionData = await createSessionMutation.mutateAsync({
        data: { quizId, userId },
      });

      activateSession(sessionData, 0);
    } catch (err: any) {
      // Check if the error is for an existing active session
      if (isActiveSessionError(err)) {
        // Dismiss the Axios interceptor's error notification — we handle this gracefully
        const notifications = useNotifications.getState().notifications;
        const latest = notifications[notifications.length - 1];
        if (latest) {
          useNotifications.getState().dismissNotification(latest.id);
        }

        // Fetch the user's session summaries to find the active one for this quiz
        try {
          const summaries = await getUserSessions({ userId });
          const activeSummary = summaries.find(
            (s) => s.quizId === quizId && !s.isCompleted
          );

          if (activeSummary) {
            // Fetch the full session DTO (with userAnswers, instant feedback flag, etc.)
            const fullSession = await getQuizSession({ sessionId: activeSummary.id });
            setExistingActiveSession(fullSession);
            // Don't set an error — the UI will show the resume/abandon screen
            return;
          }
        } catch {
          // If fetching sessions also fails, fall through to generic error
        }
      }

      setError(extractErrorMessage(err, "Failed to start quiz session"));

      if (err?.response?.status >= 400 && err?.response?.status < 500) {
        setIsValidationError(true);
      }
    } finally {
      initializationRef.current.isInitializing = false;
    }
  }, [quizId, userId, retryCount, createSessionMutation, activateSession]);

  // --- Effect to Trigger Initialization ---
  useEffect(() => {
    if (
      !initializationRef.current.hasInitialized &&
      !initializationRef.current.isInitializing &&
      !error &&
      !existingActiveSession
    ) {
      initializeQuizSession();
    }
  }, [initializeQuizSession, error, existingActiveSession]);

  const handleAnswerSubmissionSuccess = useCallback(
    (answerResult: InstantFeedbackAnswerResult) => {
      const hasInstantFeedback = quizSession?.hasInstantFeedback ?? false;

      setCompletedAnswers((prev) => [...prev, answerResult]);

      if (answerResult.isQuizComplete) {
        navigate(`/quiz/results/${quizSession!.id}`);
      } else {
        if (hasInstantFeedback) {
          setLastAnswerResult(answerResult);
        } else {
          setCurrentQuestionNumber((prev) => prev + 1);
          fetchNextQuestion(quizSession!.id);
        }
      }
    },
    [navigate, quizSession, fetchNextQuestion]
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setIsValidationError(false);
    setExistingActiveSession(null);
    setRetryCount((prev) => prev + 1);
  }, []);

  // --- Returned Values ---
  return {
    quizSession,
    currentQuestion,
    lastAnswerResult,
    currentQuestionNumber,
    error,
    retryCount,
    isValidationError,
    isInitialLoading,
    isInitializing,
    completedAnswers,
    existingActiveSession,
    handleRetry,
    fetchNextQuestion,
    handleAnswerSubmissionSuccess,
    setLastAnswerResult,
    setCurrentQuestionNumber,
    handleResumeSession,
    handleAbandonAndRestart,
  };
};