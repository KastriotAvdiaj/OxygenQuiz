// src/components/quiz/QuizInterface.tsx

import { FinalResult } from "./final-result";
import { QuestionDisplay } from "./question-display";
import { AnswerFeedbackOverlay } from "./answer-feedback-overlay";
import { QuizProgress } from "./quiz-progress";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";
import type { CurrentQuestion, AnswerResult } from "../quiz-session-types";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

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
  // New props for better UX
  showFeedbackOverlay?: boolean;
  isTransitioning?: boolean;
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
  showFeedbackOverlay = false,
  isTransitioning = false,
}: QuizInterfaceProps) {
  // Apply category-based theming
  const theme = useQuizTheme({
    colorPalette: categoryColorPalette,
  });

  const isLoading = isTransitioning || (!currentQuestion && !lastAnswerResult);

  const loadingSpinner = (
    <motion.div
      key="loading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="quiz-card-elevated p-8 text-center space-y-4"
    >
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-quiz-primary" />
      <p className="quiz-text-primary text-lg font-medium">
        {isTransitioning
          ? "Loading next question..."
          : "Preparing your quiz..."}
      </p>
      <div className="w-32 h-2 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
        <motion.div
          className="h-full bg-quiz-primary rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );

  return (
    <main
      className="min-h-screen flex flex-col relative"
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
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-2xl relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              loadingSpinner
            ) : currentQuestion ? (
              <motion.div
                key={`question-${currentQuestion.quizQuestionId}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{
                  duration: 0.4,
                  ease: "easeInOut",
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                }}
                className="space-y-6"
              >
                <QuestionDisplay
                  question={currentQuestion}
                  onSubmit={onSubmitAnswer}
                  isSubmitting={isSubmitting}
                  theme={theme}
                  instantFeedback={showInstantFeedback}
                  answerResult={lastAnswerResult}
                />
              </motion.div>
            ) : // 2. THIS IS THE UPDATED LOGIC BLOCK
            lastAnswerResult && !showInstantFeedback ? (
              // This renders the interstitial feedback/final result screen.
              // It triggers when there's no current question, but there is a result to show,
              // and the quiz is NOT in "instant feedback" mode.
              // It also correctly handles the final quiz summary because lastAnswerResult.isQuizComplete will be true.
              <motion.div
                key="feedback-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <FinalResult
                  result={lastAnswerResult}
                  onNext={onNextQuestion}
                  theme={theme}
                />
              </motion.div>
            ) : (
              // This is a fallback, e.g., for the initial state before the first question is loaded.
              loadingSpinner
            )}
          </AnimatePresence>

          {/* Feedback overlay - shows on top of question. This logic is separate and correct. */}
          <AnimatePresence>
            {showFeedbackOverlay && lastAnswerResult && (
              <AnswerFeedbackOverlay
                result={lastAnswerResult}
                onNext={onNextQuestion}
                theme={theme}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subtle background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-5"
          style={{ background: theme.gradients.primary }}
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-5"
          style={{ background: theme.gradients.primary }}
          animate={{
            rotate: -360,
            scale: [1.1, 1, 1.1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </main>
  );
}
