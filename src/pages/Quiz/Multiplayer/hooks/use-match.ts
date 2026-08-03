import { useEffect, useRef, useState, useCallback } from "react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { audio } from "@/lib/audio";

// Wire shapes mirror the server's match DTOs (SignalR serializes them camelCased).
// See OxygenBackend/QuizAPI/Services/QuizSessionServices/MatchModels.cs.

export interface RoundOption {
  id: number;
  text: string;
}

export interface RoundQuestionView {
  index: number;
  total: number;
  questionId: number;
  type: string; // "MultipleChoice" | "TrueFalse" | "TypeTheAnswer"
  text: string;
  imageUrl?: string | null;
  timeLimitSeconds: number;
  options: RoundOption[];
  allowMultipleSelections?: boolean;
}

export interface ScoreboardEntry {
  username: string;
  score: number;
  correct: number;
}

export interface PlayerRoundResult {
  username: string;
  answered: boolean;
  isCorrect: boolean;
  pointsAwarded: number;
  totalScore: number;
}

export interface QuestionResult {
  index: number;
  questionId: number;
  players: PlayerRoundResult[];
  scoreboard: ScoreboardEntry[];
}

export interface MatchResult {
  scoreboard: ScoreboardEntry[];
  winnerUsername?: string | null;
}

export type MatchPhase = "idle" | "starting" | "question" | "reveal" | "ended";

interface UseMatchOptions {
  sessionId: string;
  /** Current player's username, used to pick correct/wrong and win/lose sounds for *this* player. */
  username?: string;
}

/**
 * Subscribes to the server-driven match events on the shared SignalR connection and exposes the
 * current match state. The lobby page renders <MultiplayerGame> whenever `phase !== "idle"`.
 */
export const useMatch = ({ sessionId, username }: UseMatchOptions) => {
  const { connection, submitAnswer } = useMultiplayer();

  // Keep the latest username in a ref so the SignalR handlers (bound once) always see it.
  const usernameRef = useRef<string | undefined>(username);
  usernameRef.current = username;

  const [phase, setPhase] = useState<MatchPhase>("idle");
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [question, setQuestion] = useState<RoundQuestionView | null>(null);
  const [deadlineUtc, setDeadlineUtc] = useState<string | null>(null);
  /**
   * Estimated `serverClock − clientClock`, in milliseconds, measured when a question opens.
   *
   * The server sends an absolute `deadlineUtc`, and a client that subtracts its own `Date.now()`
   * from it is implicitly asserting that the two machines agree on the time. They frequently
   * don't — a phone whose clock has drifted a few seconds turns a 30s question into a 33s one,
   * which is exactly the symptom that sent us looking. The deadline is always `serverNow + limit`
   * at the moment it is sent (MatchOrchestrator.RunMatchAsync), so the instant the event arrives
   * we can read the server's clock off it and diff it against ours.
   *
   * Network latency lands in here too, and in the player's favour: a 100ms flight makes us think
   * our clock is 100ms behind, so we grant 100ms extra. That is the right direction to be wrong
   * in — the server's own deadline check (QuizHub.SubmitAnswer) is the authority either way, so a
   * generous client display can never turn a late answer into a scored one.
   */
  const [clockSkewMs, setClockSkewMs] = useState(0);
  const [answered, setAnswered] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<QuestionResult | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // Keep the current question id in a ref so the submit guard doesn't need to re-bind handlers.
  const questionIdRef = useRef<number | null>(null);

  // Monotonic timestamp of when the current question hit the screen. Reported with the answer so
  // the server can score on true think time instead of think time + ping (docs/quiz/quiz-grading.md).
  const questionShownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!connection) return;

    connection.on("MatchStarting", (seconds: number) => {
      setPhase("starting");
      setCountdownSeconds(seconds);
      setMatchResult(null);
      setLastResult(null);
      audio.play("start");
      audio.playMusic("gameplay"); // background bed for the match
    });

    connection.on("QuestionStarted", (q: RoundQuestionView, deadline: string) => {
      questionIdRef.current = q.questionId;
      questionShownAtRef.current = performance.now();

      // Re-measure the clock offset every question rather than once per match: a device clock can
      // be corrected by NTP mid-match, and a stale offset would be worse than none.
      const deadlineMs = new Date(deadline).getTime();
      const limitMs = q.timeLimitSeconds > 0 ? q.timeLimitSeconds * 1000 : 0;
      setClockSkewMs(
        Number.isFinite(deadlineMs) && limitMs > 0 ? deadlineMs - limitMs - Date.now() : 0
      );

      setQuestion(q);
      setDeadlineUtc(deadline);
      setAnswered([]);
      setHasSubmitted(false);
      setLastResult(null);
      setPhase("question");
      audio.play("whoosh"); // new question appears
    });

    connection.on("AnswerSubmitted", (who: string) => {
      setAnswered((prev) => (prev.includes(who) ? prev : [...prev, who]));
    });

    connection.on("QuestionEnded", (result: QuestionResult) => {
      setLastResult(result);
      setScoreboard(result.scoreboard ?? []);
      setPhase("reveal");
      // Did *this* player get it right? Play the matching sound.
      const me = result.players?.find((p) => p.username === usernameRef.current);
      if (me) audio.play(me.isCorrect ? "correct" : "wrong");
    });

    connection.on("MatchEnded", (result: MatchResult) => {
      setMatchResult(result);
      setScoreboard(result.scoreboard ?? []);
      setPhase("ended");
      audio.stopMusic();
      const won = result.winnerUsername != null && result.winnerUsername === usernameRef.current;
      audio.play(won ? "win" : "lose");
    });

    return () => {
      connection.off("MatchStarting");
      connection.off("QuestionStarted");
      connection.off("AnswerSubmitted");
      connection.off("QuestionEnded");
      connection.off("MatchEnded");
    };
  }, [connection]);

  // Submit an answer for the current question. `answer` is an option id (multiple choice) or
  // raw text ("True"/"False" or the typed answer).
  const submit = useCallback(
    async (answer: string) => {
      if (hasSubmitted) return;
      setHasSubmitted(true);
      audio.play("lock"); // your answer is locked in
      const shownAt = questionShownAtRef.current;
      const clientElapsedMs =
        shownAt !== null ? Math.max(1, Math.round(performance.now() - shownAt)) : undefined;
      try {
        await submitAnswer(sessionId, answer, clientElapsedMs);
      } catch (err) {
        // Let the player retry if the send failed.
        setHasSubmitted(false);
        throw err;
      }
    },
    [hasSubmitted, submitAnswer, sessionId]
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setQuestion(null);
    setMatchResult(null);
    setLastResult(null);
    setAnswered([]);
    setHasSubmitted(false);
  }, []);

  const isActive = phase !== "idle";

  return {
    phase,
    isActive,
    countdownSeconds,
    question,
    deadlineUtc,
    clockSkewMs,
    answered,
    hasSubmitted,
    lastResult,
    scoreboard,
    matchResult,
    submit,
    reset,
  };
};
