import { QuestionDisplay } from "./question-display";
import type {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../../../../types/quiz-session-types";
import { AnimatePresence, motion } from "framer-motion";
// `initial` takes a plain Target (no per-property transition); `animate` and `exit` take a
// TargetAndTransition, which is what lets the exit carry its own curve below.
import type { Target, TargetAndTransition, Transition } from "framer-motion";
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

  // ── The question-to-question swap ────────────────────────────────────────────────────────
  // A card is DEALT: the outgoing one is thrown to the left, tilting and shrinking as it
  // goes, while the next arrives from the right, tilted, and settles level.
  //
  // It travels a full card-width. The previous version moved 48px in 0.28s, which is roughly
  // the distance a card shifts when a scrollbar appears — it read as a flicker rather than a
  // change, and a player answering quickly could genuinely not tell whether Next had done
  // anything. The swap is the only moment in the quiz that says "that one's finished", so it
  // is worth half a second.
  //
  // Both cards are on screen together (AnimatePresence popLayout — see below), so the two
  // halves have to be readable as one gesture: the same tilt in mirror, the same scale, one
  // leaving as the other arrives.
  //
  // Under prefers-reduced-motion the whole thing collapses to a cross-fade. Still legibly a
  // new question; nothing flies across the screen.

  const enterFrom: Target = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, x: "100%", rotate: 5, scale: 0.92 };

  const settled: TargetAndTransition = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, x: 0, rotate: 0, scale: 1 };

  const dealtAway: TargetAndTransition = prefersReducedMotion
    ? { opacity: 0, transition: { duration: 0.2 } }
    : {
        opacity: 0,
        x: "-100%",
        rotate: -5,
        scale: 0.92,
        // Leaving gets its own curve — accelerating away, where arriving decelerates in. And
        // the fade is quicker than the travel on purpose: the outer container clips at the
        // VIEWPORT, not at the card, so on a wide screen a card at -100% is still over the
        // gutter. Gone by then, rather than skidding to a halt in view.
        transition: { duration: 0.5, ease: [0.5, 0, 0.9, 0.4], opacity: { duration: 0.34 } },
      };

  // Arriving: a long, decelerating ease so the card carries weight and lands rather than
  // stops. Opacity runs shorter than the travel so the card is solid for most of its journey
  // instead of ghosting the whole way in.
  const dealtIn: Transition = prefersReducedMotion
    ? { duration: 0.2 }
    : {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.4, ease: "easeOut" },
      };

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
                initial={enterFrom}
                animate={settled}
                exit={dealtAway}
                transition={dealtIn}>
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
                // Fades rather than deals: there is no outgoing card to mirror, and a loader
                // thrown off the screen would claim the player had just finished something.
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{ duration: 0.2 }}>
                <QuizLoadingView label="Loading the first question" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
