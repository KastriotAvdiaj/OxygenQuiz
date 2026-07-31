import { Button } from "@/components/ui/button";
import { Check, Play, Gamepad2 } from "lucide-react";
import type { Participant } from "../../hooks/use-lobby-connection";

interface LobbyActionsProps {
  isHost: boolean;
  isReady: boolean;
  canStartQuiz: boolean;
  allPlayersReady: boolean;
  participants: Participant[];
  hasSelectedQuiz: boolean;
  onToggleReady: () => void;
  onStartQuiz: () => void;
}

/**
 * Both buttons share this so Ready and Start stay the same size next to each other. Sized to
 * their labels rather than stretched full-width — at full width the pill reads as a banner and
 * the corner radius stops registering; at this width `rounded-md` matches the rest of the app.
 */
const ACTION_SIZE =
  "h-8 rounded-md px-3 text-xs font-bold tracking-wide lg:h-9 lg:px-4 lg:text-sm";

/**
 * The lobby's action row. Everyone gets a Ready toggle; the host gets Start Quiz beside it at
 * matching size — starting is the host's goal, but it isn't worth shouting when it's blocked
 * most of the time anyway.
 *
 * Before a quiz is picked this renders a status line instead of buttons: the quiz panel's own
 * dashed "select a quiz" card is the one real entry point for that action. Two clickable
 * "Browse & Select Quiz" targets doing the same thing was the bug this replaced.
 */
export const LobbyActions = ({
  isHost,
  isReady,
  canStartQuiz,
  allPlayersReady,
  participants,
  hasSelectedQuiz,
  onToggleReady,
  onStartQuiz,
}: LobbyActionsProps) => {
  // Outlined in both states — toggling ready shouldn't make the button jump between a solid
  // and a hollow shape. The readied state is carried by the fill tint and the check instead.
  const readyButton = (
    <Button
      type="button"
      onClick={onToggleReady}
      size="none"
      variant="outline"
      className={`${ACTION_SIZE} gap-1.5 border-primary text-primary ${
        isReady
          ? "bg-primary/15 hover:bg-primary/25"
          : "bg-transparent hover:bg-primary/10"
      }`}
    >
      {isReady && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      {isReady ? "Ready" : "Ready up"}
    </Button>
  );

  if (!isHost) {
    return <div className="flex justify-end">{readyButton}</div>;
  }

  if (!hasSelectedQuiz) {
    return (
      <div className="flex h-8 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-3 text-center text-xs font-semibold text-muted-foreground lg:h-9">
        <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
        Pick a quiz to get started
      </div>
    );
  }

  // Why the game can't start yet — shown as text, not as a dead-looking button.
  const blockedReason = (() => {
    if (canStartQuiz) return null;
    if (participants.length < 2) return "Waiting for more players…";
    if (!allPlayersReady) {
      const notReady = participants.filter((p) => !p.isReady).length;
      return `Waiting for ${notReady} ${notReady === 1 ? "player" : "players"} to ready up…`;
    }
    return "Waiting to start…";
  })();

  return (
    <div className="space-y-3">
      {/* On its own line: the panel is too narrow to sit this beside two buttons without
          wrapping them apart, and the buttons staying side by side matters more. */}
      {blockedReason && (
        <p className="text-center text-[11px] text-muted-foreground">
          {blockedReason}
        </p>
      )}

      <div className="flex flex-nowrap items-center justify-end gap-2">
        {readyButton}
        <Button
          type="button"
          onClick={onStartQuiz}
          disabled={!canStartQuiz}
          size="none"
          className={`${ACTION_SIZE} gap-1.5 text-white`}
        >
          <Play className="h-3.5 w-3.5" />
          Start
        </Button>
      </div>
    </div>
  );
};
