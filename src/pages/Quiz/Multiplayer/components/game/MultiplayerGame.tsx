import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Check, X, Clock } from "lucide-react";
import { QuestionMedia } from "@/common/QuestionMedia";
import type { useMatch, ScoreboardEntry } from "../../hooks/use-match";

interface MultiplayerGameProps {
  username: string;
  match: ReturnType<typeof useMatch>;
  onExit: () => void;
}

/**
 * Full-screen live match view. Driven entirely by server events surfaced through `useMatch`:
 * a countdown, then a question-per-round loop (answer → reveal), then the final results.
 */
export const MultiplayerGame = ({ username, match, onExit }: MultiplayerGameProps) => {
  const { phase } = match;

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 font-header">
      <div className="w-full max-w-3xl mx-auto">
        {phase === "starting" && <CountdownPanel seconds={match.countdownSeconds} />}
        {phase === "question" && <QuestionPanel match={match} />}
        {phase === "reveal" && <RevealPanel username={username} match={match} />}
        {phase === "ended" && <ResultsPanel username={username} match={match} onExit={onExit} />}
      </div>
    </div>
  );
};

// ── Countdown before the first question ───────────────────────────────────────
const CountdownPanel = ({ seconds }: { seconds: number }) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  return (
    <Card variant="lifted" hover={false} className="bg-background">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Get ready</p>
        <div className="text-7xl font-extrabold font-quiz text-primary tabular-nums">
          {remaining > 0 ? remaining : "Go!"}
        </div>
      </CardContent>
    </Card>
  );
};

// ── A live question ───────────────────────────────────────────────────────────
const QuestionPanel = ({ match }: { match: ReturnType<typeof useMatch> }) => {
  const { question, deadlineUtc, hasSubmitted, answered, submit } = match;
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const secondsLeft = useCountdown(deadlineUtc);

  // Reset local input each time a new question opens.
  useEffect(() => {
    setSelected(null);
    setTyped("");
  }, [question?.questionId]);

  if (!question) return null;

  const lock = (answer: string) => {
    setSelected(answer);
    submit(answer).catch(() => setSelected(null));
  };

  const pct = question.timeLimitSeconds > 0
    ? Math.max(0, Math.min(100, (secondsLeft / question.timeLimitSeconds) * 100))
    : 0;

  return (
    <Card variant="lifted" hover={false} className="bg-background">
      <CardContent className="p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Question {question.index + 1} / {question.total}</span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {secondsLeft}s
          </span>
        </div>

        {/* Timer bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-center">{question.text}</h2>

        <QuestionMedia mediaUrl={question.imageUrl} alt="Question image" />

        {hasSubmitted ? (
          <p className="text-center text-emerald-600 font-semibold py-4">
            Locked in — waiting for the others…
          </p>
        ) : (
          <AnswerInput
            type={question.type}
            options={question.options}
            selected={selected}
            typed={typed}
            onTyped={setTyped}
            onPick={lock}
            onSubmitTyped={() => typed.trim() && lock(typed.trim())}
          />
        )}

        <p className="text-center text-xs text-muted-foreground">
          {answered.length} answered
        </p>
      </CardContent>
    </Card>
  );
};

const AnswerInput = ({
  type,
  options,
  selected,
  typed,
  onTyped,
  onPick,
  onSubmitTyped,
}: {
  type: string;
  options: { id: number; text: string }[];
  selected: string | null;
  typed: string;
  onTyped: (v: string) => void;
  onPick: (answer: string) => void;
  onSubmitTyped: () => void;
}) => {
  if (type === "TrueFalse") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {["True", "False"].map((v) => (
          <Button key={v} size="lg" variant={selected === v ? "default" : "outline"}
            className="h-14 text-lg font-bold" onClick={() => onPick(v)}>
            {v}
          </Button>
        ))}
      </div>
    );
  }

  if (type === "TypeTheAnswer") {
    return (
      <div className="flex gap-2">
        <input
          value={typed}
          onChange={(e) => onTyped(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmitTyped()}
          placeholder="Type your answer…"
          className="flex-1 h-12 rounded-md border-2 border-foreground/20 bg-background px-3 text-base focus:border-primary/60 focus:outline-none"
        />
        <Button size="lg" className="h-12" onClick={onSubmitTyped}>Submit</Button>
      </div>
    );
  }

  // MultipleChoice
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((o) => (
        <Button key={o.id} size="lg" variant={selected === String(o.id) ? "default" : "outline"}
          className="h-auto min-h-14 py-3 text-base font-semibold whitespace-normal"
          onClick={() => onPick(String(o.id))}>
          {o.text}
        </Button>
      ))}
    </div>
  );
};

// ── Between-question reveal ───────────────────────────────────────────────────
const RevealPanel = ({ username, match }: { username: string; match: ReturnType<typeof useMatch> }) => {
  const me = match.lastResult?.players.find((p) => p.username === username);

  return (
    <Card variant="lifted" hover={false} className="bg-background">
      <CardContent className="p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          {me?.isCorrect ? (
            <span className="flex items-center gap-2 text-emerald-600 font-bold text-2xl">
              <Check className="h-7 w-7" /> Correct! +{me.pointsAwarded}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-red-500 font-bold text-2xl">
              <X className="h-7 w-7" /> {me?.answered ? "Incorrect" : "No answer"}
            </span>
          )}
        </div>

        <Scoreboard entries={match.scoreboard} username={username} />

        <p className="text-center text-xs text-muted-foreground">Next question soon…</p>
      </CardContent>
    </Card>
  );
};

// ── Final results ─────────────────────────────────────────────────────────────
const ResultsPanel = ({
  username,
  match,
  onExit,
}: {
  username: string;
  match: ReturnType<typeof useMatch>;
  onExit: () => void;
}) => {
  const winner = match.matchResult?.winnerUsername;
  const youWon = winner != null && winner === username;

  return (
    <Card variant="lifted" hover={false} className="bg-background">
      <CardContent className="p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 py-2">
          <Trophy className="h-12 w-12 text-yellow-500" />
          <h2 className="text-2xl font-extrabold font-quiz">
            {winner ? (youWon ? "You win! 🎉" : `${winner} wins!`) : "It's a tie!"}
          </h2>
        </div>

        <Scoreboard entries={match.scoreboard} username={username} showRank />

        <Button size="lg" className="w-full h-12 font-bold" onClick={onExit}>
          Back to lobby
        </Button>
      </CardContent>
    </Card>
  );
};

// ── Shared scoreboard ─────────────────────────────────────────────────────────
const Scoreboard = ({
  entries,
  username,
  showRank = false,
}: {
  entries: ScoreboardEntry[];
  username: string;
  showRank?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    {entries.map((e, i) => (
      <div
        key={e.username}
        className={`flex items-center justify-between rounded-md px-4 py-2.5 ${
          e.username === username ? "bg-primary/10 border border-primary/30" : "bg-muted"
        }`}
      >
        <span className="flex items-center gap-3 font-semibold">
          {showRank && <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>}
          {e.username}
          {e.username === username && <span className="text-xs text-primary">(you)</span>}
        </span>
        <span className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{e.correct} correct</span>
          <span className="font-bold tabular-nums w-14 text-right">{e.score}</span>
        </span>
      </div>
    ))}
  </div>
);

// Seconds remaining until an ISO deadline, ticking down locally.
function useCountdown(deadlineUtc: string | null): number {
  const deadline = useMemo(() => (deadlineUtc ? new Date(deadlineUtc).getTime() : 0), [deadlineUtc]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
