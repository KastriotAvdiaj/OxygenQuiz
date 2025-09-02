// Demo component to test instant feedback functionality
import { useState } from "react";
import { QuestionDisplay } from "./question-display";
import { useQuizTheme } from "@/hooks/use-quiz-theme";
import { QuestionType } from "@/types/question-types";
import {
  AnswerStatus,
  type CurrentQuestion,
  type AnswerResult,
} from "../quiz-session-types";

export function InstantFeedbackDemo() {
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const theme = useQuizTheme({});

  // Sample question with instant feedback enabled
  const sampleQuestion: CurrentQuestion = {
    quizQuestionId: 1,
    questionText: "What is the capital of France?",
    questionType: QuestionType.MultipleChoice,
    options: [
      { id: 1, text: "London" },
      { id: 2, text: "Paris" },
      { id: 3, text: "Berlin" },
      { id: 4, text: "Madrid" },
    ],
    timeLimitInSeconds: 30,
    timeRemainingInSeconds: 30,
    instantFeedback: true, // Enable instant feedback
    explanation: "Paris is the capital and largest city of France.",
  };

  const handleSubmit = (selectedOptionId: number | null) => {
    // Simulate answer result
    const isCorrect = selectedOptionId === 2; // Paris is correct (id: 2)

    const result: AnswerResult = {
      status: isCorrect ? AnswerStatus.Correct : AnswerStatus.Incorrect,
      scoreAwarded: isCorrect ? 10 : 0,
      isQuizComplete: false,
      correctAnswerId: 2, // Paris
      explanation: "Paris is the capital and largest city of France.",
    };

    setAnswerResult(result);
  };

  const handleReset = () => {
    setAnswerResult(null);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Instant Feedback Demo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Try answering the question to see instant feedback in action!
          </p>
          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reset Demo
          </button>
        </div>

        <QuestionDisplay
          question={sampleQuestion}
          onSubmit={handleSubmit}
          isSubmitting={false}
          theme={theme}
          instantFeedback={true}
          answerResult={answerResult}
        />

        {answerResult && (
          <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Answer Result:</h3>
            <p>
              Status:{" "}
              <span
                className={
                  answerResult.status === AnswerStatus.Correct
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {answerResult.status}
              </span>
            </p>
            <p>Score: {answerResult.scoreAwarded}</p>
            <p>Correct Answer ID: {answerResult.correctAnswerId}</p>
            {answerResult.explanation && (
              <p>Explanation: {answerResult.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
