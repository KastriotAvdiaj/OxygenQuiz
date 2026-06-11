import { useEffect, useRef, useState, useCallback } from "react";
import type * as signalR from "@microsoft/signalr";
import { useMultiplayer } from "@/hooks/useMultiplayer";

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
  username: string;
}

/**
 * Subscribes to the server-driven match events on the shared SignalR connection and exposes the
 * current match state. The lobby page renders <MultiplayerGame> whenever `phase !== "idle"`.
 */
export const useMatch = ({ sessionId, username }: UseMatchOptions) => {
  const { connection, submitAnswer } = useMultiplayer();

  const [phase, setPhase] = useState<MatchPhase>("idle");
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [question, setQuestion] = useState<RoundQuestionView | null>(null);
  const [deadlineUtc, setDeadlineUtc] = useState<string | null>(null);
  const [answered, setAnswered] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<QuestionResult | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // Keep the current question id in a ref so the submit guard doesn't need to re-bind handlers.
  const questionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!connection) return;

    connection.on("MatchStarting", (seconds: number) => {
      setPhase("starting");
      setCountdownSeconds(seconds);
      setMatchResult(null);
      setLastResult(null);
    });

    connection.on("QuestionStarted", (q: RoundQuestionView, deadline: string) => {
      questionIdRef.current = q.questionId;
      setQuestion(q);
      setDeadlineUtc(deadline);
      setAnswered([]);
      setHasSubmitted(false);
      setLastResult(null);
      setPhase("question");
    });

    connection.on("AnswerSubmitted", (who: string) => {
      setAnswered((prev) => (prev.includes(who) ? prev : [...prev, who]));
    });

    connection.on("QuestionEnded", (result: QuestionResult) => {
      setLastResult(result);
      setScoreboard(result.scoreboard ?? []);
      setPhase("reveal");
    });

    connection.on("MatchEnded", (result: MatchResult) => {
      setMatchResult(result);
      setScoreboard(result.scoreboard ?? []);
      setPhase("ended");
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
      try {
        await submitAnswer(sessionId, username, answer);
      } catch (err) {
        // Let the player retry if the send failed.
        setHasSubmitted(false);
        throw err;
      }
    },
    [hasSubmitted, submitAnswer, sessionId, username]
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
    answered,
    hasSubmitted,
    lastResult,
    scoreboard,
    matchResult,
    submit,
    reset,
  };
};
