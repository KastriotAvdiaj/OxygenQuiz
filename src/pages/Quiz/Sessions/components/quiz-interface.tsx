// src/components/quiz/QuizInterface.tsx

import { QuestionDisplay } from "./question-display";
import { AnswerFeedback } from "./answer-feedback";
import type { CurrentQuestion, AnswerResult } from "../quiz-session-types";
interface QuizInterfaceProps {
  sessionId: string;
  currentQuestion: CurrentQuestion | null;
  lastAnswerResult: AnswerResult | null;
  isSubmitting: boolean;
  onNextQuestion: () => void;
  onSubmitAnswer: (
    selectedOptionId: number | null,
    submittedAnswer?: string
  ) => void;
}

export function QuizInterface({
  //   sessionId,
  currentQuestion,
  lastAnswerResult,
  isSubmitting,
  onNextQuestion,
  onSubmitAnswer,
}: QuizInterfaceProps) {
  // A simple background for the quiz page
  const primaryColor = "#6366f1"; // We can make this dynamic later if needed

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{
        background: `radial-gradient(circle at top, ${primaryColor}15, #0a0a0a 40%)`,
      }}
    >
      <div className="w-full max-w-2xl">
        {lastAnswerResult ? (
          <AnswerFeedback result={lastAnswerResult} onNext={onNextQuestion} />
        ) : currentQuestion ? (
          <QuestionDisplay
            question={currentQuestion}
            onSubmit={onSubmitAnswer}
            isSubmitting={isSubmitting}
            primaryColor={primaryColor}
          />
        ) : (
          // This is the loading state between questions
          <div className="text-center text-white">Loading next question...</div>
        )}
      </div>
    </main>
  );
}
