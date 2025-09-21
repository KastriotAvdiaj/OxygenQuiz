import { QuestionDisplay } from "./question-display";
import { QuizProgress } from "./quiz-progress";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../quiz-session-types";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuizInterfaceProps {
  sessionId: string;
  currentQuestion: CurrentQuestion | null;
  lastAnswerResult: InstantFeedbackAnswerResult | null;
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
  // Current session score for display
  currentSessionScore?: number;
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
  currentSessionScore = 0,
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
      {/* Header with Progress and Score */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          {/* Progress indicator */}
          {currentQuestionNumber && totalQuestions && (
            <div className="flex-1 max-w-md">
              <QuizProgress
                current={currentQuestionNumber}
                total={totalQuestions}
                theme={theme}
              />
            </div>
          )}

          {/* Current Score Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-2 rounded-xl border-2"
            style={{
              backgroundColor: `${theme.primary}10`,
              borderColor: `${theme.primary}30`,
            }}
          >
            <div
              className="p-2 rounded-full"
              style={{ backgroundColor: theme.primary }}
            >
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">Score</div>
              <div
                className="text-lg font-bold"
                style={{ color: theme.primary }}
              >
                {currentSessionScore.toLocaleString()}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {currentQuestion ? (
            <div className="space-y-8">
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
                  transition={{ delay: 1.2 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={onNextQuestion}
                    size="lg"
                    className="px-8 py-4 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-white/20">
                        {lastAnswerResult?.isQuizComplete ? (
                          <Trophy className="w-5 h-5" />
                        ) : (
                          <Target className="w-5 h-5" />
                        )}
                      </div>
                      <span>
                        {lastAnswerResult?.isQuizComplete
                          ? "View Results"
                          : "Next Question"}
                      </span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Button>
                </motion.div>
              )}
            </div>
          ) : lastAnswerResult && showInstantFeedback ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: theme.primary }}
              >
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold quiz-text-primary mb-2">
                Quiz Complete!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Preparing your results...
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="quiz-card-elevated p-8 text-center space-y-6 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}05, ${theme.secondary}05)`,
              }}
            >
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ backgroundColor: theme.primary }}
              >
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>

              <div className="space-y-3">
                <h3 className="quiz-text-primary text-xl font-semibold">
                  Preparing your question...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Get ready for the next challenge!
                </p>
              </div>

              <div className="w-48 h-2 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: theme.primary }}
                  initial={{ width: "0%" }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
