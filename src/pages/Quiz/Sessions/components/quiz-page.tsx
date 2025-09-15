import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitAnswer } from "../api/submit-answer";
import { QuizInterface } from "./quiz-interface";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";
import { useQuizSession } from "@/hooks/use-quiz-session";

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

  // Apply category-based theming
  const theme = useQuizTheme({ colorPalette: categoryColorPalette });

  // Quiz session management
  const {
    quizSession,
    currentQuestion,
    lastAnswerResult,
    currentQuestionNumber,
    error,
    isInitialLoading,
    isInitializing,
    handleRetry,
    handleAnswerSubmissionSuccess,
    setCurrentQuestionNumber,
    fetchNextQuestion,
    isValidationError, // FIX: Get new state from hook
  } = useQuizSession({ quizId, userId }); // FIX: Removed unused 'setLastAnswerResult'

  // API mutations
  const submitAnswerMutation = useSubmitAnswer();

  // Derived state
  const isSubmitting = submitAnswerMutation.isPending;
  // FIX: Removed unused useState for `showInstantFeedback` and derived it from the session
  const showInstantFeedback = quizSession?.hasInstantFeedback ?? false;
  // FIX: Create a flag to determine if the error is retryable
  const canRetry = !isValidationError;

  const handleSubmitAnswer = (
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
        },
      }
    );
  };

  const handleGoBack = () => navigate("/choose-quiz");

  const handleNextQuestion = () => {
    if (quizSession?.id) {
      setCurrentQuestionNumber((prev) => prev + 1);
      fetchNextQuestion(quizSession.id);
    }
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
        isRetrying={isInitializing}
        canRetry={canRetry} // FIX: Pass retry eligibility to the error screen
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
        isRetrying={isInitialLoading}
        icon="warning"
        canRetry={canRetry} // FIX: Also pass retry eligibility here
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
      quizTitle={quizSession.quizTitle}
      // FIX: Removed 'quizDescription' as it does not exist on the session object
      category={quizSession.category}
    />
  );
}

// Loading Screen Component
const LoadingScreen = ({ theme, message }: { theme: any; message: string }) => (
  // ... (no changes needed here)
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
  canRetry = true, // FIX: Added canRetry prop to conditionally show the button
  icon = "error",
}: {
  theme: any;
  error: string;
  onRetry: () => void;
  onGoBack: () => void;
  isRetrying: boolean;
  canRetry?: boolean; // FIX: Added prop to type definition
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
        {/* FIX: Only render the "Try Again" button if the error is retryable */}
        {canRetry && (
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
        )}
        <Button onClick={onGoBack} variant="outline">
          Back to Quiz Selection
        </Button>
      </div>
    </div>
  </div>
);
