// src/components/quiz/QuizInterface.tsx

import { QuestionDisplay } from "./question-display";
import { AnswerFeedback } from "./answer-feedback";
import { QuizProgress } from "./quiz-progress";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";
import type { CurrentQuestion, AnswerResult } from "../quiz-session-types";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

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
  // Optional category theming
  categoryColorPalette?: CategoryColorPalette;
  currentQuestionNumber?: number;
  totalQuestions?: number;
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
}: QuizInterfaceProps) {
  // Apply category-based theming
  const theme = useQuizTheme({
    colorPalette: categoryColorPalette,
  });

  return (
    <main
      className="min-h-screen flex flex-col"
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
          {lastAnswerResult ? (
            <AnswerFeedback
              result={lastAnswerResult}
              onNext={onNextQuestion}
              theme={theme}
            />
          ) : currentQuestion ? (
            <QuestionDisplay
              question={currentQuestion}
              onSubmit={onSubmitAnswer}
              isSubmitting={isSubmitting}
              theme={theme}
            />
          ) : (
            // Enhanced loading state
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

      {/* Subtle background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-5"
          style={{ background: theme.gradients.primary }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-5"
          style={{ background: theme.gradients.primary }}
        />
      </div>
    </main>
  );
}
