import { QuestionDisplay } from "./question-display";
import { QuizProgress } from "./quiz-progress";
import {
  useQuizTheme,
  type CategoryColorPalette,
} from "@/hooks/use-quiz-theme";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../quiz-session-types";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import * as React from "react";

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
  // NEW: Array to track all completed answers for progress display
  completedAnswers?: InstantFeedbackAnswerResult[];
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
  completedAnswers = [],
}: QuizInterfaceProps) {
  // Apply category-based theming
  const theme = useQuizTheme({
    colorPalette: categoryColorPalette,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoAdvanceCounter, setAutoAdvanceCounter] = React.useState(3);

  // Auto-click button after 3 seconds
  useEffect(() => {
    // Only set timeout if instant feedback is shown and there's a result
    if (showInstantFeedback && lastAnswerResult) {
      // Reset counter
      setAutoAdvanceCounter(3);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Update counter every second
      const countdownInterval = setInterval(() => {
        setAutoAdvanceCounter((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set timeout to auto-click after 3 seconds
      timeoutRef.current = setTimeout(() => {
        clearInterval(countdownInterval);
        onNextQuestion();
      }, 3000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        clearInterval(countdownInterval);
      };
    }
  }, [showInstantFeedback, lastAnswerResult, onNextQuestion]);

  const handleNextQuestion = () => {
    // Clear the auto-click timeout if user clicks manually
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onNextQuestion();
  };

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: `
          radial-gradient(circle at 20% 80%, ${theme.primary}08 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${theme.secondary}08 0%, transparent 50%),
          hsl(var(--background))
        `,
        ...theme.cssVars,
      }}>
      {/* Fixed Header with Progress and Score */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-[5%] z-50 backdrop-blur-lg border-b border-border/50">
        <div className="w-full max-w-4xl mx-auto px-4 py-4">
          {/* Progress indicator with answer history */}
          {currentQuestionNumber && totalQuestions && (
            <QuizProgress
              current={currentQuestionNumber}
              total={totalQuestions}
              completedAnswers={completedAnswers}
              showInstantFeedback={showInstantFeedback}
            />
          )}
        </div>
      </motion.header>

      {/* Main content area - Better spacing */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 mb-40">
        <div className="w-full max-w-3xl">
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.3 }}
                  className="flex flex-col items-center gap-4">
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    variant={"fancy"}
                    className="p-6 text-2xl font-semibold rounded-lg transition-shadow duration-200 group bg-primary text-white">
                    <div className="flex items-center gap-2">
                      {lastAnswerResult?.isQuizComplete ? (
                        <Trophy className="w-4 h-4" />
                      ) : (
                        <></>
                      )}
                      <span>
                        {lastAnswerResult?.isQuizComplete
                          ? "View Results"
                          : "Next Question"}
                      </span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </Button>

                  {/* Auto-advance countdown */}
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Advancing in{" "}
                      <span
                        className="font-bold"
                        style={{ color: theme.primary }}>
                        {autoAdvanceCounter}s
                      </span>
                    </p>
                    {/* Progress bar */}
                    <div className="w-32 h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: theme.primary }}
                        initial={{ width: "100%" }}
                        animate={{
                          width: `${(autoAdvanceCounter / 3) * 100}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : lastAnswerResult && showInstantFeedback ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-12">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: theme.primary }}>
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="quiz-card-elevated p-8 text-center space-y-6 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}03, ${theme.secondary}03)`,
              }}>
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ backgroundColor: theme.primary }}>
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

              <div className="w-48 h-1.5 bg-quiz-border-subtle rounded-full mx-auto overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: theme.primary }}
                  initial={{ width: "0%" }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
