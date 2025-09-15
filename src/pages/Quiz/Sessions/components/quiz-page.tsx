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

  // Central hook for managing the entire quiz session flow.
  // It handles initialization, question fetching, and error states.
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
    isValidationError, // This flag is crucial for our specific error case
  } = useQuizSession({ quizId, userId });

  // API mutation for submitting an answer
  const submitAnswerMutation = useSubmitAnswer();

  // --- Derived State ---
  // Simple flags derived from hook/mutation state to keep render logic clean.
  const isSubmitting = submitAnswerMutation.isPending;
  const showInstantFeedback = quizSession?.hasInstantFeedback ?? false;

  // This is the key logic: The "Try Again" button should only be shown for
  // retryable errors (like network issues), not for validation errors
  // (like having an existing active session).
  const canRetry = !isValidationError;

  // --- Event Handlers ---
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
          // You could implement more robust UI feedback here if needed
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

  // --- Render Logic ---

  // 1. Show a loading screen during the initial session creation and first question fetch.
  if (isInitialLoading) {
    return <LoadingScreen theme={theme} message="Preparing your quiz..." />;
  }

  // 2. If an error occurs during initialization, show a detailed error screen.
  if (error) {
    return (
      <ErrorScreen
        theme={theme}
        error={error}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        isRetrying={isInitializing}
        canRetry={canRetry} // Pass the retry eligibility to the component
      />
    );
  }

  // 3. Fallback: If there's no error but the session still couldn't be created.
  if (!quizSession) {
    return (
      <ErrorScreen
        theme={theme}
        error="Unable to start quiz session. The session could not be found."
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        isRetrying={isInitialLoading}
        icon="warning"
        canRetry={canRetry} // Also respect the retry eligibility here
      />
    );
  }

  // 4. Success: Render the main quiz interface.
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
      category={quizSession.category}
    />
  );
}

// --- UI Components ---

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

const ErrorScreen = ({
  theme,
  error,
  onRetry,
  onGoBack,
  isRetrying,
  canRetry, // Receive the prop to determine if the "Try Again" button should render
  icon = "error",
}: {
  theme: any;
  error: string;
  onRetry: () => void;
  onGoBack: () => void;
  isRetrying: boolean;
  canRetry: boolean; // Prop is now required
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
    <div className="text-center space-y-6 max-w-md p-4">
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
        {/*
          This conditional rendering is the final piece of the puzzle.
          It prevents the user from trying to re-create a session when the
          backend has explicitly told them they have an active one.
        */}
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
