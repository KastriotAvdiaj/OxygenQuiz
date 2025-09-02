import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Assuming you use React Router
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnswerResult, CurrentQuestion } from "../quiz-session-types";
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
  // This would come from your auth context in a real app
  userId: string;
  // Optional category theming props
  categoryColorPalette?: CategoryColorPalette;
  quizTitle?: string;
  totalQuestions?: number;
}

export function QuizPage({
  quizId,
  userId,
  categoryColorPalette,
  quizTitle,
  totalQuestions,
}: QuizPageProps) {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<CurrentQuestion | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  // Instant feedback state
  const [showInstantFeedback, setShowInstantFeedback] =
    useState<boolean>(false);

  // Apply category-based theming
  const theme = useQuizTheme({
    colorPalette: categoryColorPalette,
  });

  // --- API Mutations ---
  const createSessionMutation = useCreateQuizSession();
  const getNextQuestionMutation = useGetNextQuestion();
  const submitAnswerMutation = useSubmitAnswer();

  // --- Effect to Start the Quiz ---
  // This runs only once when the component mounts to create the session.
  useEffect(() => {
    setError(null); // Clear any previous errors
    createSessionMutation.mutate(
      { data: { quizId, userId } },
      {
        onSuccess: (data) => {
          setSessionId(data.id);
          setError(null);
          setRetryCount(0);
          // Immediately fetch the first question
          handleNextQuestion(data.id);
        },
        onError: (error: any) => {
          console.error("Failed to create quiz session:", error);
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to start quiz session";
          setError(errorMessage);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, userId, retryCount]); // Include retryCount to allow retries

  // --- Handler Functions ---
  const handleNextQuestion = (currentSessionId: string) => {
    setLastAnswerResult(null); // Clear previous answer feedback
    setCurrentQuestion(null); // Show loading state
    setError(null); // Clear any previous errors

    getNextQuestionMutation.mutate(
      { sessionId: currentSessionId },
      {
        onSuccess: (data) => {
          setCurrentQuestion(data);
          // Update question number when we get a new question
          setCurrentQuestionNumber((prev) => prev + 1);
        },
        onError: (error: any) => {
          console.error("Failed to get next question:", error);

          // Check if this is a network error or quiz completion
          const errorMessage = error?.response?.data?.message || error?.message;

          if (
            errorMessage?.includes("completed") ||
            errorMessage?.includes("No more questions")
          ) {
            // Quiz is completed, navigate to results
            navigate(`/quiz/results/${currentSessionId}`);
          } else {
            // This is likely a network or session error
            setError(
              `Failed to load next question: ${
                errorMessage || "Please check your connection and try again."
              }`
            );
          }
        },
      }
    );
  };

  const handleSubmitAnswer = (
    selectedOptionId: number | null,
    submittedAnswer?: string
  ) => {
    if (!sessionId || !currentQuestion) return;

    // Prevent multiple submissions while one is in progress
    if (submitAnswerMutation.isPending) return;

    submitAnswerMutation.mutate(
      {
        data: {
          sessionId,
          quizQuestionId: currentQuestion.quizQuestionId,
          selectedOptionId,
          submittedAnswer,
        },
      },
      {
        onSuccess: (data) => {
          setLastAnswerResult(data);

          // Check if current question has instant feedback enabled
          if (currentQuestion?.instantFeedback) {
            // Show instant feedback
            setShowInstantFeedback(true);

            // Auto-advance to next question after showing feedback
            setTimeout(() => {
              setShowInstantFeedback(false);
              setLastAnswerResult(null);
              if (data.isQuizComplete) {
                navigate(`/quiz/results/${sessionId}`);
              } else {
                handleNextQuestion(sessionId);
              }
            }, 3000); // Show feedback for 3 seconds
          } else {
            // Traditional feedback flow
            if (data.isQuizComplete) {
              // Small delay to show the feedback before navigating
              setTimeout(() => {
                navigate(`/quiz/results/${sessionId}`);
              }, 2000);
            }
          }
        },
        onError: (error) => {
          console.error("Failed to submit answer:", error);
          // Show user-friendly error message
          const errorMessage = error?.message || "Failed to submit answer";
          setError(`Answer submission failed: ${errorMessage}`);
        },
      }
    );
  };

  // --- Render Logic ---
  const isLoading =
    createSessionMutation.isPending || getNextQuestionMutation.isPending;

  if (isLoading && !currentQuestion) {
    return (
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
          <p className="quiz-text-primary text-xl font-medium">
            Preparing your quiz...
          </p>
          <div className="w-32 h-2 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-quiz-primary rounded-full quiz-animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Handle retry functionality
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleGoBack = () => {
    navigate("/choose-quiz");
  };

  // Show error state with retry option
  if (error) {
    return (
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
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-red-400">
            Quiz Session Error
          </h2>
          <p className="text-gray-300">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleRetry}
              disabled={createSessionMutation.isPending}
              className="flex items-center gap-2"
            >
              {createSessionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Try Again
            </Button>
            <Button onClick={handleGoBack} variant="outline">
              Back to Quiz Selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    // This state could be shown if session creation fails for some reason.
    return (
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
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto" />
          <p className="text-xl">Unable to start quiz session</p>
          <Button onClick={handleRetry}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <QuizInterface
      sessionId={sessionId}
      currentQuestion={currentQuestion}
      lastAnswerResult={lastAnswerResult}
      isSubmitting={submitAnswerMutation.isPending}
      onNextQuestion={() => handleNextQuestion(sessionId)}
      onSubmitAnswer={handleSubmitAnswer}
      categoryColorPalette={categoryColorPalette}
      currentQuestionNumber={currentQuestionNumber}
      totalQuestions={totalQuestions}
      showInstantFeedback={showInstantFeedback}
    />
  );
}
