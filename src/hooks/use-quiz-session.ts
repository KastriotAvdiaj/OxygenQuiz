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
import { QuizSession, CurrentQuestion, AnswerResult } from "@/pages/Quiz/Sessions/quiz-session-types";

interface UseQuizSessionParams {
  quizId: number;
  userId: string;
}

interface UseQuizSessionReturn {
  // State
  quizSession: QuizSession | null;
  currentQuestion: CurrentQuestion | null;
  lastAnswerResult: AnswerResult | null;
  currentQuestionNumber: number;
  error: string | null;
  retryCount: number;
  isValidationError: boolean;

  // Loading states
  isInitialLoading: boolean;
  isInitializing: boolean;

  // Actions
  handleRetry: () => void;
  fetchNextQuestion: (sessionId: string) => void;
  handleAnswerSubmissionSuccess: (answerResult: AnswerResult) => void;
  setLastAnswerResult: (result: AnswerResult | null) => void;
  setCurrentQuestionNumber: (value: number | ((prev: number) => number)) => void;
}

export const extractErrorMessage = (
  error: any,
  defaultMessage = "An error occurred"
): string => {
  return error?.response?.data?.message || error?.message || defaultMessage;
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


export const useQuizSession = ({
  quizId,
  userId,
}: UseQuizSessionParams): UseQuizSessionReturn => {
  const navigate = useNavigate();

  // Core state
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isValidationError, setIsValidationError] = useState(false);

  // API mutations
  const createSessionMutation = useCreateQuizSession();
  const getNextQuestionMutation = useGetNextQuestion();

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
  }

  // --- ‼️ FIX IS HERE ‼️ ---
  // Derived state based on actual data, not mutation timing.
  const isInitialLoading = (!quizSession || !currentQuestion) && !error;
  
  const isInitializing = initializationRef.current.isInitializing;

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
    if (initializationRef.current.hasInitialized || 
        initializationRef.current.isInitializing || 
        !quizId || 
        !userId) {
      return;
    }

    console.log("🚀 Initializing quiz session:", { quizId, userId, retryCount });

    try {
      initializationRef.current.isInitializing = true;
      setError(null);
      setIsValidationError(false);

      const sessionData = await createSessionMutation.mutateAsync({
        data: { quizId, userId }
      });

      console.log("✅ Session created successfully:", sessionData.id);

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
      
      // Setting session first, then fetching question
      setQuizSession(session);
      
      // These resets are still good practice
      setError(null);
      setRetryCount(0);
      setCurrentQuestionNumber(1);
      initializationRef.current.hasInitialized = true;

      fetchNextQuestion(session.id);
      
    } catch (err: any) {
      console.error("❌ Failed to create quiz session:", err);
      setError(extractErrorMessage(err, "Failed to start quiz session"));
      if (err?.response?.status >= 400 && err?.response?.status < 500) {
        setIsValidationError(true);
      }
    } finally {
      initializationRef.current.isInitializing = false;
    }
  }, [quizId, userId, retryCount, createSessionMutation, fetchNextQuestion]);

  useEffect(() => {
    if (!initializationRef.current.hasInitialized && 
        !initializationRef.current.isInitializing) {
      initializeQuizSession();
    }
  }, [initializeQuizSession]);

  const handleAnswerSubmissionSuccess = useCallback((answerResult: AnswerResult) => {
    setLastAnswerResult(answerResult);
    const delay = answerResult.isQuizComplete ? 1000 : 500;

    setTimeout(() => {
      setLastAnswerResult(null);
      if (answerResult.isQuizComplete) {
        navigate(`/quiz/results/${quizSession!.id}`);
      } else {
        setCurrentQuestionNumber((prev) => prev + 1);
        fetchNextQuestion(quizSession!.id);
      }
    }, delay);
  }, [navigate, quizSession, fetchNextQuestion]);

  const handleRetry = useCallback(() => {
    console.log("🔄 Retrying quiz session initialization");
    setIsValidationError(false);
    setRetryCount((prev) => prev + 1);
  }, []);

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
    handleRetry,
    fetchNextQuestion,
    handleAnswerSubmissionSuccess,
    setLastAnswerResult,
    setCurrentQuestionNumber,
  };
};