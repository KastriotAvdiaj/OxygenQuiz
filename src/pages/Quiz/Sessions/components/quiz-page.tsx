import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Assuming you use React Router
import { Loader2 } from "lucide-react";
import { AnswerResult, CurrentQuestion } from "../quiz-session-types";
import { useCreateQuizSession } from "../api/create-quiz-session";
import { useGetNextQuestion } from "../api/get-next-question";
import { useSubmitAnswer } from "../api/submit-answer";
import { QuizInterface } from "./quiz-interface";

interface QuizPageProps {
  quizId: number;
  // This would come from your auth context in a real app
  userId: string;
}

export function QuizPage({ quizId, userId }: QuizPageProps) {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<CurrentQuestion | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<AnswerResult | null>(
    null
  );

  // --- API Mutations ---
  const createSessionMutation = useCreateQuizSession();
  const getNextQuestionMutation = useGetNextQuestion();
  const submitAnswerMutation = useSubmitAnswer();

  // --- Effect to Start the Quiz ---
  // This runs only once when the component mounts to create the session.
  useEffect(() => {
    createSessionMutation.mutate(
      { data: { quizId, userId } },
      {
        onSuccess: (data) => {
          setSessionId(data.id);
          // Immediately fetch the first question
          handleNextQuestion(data.id);
        },
        onError: () => {
          // Handle error, e.g., show a toast notification and navigate away
          console.error("Failed to create quiz session.");
          navigate("/");
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, userId]); // Dependencies ensure this runs once per quiz attempt

  // --- Handler Functions ---
  const handleNextQuestion = (currentSessionId: string) => {
    setLastAnswerResult(null); // Clear previous answer feedback
    setCurrentQuestion(null); // Show loading state
    getNextQuestionMutation.mutate(
      { sessionId: currentSessionId },
      {
        onSuccess: (data) => {
          setCurrentQuestion(data);
        },
        // This error typically means the quiz is over.
        onError: () => {
          navigate(`/quiz/results/${currentSessionId}`);
        },
      }
    );
  };

  const handleSubmitAnswer = (selectedOptionId: number | null) => {
    if (!sessionId || !currentQuestion) return;

    submitAnswerMutation.mutate(
      {
        data: {
          sessionId,
          quizQuestionId: currentQuestion.quizQuestionId,
          selectedOptionId,
          // Add submittedAnswer for "Type the Answer" questions if needed
        },
      },
      {
        onSuccess: (data) => {
          setLastAnswerResult(data);
        },
      }
    );
  };

  // --- Render Logic ---
  const isLoading =
    createSessionMutation.isPending || getNextQuestionMutation.isPending;

  if (isLoading && !currentQuestion) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-xl">Preparing your quiz...</p>
      </div>
    );
  }

  if (!sessionId) {
    // This state could be shown if session creation fails for some reason.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        Error starting quiz. Please try again.
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
    />
  );
}
