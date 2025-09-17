// src/components/quiz/QuizResultsRouteWrapper.tsx

import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizResults } from "./quiz-results";
import { AnswerReview } from "./answer-review";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";
import { useGetQuizSession } from "../api/get-quiz-session";

interface QuizResultsRouteWrapperProps {
  // Optional category theming props
  categoryColorPalette?: CategoryColorPalette;
}

export function QuizResultsRouteWrapper({
  categoryColorPalette,
}: QuizResultsRouteWrapperProps) {
  const { sessionId, view } = useParams<{ sessionId: string; view?: string }>();
  const navigate = useNavigate();

  // Apply category-based theming
  const theme = useQuizTheme({
    colorPalette: categoryColorPalette,
  });

  // Use React Query hook to fetch quiz session data
  const {
    data: session,
    isLoading: loading,
    error,
    refetch: fetchSessionResults,
  } = useGetQuizSession({
    sessionId: sessionId || "",
  });

  const handleRetryQuiz = () => {
    if (session) {
      navigate(`/quiz/${session.quizId}`);
    }
  };

  const handleSelectNewQuiz = () => {
    navigate("/choose-quiz");
  };

  // Loading state
  if (loading) {
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
            Loading your results...
          </p>
          <div className="w-32 h-2 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-quiz-primary rounded-full quiz-animate-pulse"
              style={{ width: "70%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
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
            Unable to Load Results
          </h2>
          <p className="text-gray-300">
            {error?.message || "Quiz session not found"}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => fetchSessionResults()}
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => navigate("/choose-quiz")} variant="outline">
              Back to Quiz Selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate view
  if (view === "review") {
    return <AnswerReview session={session} theme={theme} />;
  }

  return (
    <QuizResults
      session={session}
      theme={theme}
      onRetryQuiz={handleRetryQuiz}
      onSelectNewQuiz={handleSelectNewQuiz}
    />
  );
}
