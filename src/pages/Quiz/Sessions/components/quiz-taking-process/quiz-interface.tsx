import { QuestionDisplay } from "./question-display";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../../../types/quiz-session-types";
import { motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";
import { useEffect, useRef } from "react";
import * as React from "react";
import { LiftedButton } from "@/common/LiftedButton";
import { QuizLeaveButton } from "./quiz-leave-button";
import { QuizLoadingView } from "../quiz-loading-view";

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
    submittedAnswer?: string,
    isTimedOut?: boolean
  ) => void;
  currentQuestionNumber?: number;
  totalQuestions?: number;
  // Instant feedback state
  showInstantFeedback?: boolean;
  // Current session score for display
  currentSessionScore?: number;
  // NEW: Array to track all completed answers for progress display
  completedAnswers?: InstantFeedbackAnswerResult[];
  /**
   * Leave the quiz. Omit to render no exit control — but note the play route hides the site
   * header, so a screen without this has no way out except finishing or the browser's back button.
   */
  onLeave?: () => void;
}

export function QuizInterface({
  currentQuestion,
  lastAnswerResult,
  isSubmitting,
  onNextQuestion,
  onSubmitAnswer,
  showInstantFeedback = false,
  onLeave,
}: QuizInterfaceProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoAdvanceCounter, setAutoAdvanceCounter] = React.useState(3);

  // Auto-advance after 3 seconds — but NOT on the last question
  const isQuizComplete = lastAnswerResult?.isQuizComplete ?? false;

  useEffect(() => {
    // Only auto-advance for mid-quiz feedback, not the final question
    if (showInstantFeedback && lastAnswerResult && !lastAnswerResult.isQuizComplete) {
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
    // flex-1 (not min-h-screen): the layout already pads for the fixed header
    // and sizes to the dynamic viewport; min-h-screen double-counted both and
    // pushed the submit button below the fold on phones (docs/RESPONSIVE.md).
    <main
      className="flex flex-1 flex-col"
      style={{
        background: `
          radial-gradient(circle at 20% 80%, primary 08 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, primary 08 0%, transparent 50%),
          hsl(var(--background))
        `,
      }}>
      {/* The only exit from a started quiz besides finishing it — the route hides the site
          header during play. Disabled mid-submission so leaving cannot race a grade. */}
      {onLeave && (
        <div className="flex justify-start px-3 pt-3 sm:px-4">
          <QuizLeaveButton onLeave={onLeave} disabled={isSubmitting} />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center px-3 py-3 sm:px-4 sm:py-6 md:py-8">
        <div className="w-full max-w-3xl">
          {currentQuestion ? (
            <div className="space-y-3 sm:space-y-6">
              <QuestionDisplay
                question={currentQuestion}
                onSubmit={onSubmitAnswer}
                isSubmitting={isSubmitting}
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
                  {/* Normal button proportions — the old p-4/p-6 square padding
                      made this a slab on phones (docs/RESPONSIVE.md) */}
                  <LiftedButton
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 sm:px-8 sm:py-3 text-lg sm:text-xl tracking-wide font-semibold rounded-md transition-shadow duration-200 group bg-primary text-white">
                    <div className="flex items-center gap-2">
                      {isQuizComplete && (
                        <Trophy className="w-4 h-4" />
                      )}
                      <span>
                        {isQuizComplete
                          ? "Finish"
                          : "Next"}
                      </span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </LiftedButton>

                  {/* Auto-advance countdown — hidden on last question */}
                  {!isQuizComplete && (
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Advancing in{" "}
                        <span className="font-bold color-primary">
                          {autoAdvanceCounter}s
                        </span>
                      </p>
                      {/* Progress bar */}
                      <div className="w-32 h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: "100%" }}
                          animate={{
                            width: `${(autoAdvanceCounter / 3) * 100}%`,
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          ) : lastAnswerResult && showInstantFeedback ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-12">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary">
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
            /* The gap between two questions: the answer is graded, the next question is in
               flight. Reachable since QuizPage stopped gating on currentQuestion — the leave
               button and the layout above stay put while this swaps in. Same component the
               page uses for the initial load, so the two moments look like one thing. */
            <QuizLoadingView words={["LOADING", "QUESTION"]} label="Loading the next question" />
          )}
        </div>
      </div>
    </main>
  );
}
