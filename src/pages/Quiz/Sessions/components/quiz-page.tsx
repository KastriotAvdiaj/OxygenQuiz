// src/components/quiz/QuizPage.tsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AnswerResult,
  CurrentQuestion,
  QuizSession,
} from "../quiz-session-types";
import { useCreateQuizSession } from "../api/create-quiz-session";
import { useGetNextQuestion } from "../api/get-next-question";
import { useSubmitAnswer } from "../api/submit-answer";
import { QuizInterface } from "./quiz-interface";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";

interface QuizPageProps {
  quizId: number;
  userId: string;
  categoryColorPalette?: CategoryColorPalette;
}

export function QuizPage({
  quizId,
  userId,
  categoryColorPalette,
}: QuizPageProps) {
  const navigate = useNavigate();

  // Core state
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [showInstantFeedback, setShowInstantFeedback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // New state for better UX
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);

  // Apply category-based theming
  const theme = useQuizTheme({ colorPalette: categoryColorPalette });

  // API mutations
  const createSessionMutation = useCreateQuizSession();
  const getNextQuestionMutation = useGetNextQuestion();
  const submitAnswerMutation = useSubmitAnswer();

  // Derived state
  const isInitialLoading =
    createSessionMutation.isPending ||
    (getNextQuestionMutation.isPending && !currentQuestion);
  const isSubmitting = submitAnswerMutation.isPending;

  // Initialize quiz session
  useEffect(() => {
    initializeQuizSession();
  }, [quizId, userId, retryCount]);

  const initializeQuizSession = useCallback(() => {
    setError(null);
    setIsTransitioning(false);
    setShowFeedbackOverlay(false);

    createSessionMutation.mutate(
      { data: { quizId, userId } },
      {
        onSuccess: (sessionData) => {
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
          setShowInstantFeedback(session.hasInstantFeedback);
          setError(null);
          setRetryCount(0);
          setCurrentQuestionNumber(1);

          // Fetch first question
          fetchNextQuestion(session.id);
        },
        onError: (error: any) => {
          console.error("Failed to create quiz session:", error);
          setError(extractErrorMessage(error, "Failed to start quiz session"));
        },
      }
    );
  }, [quizId, userId, retryCount]);

  const fetchNextQuestion = useCallback((sessionId: string) => {
    setLastAnswerResult(null);
    setShowFeedbackOverlay(false);
    setError(null);
    
    // Don't set currentQuestion to null immediately to avoid flash
    // Let the transition handle it
    
    getNextQuestionMutation.mutate(
      { sessionId },
      {
        onSuccess: (questionData) => {
          setCurrentQuestion(questionData);
          setIsTransitioning(false);
        },
        onError: (error: any) => {
          console.error("Failed to get next question:", error);
          handleQuestionFetchError(error, sessionId);
        },
      }
    );
  }, []);

  const handleQuestionFetchError = (error: any, sessionId: string) => {
    const errorMessage = extractErrorMessage(error);

    if (
      errorMessage.includes("completed") ||
      errorMessage.includes("No more questions")
    ) {
      navigate(`/quiz/results/${sessionId}`);
    } else {
      setError(`Failed to load next question: ${errorMessage}`);
    }
  };

  const handleSubmitAnswer = useCallback((
    selectedOptionId: number | null,
    submittedAnswer?: string
  ) => {
    if (!quizSession?.id || !currentQuestion || isSubmitting) return;

    submitAnswerMutation.mutate(
      {
        data: {
          sessionId: quizSession.id,
          quizQuestionId: currentQuestion.quizQuestionId,
          selectedOptionId,
          submittedAnswer,
        },
      },
      {
        onSuccess: (answerResult) => {
          handleAnswerSubmissionSuccess(answerResult);
        },
        onError: (error) => {
          console.error("Failed to submit answer:", error);
          setError(`Answer submission failed: ${extractErrorMessage(error)}`);
        },
      }
    );
  }, [quizSession?.id, currentQuestion, isSubmitting]);

  const handleAnswerSubmissionSuccess = useCallback((answerResult: AnswerResult) => {
    setLastAnswerResult(answerResult);

    if (showInstantFeedback) {
      // For instant feedback, show overlay immediately
      setShowFeedbackOverlay(true);
      
      // Auto-advance after showing feedback
      setTimeout(() => {
        proceedToNextQuestion(answerResult);
      }, 2500); // Give time to read feedback
    } else {
      // For non-instant feedback, proceed immediately with no delay
      proceedToNextQuestion(answerResult);
    }
  }, [showInstantFeedback]);

  const proceedToNextQuestion = useCallback((answerResult: AnswerResult) => {
    if (answerResult.isQuizComplete) {
      navigate(`/quiz/results/${quizSession!.id}`);
    } else {
      setIsTransitioning(true);
      setShowFeedbackOverlay(false);
      setCurrentQuestionNumber((prev) => prev + 1);
      
      // Start fetching next question immediately
      fetchNextQuestion(quizSession!.id);
    }
  }, [navigate, quizSession?.id, fetchNextQuestion]);

  const handleNextQuestion = useCallback(() => {
    if (lastAnswerResult) {
      proceedToNextQuestion(lastAnswerResult);
    } else if (quizSession?.id) {
      setIsTransitioning(true);
      setCurrentQuestionNumber((prev) => prev + 1);
      fetchNextQuestion(quizSession.id);
    }
  }, [lastAnswerResult, quizSession?.id, proceedToNextQuestion, fetchNextQuestion]);

  const handleRetry = () => setRetryCount((prev) => prev + 1);
  const handleGoBack = () => navigate("/choose-quiz");

  // Helper function to extract error messages
  const extractErrorMessage = (
    error: any,
    defaultMessage = "An error occurred"
  ) => {
    return error?.response?.data?.message || error?.message || defaultMessage;
  };

  // Render loading state
  if (isInitialLoading) {
    return <LoadingScreen theme={theme} message="Preparing your quiz..." />;
  }

  // Render error state
  if (error) {
    return (
      <ErrorScreen
        theme={theme}
        error={error}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        isRetrying={createSessionMutation.isPending}
      />
    );
  }

  // Render session not available state
  if (!quizSession) {
    return (
      <ErrorScreen
        theme={theme}
        error="Unable to start quiz session"
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        isRetrying={createSessionMutation.isPending}
        icon="warning"
      />
    );
  }

  return (
    <QuizInterface
      sessionId={quizSession.id}
      currentQuestion={currentQuestion}
      lastAnswerResult={lastAnswerResult}
      isSubmitting={isSubmitting}
      onNextQuestion={handleNextQuestion}
      onSubmitAnswer={handleSubmitAnswer}
      categoryColorPalette={categoryColorPalette}
      currentQuestionNumber={currentQuestionNumber}
      totalQuestions={quizSession.totalQuestions}
      showInstantFeedback={showInstantFeedback}
      showFeedbackOverlay={showFeedbackOverlay}
      isTransitioning={isTransitioning}
      quizTitle={quizSession.quizTitle}
      quizDescription={quizSession.quizDescription}
      category={quizSession.category}
    />
  );
}

// Loading Screen Component
const LoadingScreen = ({ theme, message }: { theme: any; message: string }) => (
  <div
    className="flex h-screen w-full items-center justify-center"
    style={{
      background: `
        radial-gradient(circle at 20% 80%, ${theme.primary}15 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, ${theme.secondary}15 0%, transparent 50%),
        hsl(var(--background))
      `,
      ...theme.cssVars,
    }}
  >
    <div className="quiz-card-elevated p-8 text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-quiz-primary" />
      <p className="quiz-text-primary text-xl font-medium">{message}</p>
      <div className="w-32 h-2 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
        <div
          className="h-full bg-quiz-primary rounded-full quiz-animate-pulse"
          style={{ width: "60%" }}
        />
      </div>
    </div>
  </div>
);

// Error Screen Component
const ErrorScreen = ({
  theme,
  error,
  onRetry,
  onGoBack,
  isRetrying,
  icon = "error",
}: {
  theme: any;
  error: string;
  onRetry: () => void;
  onGoBack: () => void;
  isRetrying: boolean;
  icon?: "error" | "warning";
}) => (
  <div
    className="flex h-screen w-full items-center justify-center"
    style={{
      background: `
        radial-gradient(circle at 20% 80%, ${theme.primary}15 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, ${theme.secondary}15 0%, transparent 50%),
        hsl(var(--background))
      `,
      ...theme.cssVars,
    }}
  >
    <div className="text-center space-y-6 max-w-md">
      <AlertCircle
        className={`h-16 w-16 mx-auto ${
          icon === "error" ? "text-red-400" : "text-yellow-400"
        }`}
      />
      <h2
        className={`text-2xl font-bold ${
          icon === "error" ? "text-red-400" : "text-yellow-400"
        }`}
      >
        Quiz Session Error
      </h2>
      <p className="text-gray-300">{error}</p>
      <div className="flex gap-4 justify-center">
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-2"
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Try Again
        </Button>
        <Button onClick={onGoBack} variant="outline">
          Back to Quiz Selection
        </Button>
      </div>
    </div>
  </div>
);