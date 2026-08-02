import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

interface JoinFormProps {
  mode: "create" | "join";
  username: string;
  sessionId: string;
  isConnected: boolean;
  isJoining: boolean;
  joinError: string | null;
  onSessionIdChange: (value: string) => void;
  onJoin: () => void;
}

/**
 * The lobby route's "not in a lobby yet" screen. Two audiences reach it:
 *
 *  1. Someone who opened /multiplayer/join with no code — they type one here.
 *  2. Someone whose auto-join failed, almost always a stale invite link (`?code=`). The join
 *     dialog no longer lands people here for a mistyped code (it verifies first, in place), so a
 *     failure that reaches this screen means the code arrived from outside the app.
 *
 * Case 2 used to render as case 1 with a red line under it — a bare code form and no way out. When
 * there's an error it now leads with the failure and offers a route back to the menu, keeping the
 * input only as a "try a different code" affordance.
 */
export const JoinForm = ({
  mode,
  username,
  sessionId,
  isConnected,
  isJoining,
  joinError,
  onSessionIdChange,
  onJoin,
}: JoinFormProps) => {
  const isJoinMode = mode === "join";
  const disabled =
    !isConnected || !username.trim() || !sessionId.trim() || isJoining;
  const hasFailed = isJoinMode && Boolean(joinError);

  return (
    <div className="max-w-md mx-auto space-y-6 sm:space-y-8">
      {hasFailed && (
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-bold sm:text-2xl">
            Couldn't join that lobby
          </h1>
          <p className="text-sm text-muted-foreground">{joinError}</p>
        </div>
      )}

      {isJoinMode && (
        // The room code is the whole point of this screen — biggest, most focused element here.
        <div className="space-y-2 sm:space-y-2.5">
          <label
            htmlFor="sessionId"
            className="block text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm"
          >
            {hasFailed ? "Try another code" : "Room Code"}
          </label>
          <Input
            variant="minimal"
            id="sessionId"
            placeholder="XXXXXX"
            value={sessionId}
            onChange={(e) => onSessionIdChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && onJoin()}
            disabled={!isConnected}
            maxLength={6}
            className="h-16 border-2 font-quiz border-primary/30 text-center text-2xl tracking-[0.3em] transition-all focus-visible:border-primary sm:h-20 sm:text-4xl"
          />
        </div>
      )}

      <Button
        onClick={onJoin}
        disabled={disabled}
        size={isJoinMode ? "default" : "lg"}
        className={
          isJoinMode
            ? "mx-auto block h-10 px-8 text-sm font-bold font-quiz tracking-wider text-white"
            : "w-full h-10 sm:h-11 md:h-12 text-sm sm:text-base md:text-lg font-bold font-quiz tracking-wider shadow-lg hover:translate-y-[-2px] transition-all text-white"
        }
      >
        {isJoining
          ? "Joining..."
          : hasFailed
            ? "Try again"
            : isJoinMode
              ? "Join Lobby"
              : "Create Lobby"}
      </Button>

      {/* Only shown on failure: without it this screen is a dead end — no back button, and the URL
          still points at a lobby the player isn't in, so a refresh just re-runs the failed join. */}
      {hasFailed && (
        <p className="text-center text-sm">
          <Link
            to="/multiplayer-menu"
            className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Back to multiplayer
          </Link>
        </p>
      )}

      {/* The non-failure error case (e.g. an empty code submitted by hand) still needs a line. */}
      {joinError && !hasFailed && (
        <p className="text-center text-xs sm:text-sm text-destructive font-quiz">
          {joinError}
        </p>
      )}
    </div>
  );
};
