/**
 * A comprehensive hook to manage the state and flow of a single quiz-taking session.
 *
 * @description This hook is the central engine for a user's quiz experience. It handles:
 * 1. Creating a new quiz session on the backend.
 * 2. Fetching questions sequentially.
 * 3. Tracking the current question number and user progress.
 * 4. Managing loading, error, and validation states.
 * 5. Handling the result of an answer submission and navigating to the next question or the results page.
 * 6. Providing a retry mechanism for initialization failures.
 * 7. Tracking completed answer results for progress display.
 *
 * It encapsulates all the complex asynchronous logic, making the UI component (e.g., `QuizPage`) much simpler and focused on rendering.
 *
 * @param {UseQuizSessionParams} params - The parameters required to initialize the hook.
 * @param {number} params.quizId - The unique identifier for the quiz to be taken.
 * @param {string} params.userId - The unique identifier for the user taking the quiz.
 *
 * @returns {UseQuizSessionReturn} An object containing the state and action handlers for the quiz session.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateQuizSession } from "@/pages/Quiz/Sessions/api/create-quiz-session";
import { useGetNextQuestion } from "@/pages/Quiz/Sessions/api/get-next-question";
import { QuizSession, CurrentQuestion, InstantFeedbackAnswerResult } from "@/pages/Quiz/Sessions/quiz-session-types";

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
  completedAnswers: InstantFeedbackAnswerResult[]; // NEW: Track all completed answers

  // Loading states
  isInitialLoading: boolean;
  isInitializing: boolean;

  // Actions
  handleRetry: () => void;
  fetchNextQuestion: (sessionId: string) => void;
  handleAnswerSubmissionSuccess: (answerResult: InstantFeedbackAnswerResult) => void;
  setLastAnswerResult: (result: InstantFeedbackAnswerResult | null) => void;
  setCurrentQuestionNumber: (value: number | ((prev: number) => number)) => void;
}

// --- Helper Functions ---

export const extractErrorMessage = (
  error: any,
  defaultMessage = "An error occurred"
): string => {
  // Extracts a user-friendly error from a typical Axios error object.
  return error?.response?.data?.message || error?.message || defaultMessage;
};

const handleQuestionFetchError = (
  error: any,
  sessionId: string,
  navigate: ReturnType<typeof useNavigate>
): string => {
  const errorMessage = extractErrorMessage(error);

  // If the error indicates the quiz is done, navigate to results instead of showing an error.
  if (
    errorMessage.includes("completed") ||
    errorMessage.includes("No more questions")
  ) {
    navigate(`/quiz/results/${sessionId}`);
    return ""; // Return an empty string as the error is handled by navigation.
  }

  return `Failed to load next question: ${errorMessage}`;
};


// --- The Main Hook ---

export const useQuizSession = ({
  quizId,
  userId,
}: UseQuizSessionParams): UseQuizSessionReturn => {
  const navigate = useNavigate();

  // --- Core State ---
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<InstantFeedbackAnswerResult | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isValidationError, setIsValidationError] = useState(false);
  
  // NEW: Track completed answers for progress display
  const [completedAnswers, setCompletedAnswers] = useState<InstantFeedbackAnswerResult[]>([]);

  // --- API Mutations (from react-query/tanstack-query) ---
  const createSessionMutation = useCreateQuizSession();
  const getNextQuestionMutation = useGetNextQuestion();

  // --- Initialization Logic ---
  // A ref is used to track the initialization state across re-renders without causing them.
  const initializationRef = useRef<{
    hasInitialized: boolean;
    isInitializing: boolean;
  }>({
    hasInitialized: false,
    isInitializing: false,
  });

  // This ensures that when a retry is triggered (by incrementing retryCount),
  // the initialization state is fully reset.
  const dependencyKey = `${quizId}-${userId}-${retryCount}`;
  const lastDependencyKey = useRef(dependencyKey);
  
  if (lastDependencyKey.current !== dependencyKey) {
    initializationRef.current = {
      hasInitialized: false,
      isInitializing: false,
    };
    lastDependencyKey.current = dependencyKey;
    // Reset completed answers on retry
    setCompletedAnswers([]);
  }

  // --- Derived State ---
  // These are calculated on each render, providing a clear picture of the current UI state.
  const isInitialLoading = (!quizSession || !currentQuestion) && !error;
  const isInitializing = initializationRef.current.isInitializing;


  // --- Action Handlers (wrapped in useCallback for performance) ---

  const fetchNextQuestion = useCallback((sessionId: string) => {
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
          const errorMessage = handleQuestionFetchError(error, sessionId, navigate);
          if (errorMessage) {
            setError(errorMessage);
          }
        },
      }
    );
  }, [getNextQuestionMutation, navigate]);

  const initializeQuizSession = useCallback(async () => {
    // Guard clause to prevent multiple initializations.
    if (initializationRef.current.hasInitialized || 
        initializationRef.current.isInitializing || 
        !quizId || 
        !userId) {
      return;
    }

    try {
      initializationRef.current.isInitializing = true;
      setError(null);
      setIsValidationError(false);

      const sessionData = await createSessionMutation.mutateAsync({
        data: { quizId, userId }
      });

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
      setCurrentQuestionNumber(1);
      initializationRef.current.hasInitialized = true; // Mark initialization as successful

      fetchNextQuestion(session.id);
      
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to start quiz session"));
      
      // Specifically flag 4xx client errors as validation errors.
      if (err?.response?.status >= 400 && err?.response?.status < 500) {
        setIsValidationError(true);
      }
    } finally {
      initializationRef.current.isInitializing = false;
    }
  }, [quizId, userId, retryCount, createSessionMutation, fetchNextQuestion]);


  // --- Effect to Trigger Initialization ---
  // This effect runs on mount and whenever its dependencies change.

  // --- FIX #1: BREAK THE INFINITE LOOP  ---
  useEffect(() => {
    // The `!error` condition is the key to stopping the loop.
    // If an error has been set, this effect will NOT re-run `initializeQuizSession`,
    // preventing an infinite cycle of failed requests.
    if (
      !initializationRef.current.hasInitialized &&
      !initializationRef.current.isInitializing &&
      !error 
    ) {
      initializeQuizSession();
    }
  }, [initializeQuizSession, error]);


 const handleAnswerSubmissionSuccess = useCallback((answerResult: InstantFeedbackAnswerResult) => {
    const hasInstantFeedback = quizSession?.hasInstantFeedback ?? false;

    // IMPORTANT: Always track completed answers regardless of instant feedback setting
    // This ensures progress dots can show completion status
    setCompletedAnswers(prev => [...prev, answerResult]);

    if (answerResult.isQuizComplete) {
      // if (hasInstantFeedback) {
      //   navigate(`/quiz/results/${quizSession!.id}`);
      // } else {
      //   navigate(`/quiz/completing/${quizSession!.id}`);
      // }
       navigate(`/quiz/results/${quizSession!.id}`);
    } else {
      if (hasInstantFeedback) {
        setLastAnswerResult(answerResult);
      } else {
        setCurrentQuestionNumber((prev) => prev + 1);
        fetchNextQuestion(quizSession!.id);
      }
    }
  }, [navigate, quizSession, fetchNextQuestion]);

  const handleRetry = useCallback(() => {
    
    // Resetting the error state is essential. Without this, the `!error` condition
    // in the useEffect hook would remain false, preventing a new initialization attempt.
    setError(null);
    setIsValidationError(false);
    
    // Bumping the retry count triggers the ref reset logic and re-creates the
    // `initializeQuizSession` function with a fresh context.
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
    completedAnswers, // NEW: Expose completed answers
    handleRetry,
    fetchNextQuestion,
    handleAnswerSubmissionSuccess,
    setLastAnswerResult,
    setCurrentQuestionNumber,
  };
};