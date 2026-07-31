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
  const isJoinMode = mode === "join";
  const disabled =
    !isConnected || !username.trim() || !sessionId.trim() || isJoining;

  return (
    <div className="max-w-md mx-auto space-y-6 sm:space-y-8">
      {isJoinMode && (
        // The room code is the whole point of this screen — biggest, most focused element here.
        <div className="space-y-2 sm:space-y-2.5">
          <label
            htmlFor="sessionId"
            className="block text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm"
          >
            Room Code
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
        {isJoining ? "Joining..." : isJoinMode ? "Join Lobby" : "Create Lobby"}
      </Button>

      {joinError && (
        <p className="text-center text-xs sm:text-sm text-destructive font-quiz">
          {joinError}
        </p>
      )}
    </div>
  );
};
