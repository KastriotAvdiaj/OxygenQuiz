import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiftedButton } from "@/common/LiftedButton";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { quizPlayPath } from "../quiz-play-path";

/**
 * What a signed-out visitor sees on picking a second featured quiz: their one free quiz is spent
 * (docs/auth/guest-play.md), so the pitch is the rest of the ladder. Logging in brings them
 * straight back to the quiz they picked.
 */
export function SignUpForMoreDialog({
  quiz,
  isOpen,
  onClose,
}: {
  quiz: QuizSummaryDTO;
  isOpen: boolean;
  onClose: () => void;
}) {
  const backToQuiz = encodeURIComponent(quizPlayPath({ id: quiz.id, format: quiz.format }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background text-foreground sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Sign up to play the rest of the ladder</DialogTitle>
          <DialogDescription>
            You've played your free quiz. With an account you can play “{quiz.title}” and every
            other quiz, and your results are saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Link to="/signup" tabIndex={-1}>
            <LiftedButton outerClassName="w-full sm:w-auto" className="w-full">
              Sign up
            </LiftedButton>
          </Link>
          <Link to={`/login?redirectTo=${backToQuiz}`} tabIndex={-1}>
            <LiftedButton
              outerClassName="w-full sm:w-auto"
              className="w-full bg-muted text-foreground"
              liftColor="muted-foreground"
            >
              Log in
            </LiftedButton>
          </Link>
          <LiftedButton
            outerClassName="w-full sm:w-auto"
            className="w-full border border-foreground/30 bg-background text-foreground"
            liftColor="muted"
            onClick={onClose}
          >
            Not now
          </LiftedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
