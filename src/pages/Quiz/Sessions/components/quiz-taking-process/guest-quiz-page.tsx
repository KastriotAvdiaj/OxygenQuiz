import { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitGuestAnswer } from "../../api/guest-quiz-session";
import { QuizInterface } from "./quiz-interface";
import { QuizLoadingView } from "../quiz-loading-view";
import { useGuestQuizSession } from "@/hooks/use-guest-quiz-session";

interface GuestQuizPageProps {
  quizId: number;
}

/** Guest-play counterpart of QuizPage — see docs/auth/guest-play.md. No resume/abandon UI: a guest
 * only ever has the one session this page creates. */
export function GuestQuizPage({ quizId }: GuestQuizPageProps) {
  const navigate = useNavigate();

  const {
    quizSession,
    currentQuestion,
    lastAnswerResult,
    currentQuestionNumber,
    error,
    completedAnswers,
    handleAnswerSubmissionSuccess,
    setCurrentQuestionNumber,
    fetchNextQuestion,
  } = useGuestQuizSession({ quizId });

  const submitAnswerMutation = useSubmitGuestAnswer();
  const isSubmitting = submitAnswerMutation.isPending;
  const showInstantFeedback = quizSession?.hasInstantFeedback ?? false;

  // Same latency-compensated think-time measurement as QuizPage (docs/quiz/quiz-grading.md).
  const questionShownAtRef = useRef<number | null>(null);
  useEffect(() => {
    questionShownAtRef.current = currentQuestion ? performance.now() : null;
  }, [currentQuestion]);

  const handleSubmitAnswer = (
    selectedOptionId: number | null,
    submittedAnswer?: string,
    isTimedOut?: boolean
  ) => {
    if (!quizSession?.id || !currentQuestion || isSubmitting) return;

    const shownAt = questionShownAtRef.current;
    const clientElapsedMs =
      shownAt !== null ? Math.max(1, Math.round(performance.now() - shownAt)) : undefined;

    submitAnswerMutation.mutate(
      {
        data: {
          sessionId: quizSession.id,
          quizQuestionId: currentQuestion.quizQuestionId,
          selectedOptionId,
          submittedAnswer,
          isTimedOut: isTimedOut ?? false,
          clientElapsedMs,
        },
      },
      { onSuccess: handleAnswerSubmissionSuccess }
    );
  };

  const handleGoBack = () => navigate("/choose-quiz");

  const handleNextQuestion = () => {
    if (!quizSession?.id) return;
    if (lastAnswerResult?.isQuizComplete) {
      navigate(`/quiz/results-guest/${quizSession.id}`, { replace: true });
      return;
    }
    setCurrentQuestionNumber((prev) => prev + 1);
    fetchNextQuestion(quizSession.id);
  };

  // Session creation only — same gate as QuizPage, and for the same reason: a null
  // currentQuestion here is the between-questions gap, which belongs to QuizInterface's own
  // loader (it keeps the leave button and the layout). The hook's `isInitialLoading` still
  // ORs in `!currentQuestion`, so it is deliberately not used here.
  // flex-1, not h-screen — h-screen over-measures inside the app shell (docs/RESPONSIVE.md).
  if (!quizSession && !error) {
    return <QuizLoadingView words={["LOADING", "YOUR QUIZ"]} label="Loading your quiz" />;
  }

  if (error || !quizSession) {
    return (
      <div className="flex flex-1 w-full items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md p-4">
          <AlertCircle className="h-16 w-16 mx-auto text-red-400" />
          <h2 className="text-2xl font-bold text-red-400">Quiz Session Error</h2>
          <p className="text-gray-300">
            {error ??
              "Unable to start the guest quiz session. You can log in to play, or head back and try again."}
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link
                to={`/login?redirectTo=${encodeURIComponent(
                  window.location.pathname
                )}`}>
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Link>
            </Button>
            <Button onClick={handleGoBack} variant="outline">
              Back to Quiz Selection
            </Button>
          </div>
        </div>
      </div>
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
      currentQuestionNumber={currentQuestionNumber}
      totalQuestions={quizSession.totalQuestions}
      showInstantFeedback={showInstantFeedback}
      quizTitle={quizSession.quizTitle}
      category={quizSession.category}
      completedAnswers={completedAnswers}
      onLeave={handleGoBack}
    />
  );
}
