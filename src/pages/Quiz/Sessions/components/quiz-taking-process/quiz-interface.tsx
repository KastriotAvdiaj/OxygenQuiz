import { QuestionDisplay } from "./question-display";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../../../types/quiz-session-types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Trophy } from "lucide-react";
import { useEffect, useRef } from "react";
import * as React from "react";
import { LiftedButton } from "@/common/LiftedButton";
import { QuizLeaveButton } from "./quiz-leave-button";
import { QuizLoadingView } from "../quiz-loading-view";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

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
  /**
   * A next-question request is in flight while the current question is still on screen. Gates
   * the Next button: without it a second click fires a second `next-question`, and the second
   * one comes back "An answer for the current question is still pending" — an error screen in
   * the middle of a perfectly good quiz.
   */
  isFetchingNextQuestion?: boolean;
}

export function QuizInterface({
  currentQuestion,
  lastAnswerResult,
  isSubmitting,
  onNextQuestion,
  onSubmitAnswer,
  showInstantFeedback = false,
  onLeave,
  isFetchingNextQuestion = false,
}: QuizInterfaceProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoAdvanceCounter, setAutoAdvanceCounter] = React.useState(3);
  const prefersReducedMotion = usePrefersReducedMotion();

  // How far a card travels on its way in and out. 0 under prefers-reduced-motion: the swap
  // becomes a cross-fade, which still reads as a change without anything flying across.
  const slide = prefersReducedMotion ? 0 : 48;

  const isQuizComplete = lastAnswerResult?.isQuizComplete ?? false;

  // onNextQuestion lives in a ref so the countdown below can depend on primitives only. Both
  // pages hand it a fresh closure on every render, and an effect that restarts whenever its
  // parent re-renders is a countdown at the mercy of unrelated state — now that the feedback
  // screen stays up for the whole fetch, that is a live risk rather than a theoretical one
  // (docs/quiz/quiz-timer.md makes the same argument for the timer).
  const onNextQuestionRef = useRef(onNextQuestion);
  onNextQuestionRef.current = onNextQuestion;

  const answerId = lastAnswerResult ? currentQuestion?.quizQuestionId ?? null : null;

  useEffect(() => {
    // Only auto-advance for mid-quiz feedback, not the final question, and never while the
    // next question is already on its way — re-arming then would fire a second request.
    if (answerId !== null && showInstantFeedback && !isQuizComplete && !isFetchingNextQuestion) {
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
        onNextQuestionRef.current();
      }, 3000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        clearInterval(countdownInterval);
      };
    }
  }, [answerId, showInstantFeedback, isQuizComplete, isFetchingNextQuestion]);

  const handleNextQuestion = () => {
    if (isFetchingNextQuestion) return;
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
      {/* overflow-x-clip, not overflow-x-hidden: hidden on one axis turns the other into a
          scroll container, which would clip the feedback panel and the timer's glow. clip just
          clips, so a card sliding out cannot give the app shell a horizontal scrollbar
          (docs/RESPONSIVE.md — the page body never scrolls sideways). */}
      <div className="flex-1 flex items-center justify-center overflow-x-clip px-3 py-3 sm:px-4 sm:py-6 md:py-8">
        <div className="w-full max-w-3xl">
          {/* One card leaves as the next arrives, dealt from the right. popLayout takes the
              outgoing card out of layout flow so the incoming one does not wait for it — with
              mode="wait" there would be an empty stage between the two, which is the hole this
              whole design exists to avoid. Keyed on the question id: that is what "a different
              question" means here, and re-keying is what makes the swap animate at all. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {currentQuestion ? (
              <motion.div
                key={currentQuestion.quizQuestionId}
                className="space-y-3 sm:space-y-6"
                initial={{ opacity: 0, x: slide }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -slide }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}>
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
                      disabled={isFetchingNextQuestion}
                      className="px-6 py-2.5 sm:px-8 sm:py-3 text-lg sm:text-xl tracking-wide font-semibold rounded-md transition-shadow duration-200 group bg-primary text-white">
                      <div className="flex items-center gap-2">
                        {isQuizComplete && !isFetchingNextQuestion && <Trophy className="w-4 h-4" />}
                        <span>{isQuizComplete ? "Finish" : "Next"}</span>
                        {/* The only "loading" this flow has left. The question stays on screen
                            the whole time, so a spinner in the button is the entire story even
                            on a slow connection — no screen to cover, nothing to fill. */}
                        {isFetchingNextQuestion ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                        )}
                      </div>
                    </LiftedButton>

                    {/* Auto-advance countdown — hidden on last question */}
                    {!isQuizComplete && !isFetchingNextQuestion && (
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
              </motion.div>
            ) : (
              /* Only before the FIRST question of a session. After that `currentQuestion` is
                 never null again — fetchNextQuestion holds the old one until the new one lands
                 — so this is a genuine cold start, not a gap. */
              <motion.div
                key="first-question"
                className="flex w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <QuizLoadingView words={["LOADING", "QUESTION"]} label="Loading the first question" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
