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
  return (
    <div className="max-w-md mx-auto space-y-3 sm:space-y-8">
      <div className="space-y-2.5 sm:space-y-3">
        <div className="space-y-1 sm:space-y-1.5">
          <span className="text-xs sm:text-sm font-bold font-quiz tracking-wide">
            Joining as
          </span>
          {/* Identity is the logged-in account — no longer free-typed. */}
          <div className="flex h-9 sm:h-10 md:h-11 items-center rounded-md border-2 border-primary/20 bg-muted/40 px-3 text-sm sm:text-base font-bold font-quiz tracking-wide">
            {username || "…"}
          </div>
        </div>

        {mode === "join" && (
          <div className="space-y-1 sm:space-y-1.5">
            <label
              htmlFor="sessionId"
              className="text-xs sm:text-sm font-bold font-quiz tracking-wide transition-all"
            >
              Room Code
            </label>
            <Input
              variant="quiz"
              id="sessionId"
              placeholder="Enter room code"
              value={sessionId}
              onChange={(e) => onSessionIdChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onJoin()}
              disabled={!isConnected}
              className="h-9 sm:h-10 md:h-11 text-sm sm:text-base tracking-wider border-2 border-primary/20 focus-visible:border-primary transition-all"
            />
          </div>
        )}
      </div>

      <Button
        onClick={onJoin}
        disabled={!isConnected || !username.trim() || !sessionId.trim() || isJoining}
        className="w-full h-10 sm:h-11 md:h-12 text-sm sm:text-base md:text-lg font-bold font-quiz tracking-wider shadow-lg hover:translate-y-[-2px] transition-all text-white"
        size="lg"
      >
        {isJoining ? "Joining..." : mode === "create" ? "Create Lobby" : "Join Lobby"}
      </Button>

      {joinError && (
        <p className="text-xs sm:text-sm text-destructive mt-2 font-quiz">{joinError}</p>
      )}
    </div>
  );
};
