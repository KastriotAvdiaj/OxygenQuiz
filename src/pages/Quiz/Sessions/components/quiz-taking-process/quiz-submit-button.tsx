import { motion } from "framer-motion";
import { LiftedButton } from "@/common/LiftedButton";

interface QuizSubmitButtonProps {
  /** Fire the submission. The caller supplies the type-specific answer payload. */
  onSubmit: () => void;
  /** Type-specific: does the user currently have a valid answer selected/typed? */
  canSubmit: boolean;
  /** Network in flight — shows the spinner and blocks re-clicks. */
  isSubmitting: boolean;
  /** Instant-feedback result has arrived (question is answered). Hides the button. */
  answered: boolean;
  /** Timer ran out. Hides the button. */
  isTimedOut: boolean;
  /** Optional helper line under the button (e.g. "Click the same option again to lock in"). */
  hint?: string;
  /** Stagger delay for the entrance animation, to match each question layout. */
  motionDelay?: number;
}

/**
 * The single Submit button for every question type in the quiz-taking flow.
 *
 * Previously each question-type component (multiple-choice / true-or-false / type-the-answer)
 * rendered its own near-identical copy of this button, which had already drifted out of sync.
 * They now all render this one component, so styling, the loading spinner, the visibility rule,
 * and the disabled logic live in exactly one place. Only the *answer* stays type-specific —
 * each caller decides `canSubmit` and what `onSubmit` submits.
 *
 * Shared by singleplayer (`QuestionDisplay`) and multiplayer (`MultiplayerQuestionView`).
 */
export function QuizSubmitButton({
  onSubmit,
  canSubmit,
  isSubmitting,
  answered,
  isTimedOut,
  hint,
  motionDelay = 0.3,
}: QuizSubmitButtonProps) {
  // Hidden once the question is answered (feedback showing) or the timer expired.
  if (answered || isTimedOut) return null;

  return (
    <motion.div
      className="flex flex-col items-center gap-2 pt-2 sm:pt-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: motionDelay }}
    >
      <LiftedButton
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        // Normal CTA proportions on every size (the old sm:py-6 was a slab);
        // matches the Next button in quiz-interface.tsx (docs/RESPONSIVE.md).
        className="px-6 py-2.5 sm:px-8 sm:py-3 text-lg sm:text-xl font-semibold rounded-xl min-w-[160px] sm:min-w-[200px] bg-primary text-white"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </div>
        ) : (
          "Submit"
        )}
      </LiftedButton>

      {hint && (
        <p className="text-xs text-muted-foreground animate-in fade-in duration-300">
          {hint}
        </p>
      )}
    </motion.div>
  );
}
