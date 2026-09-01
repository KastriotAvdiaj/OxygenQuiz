import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";

export interface QuizLeaveButtonProps {
  /** Where the player goes once they confirm. */
  onLeave: () => void;
  /** Hidden while a submission is in flight, so leaving cannot race an answer being graded. */
  disabled?: boolean;
}

/**
 * The way out of a quiz that is under way.
 *
 * <b>Why this exists at all.</b> The play route hides the site header — it ate a row of viewport
 * on phones and pushed the submit button below the fold — and the comment in `Router.tsx` says
 * players "leave via the quiz's own back/finish actions". There was a finish action and no back
 * one, so the only exits from a started quiz were answering every question or the browser's back
 * button. This is the missing half.
 *
 * <b>Why it confirms.</b> Not because leaving is destructive — it isn't, see below — but because
 * the button sits a thumb's width from the answer options on a phone, and a mis-tap that silently
 * ends a run the player is halfway through is a bad trade for one tap saved.
 *
 * <b>Leaving does not abandon the session.</b> No API call: the session stays active server-side,
 * so returning to this quiz shows the existing "Session In Progress" screen with Resume and Start
 * Fresh. That screen already existed and already handles this case, which is why the honest copy
 * here is "your progress is saved" rather than a warning about losing it. If leaving should
 * instead abandon, that is a deliberate product change and needs the abandon call plus different
 * wording — do not let the two drift apart.
 */
export const QuizLeaveButton = ({ onLeave, disabled = false }: QuizLeaveButtonProps) => (
  <ConfirmationDialog
    icon="info"
    title="Leave this quiz?"
    body={
      "Your progress is saved. When you come back to this quiz you can pick up where you left " +
      "off, or start again from the beginning."
    }
    cancelButtonText="Keep playing"
    triggerButton={
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label="Leave quiz"
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Leave</span>
      </Button>
    }
    confirmButton={
      <Button variant="destructive" onClick={onLeave}>
        Leave quiz
      </Button>
    }
  />
);
