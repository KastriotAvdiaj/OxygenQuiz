// src/components/quiz/QuizInterface.tsx

import { QuestionDisplay } from "./question-display";
import { QuizProgress } from "./quiz-progress";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";
import type { CurrentQuestion, AnswerResult } from "../quiz-session-types";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuizInterfaceProps {
  sessionId: string;
  currentQuestion: CurrentQuestion | null;
  lastAnswerResult: AnswerResult | null;
  isSubmitting: boolean;
  quizTitle: string;
  quizDescription?: string;
  category: string;
  onNextQuestion: () => void;
  onSubmitAnswer: (
    selectedOptionId: number | null,
    submittedAnswer?: string
  ) => void;
  // Optional category theming
  categoryColorPalette?: CategoryColorPalette;
  currentQuestionNumber?: number;
  totalQuestions?: number;
  // Instant feedback state
  showInstantFeedback?: boolean;
}

export function QuizInterface({
  currentQuestion,
  lastAnswerResult,
  isSubmitting,
  onNextQuestion,
  onSubmitAnswer,
  categoryColorPalette,
  currentQuestionNumber,
  totalQuestions,
  showInstantFeedback = false,
}: QuizInterfaceProps) {
  // Apply category-based theming
  const theme = useQuizTheme({
    colorPalette: categoryColorPalette,
  });

  return (
    <main
      className="min-h-screen flex flex-col pt-[4rem]"
      style={{
        background: `
          radial-gradient(circle at 20% 80%, ${theme.primary}15 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${theme.secondary}15 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, ${theme.accent}10 0%, transparent 50%),
          hsl(var(--background))
        `,
        ...theme.cssVars,
      }}
    >
      {/* Progress indicator */}
      {currentQuestionNumber && totalQuestions && (
        <div className="w-full max-w-4xl mx-auto px-4 pt-6">
          <QuizProgress
            current={currentQuestionNumber}
            total={totalQuestions}
            theme={theme}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {currentQuestion ? (
            <div className="space-y-6">
              <QuestionDisplay
                question={currentQuestion}
                onSubmit={onSubmitAnswer}
                isSubmitting={isSubmitting}
                theme={theme}
                instantFeedback={showInstantFeedback}
                answerResult={lastAnswerResult}
              />

              {/* Show Next Question button after instant feedback */}
              {showInstantFeedback && lastAnswerResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={onNextQuestion}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {lastAnswerResult?.isQuizComplete
                      ? "View Results"
                      : "Next Question"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              )}
            </div>
          ) : lastAnswerResult && showInstantFeedback ? (
            <p>Quiz complete! Redirecting to results...</p>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="quiz-card-elevated p-8 text-center space-y-4"
            >
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-quiz-primary" />
              <p className="quiz-text-primary text-lg font-medium">
                Preparing your next question...
              </p>
              <div className="w-32 h-2 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-quiz-primary rounded-full quiz-animate-pulse"
                  style={{ width: "60%" }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
