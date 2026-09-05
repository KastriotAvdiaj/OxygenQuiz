// src/components/quiz/QuizResultsRouteWrapper.tsx

import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizResults } from "./quiz-results";
import { QuizLoadingView } from "../quiz-loading-view";
import { useGetSessionResults } from "../../api/get-quiz-session";

export function QuizResultsRouteWrapper() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const {
    data: session,
    isLoading: loading,
    error,
    refetch: fetchSessionResults,
  } = useGetSessionResults({
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

  // Loading state — the same board as the rest of the quiz flow. The old markup had no
  // flex-1 and no height of its own, so it sat squashed against the top of the shell.
  if (loading) {
    return <QuizLoadingView words={["LOADING", "RESULTS"]} label="Loading your results" />;
  }

  // Error state
  if (error || !session) {
    return (
      <div className="flex flex-1 w-full items-center justify-center px-4 bg-background">
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
              className="flex items-center gap-2">
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

  return (
    // flex-1 column, not the old fixed `h-64`: h-64 pinned this box to 16rem, so QuizResults'
    // own flex-1 had nothing to fill and the content spilled out of a short box with dead
    // background under it. The padding clears the OVERLAY header this route uses — matching
    // the shell's own --header-height rather than a hard-coded 4rem.
    <div className="flex flex-1 flex-col pt-[var(--header-height,4rem)]">
      <QuizResults
        session={session}
        onRetryQuiz={handleRetryQuiz}
        onSelectNewQuiz={handleSelectNewQuiz}
      />
    </div>
  );
}
