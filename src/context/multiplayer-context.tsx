import React, { createContext, useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { getAccessToken } from "@/lib/token-store";
import { useUser } from "@/lib/Auth";
import type { SelectedQuiz } from "@/types/quiz-types";
import { hubErrorMessage } from "./hub-error";
import { createLobbyMembership, type LobbyMembership } from "./lobby-rejoin";

/** Stable cause codes mirroring `JoinFailureReason` on the server. */
export type JoinFailureReason = "not-found" | "full";

/**
 * Result of `CheckSession` — the pre-flight room-code lookup the join dialog runs before it
 * navigates. Advisory: the lobby can fill between this call and the join, so `JoinSession` still
 * re-checks. See docs/quiz/multiplayer-join.md.
 */
export interface SessionAvailability {
  canJoin: boolean;
  reason: JoinFailureReason | null;
  message: string | null;
  /** A match is already running. Informational — joining mid-match is allowed. */
  inProgress: boolean;
  lobbyName: string;
  participantCount: number;
  maxPlayers: number;
}

interface MultiplayerContextType {
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  /**
   * Set when the connection came back but the lobby refused the automatic rejoin (it was closed,
   * or filled up) — the server's own message. Cleared by the next successful join.
   */
  rejoinError: string | null;
  joinSession: (sessionId: string) => Promise<void>;
  checkSession: (sessionId: string) => Promise<SessionAvailability>;
  leaveSession: (sessionId: string) => Promise<void>;
  submitAnswer: (sessionId: string, answer: string, clientElapsedMs?: number) => Promise<void>;
  createSession: (sessionId: string, lobbyName: string, maxPlayers: number) => Promise<void>;
  selectQuiz: (sessionId: string, quiz: SelectedQuiz) => Promise<void>;
  startMatch: (sessionId: string) => Promise<void>;
  sendLobbyMessage: (sessionId: string, text: string) => Promise<void>;
}

export const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rejoinError, setRejoinError] = useState<string | null>(null);
  // Which lobby to rejoin after an automatic reconnect — see lobby-rejoin.ts.
  const membershipRef = useRef<LobbyMembership | null>(null);
  
  // Ref to track if we are currently connected/connecting to avoid re-renders or double connections
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const { data: user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    // The quiz hub is [Authorize]'d, so only open a socket once we're authenticated.
    // Rebuild when the account changes (login / logout / switch user).
    if (!userId) return;

    // Origin (without the /api suffix) for the SignalR hub, derived from VITE_API_URL so
    // dev → https://localhost:7153 and prod → https://api.oxygenquiz.com automatically.
    const apiBaseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
    const hubUrl = `${apiBaseUrl}/quizHub`;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        // Send the in-memory JWT so the hub can authenticate the socket. The factory is
        // re-invoked on every (re)connect, so a refreshed token is picked up automatically.
        accessTokenFactory: () => getAccessToken() ?? "",
      })
      .withAutomaticReconnect()
      .build();

    // A reconnect is a new connection id the server doesn't know: rejoin the lobby, or the player
    // stops hearing it and is dropped from the roster after the 5s grace (multiplayer.md §3.6).
    membershipRef.current = createLobbyMembership(newConnection, {
      onRejoined: (id) => console.log("SignalR reconnected; rejoined", id),
      onRejoinFailed: (_id, message) => setRejoinError(message),
    });
    newConnection.onreconnecting(() => setIsConnected(false));
    newConnection.onreconnected(() => setIsConnected(true));
    newConnection.onclose(() => setIsConnected(false));

    setConnection(newConnection);
    connectionRef.current = newConnection;

    newConnection.start()
      .then(() => {
        console.log("SignalR Connected");
        setIsConnected(true);
      })
      .catch((err) => console.error("SignalR Connection Error: ", err));

    return () => {
      newConnection.stop();
      connectionRef.current = null;
      membershipRef.current = null;
      setConnection(null);
      setIsConnected(false);
    };
  }, [userId]);

  const joinSession = useCallback(async (sessionId: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
         await connectionRef.current.invoke("JoinSession", sessionId);
         membershipRef.current?.joined(sessionId);
         setRejoinError(null);
      } catch (err) {
        console.error("Error joining session:", err);
        // Relay the hub's own message. It used to be replaced with a hardcoded "The room may not
        // exist.", which reported a *full* lobby as a missing one — the hub now throws HubException
        // with the real cause (see QuizHub.JoinSession), so pass it through and only fall back when
        // there's nothing usable.
        throw new Error(hubErrorMessage(err, "Couldn't join that lobby. Please try again."));
      }
    } else {
      throw new Error("Not connected to server. Please refresh and try again.");
    }
  }, []);

  const checkSession = useCallback(async (sessionId: string): Promise<SessionAvailability> => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to server. Please refresh and try again.");
    }
    try {
      return await connectionRef.current.invoke<SessionAvailability>("CheckSession", sessionId);
    } catch (err) {
      console.error("Error checking session:", err);
      // A rejected code comes back as a normal result (canJoin: false), so a throw here is a
      // transport or auth problem — not something about the code the user typed.
      throw new Error(hubErrorMessage(err, "Couldn't reach the server. Please try again."));
    }
  }, []);

  const leaveSession = useCallback(async (sessionId: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
        try {
            membershipRef.current?.left();
            await connectionRef.current.invoke("LeaveSession", sessionId);
        } catch (err) {
            console.error("Error leaving session:", err);
            throw new Error("Failed to leave session.");
        }
    }
  }, []);

  // clientElapsedMs: think time measured with performance.now() by the caller (use-match).
  // The server validates it and uses it for scoring only, so ping doesn't decide close rounds.
  const submitAnswer = useCallback(async (sessionId: string, answer: string, clientElapsedMs?: number) => {
      if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
          try {
              await connectionRef.current.invoke("SubmitAnswer", sessionId, answer, clientElapsedMs ?? null);
          } catch (err) {
              console.error("Error submitting answer:", err);
              throw new Error("Failed to submit answer.");
          }
      }
  }, []);

  const createSession = useCallback(async (sessionId: string, lobbyName: string, maxPlayers: number) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke("CreateSession", sessionId, lobbyName, maxPlayers);
        membershipRef.current?.joined(sessionId);
      } catch (err) {
        console.error("Error creating session:", err);
        throw new Error("Failed to create session. The room code may already exist.");
      }
    } else {
      throw new Error("Not connected to server. Please refresh and try again.");
    }
  }, []);

  const selectQuiz = useCallback(async (sessionId: string, quiz: SelectedQuiz) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke("SelectQuiz", sessionId, quiz);
      } catch (err) {
        console.error("Error selecting quiz:", err);
        throw new Error("Failed to select quiz. Only the host can select a quiz.");
      }
    } else {
      throw new Error("Not connected to server. Please refresh and try again.");
    }
  }, []);

  const startMatch = useCallback(async (sessionId: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke("StartMatch", sessionId);
      } catch (err) {
        console.error("Error starting match:", err);
        // Surface the server's reason (e.g. "Need at least 2 players to start."). Raw err.message
        // carries SignalR's "An unexpected error occurred invoking 'StartMatch'… HubException:"
        // wrapper, so it goes through the same unwrap as joinSession.
        throw new Error(hubErrorMessage(err, "Failed to start the match."));
      }
    } else {
      throw new Error("Not connected to server. Please refresh and try again.");
    }
  }, []);

  const sendLobbyMessage = useCallback(async (sessionId: string, text: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke("SendLobbyMessage", sessionId, text);
      } catch (err) {
        console.error("Error sending chat message:", err);
        throw new Error(hubErrorMessage(err, "Failed to send message."));
      }
    }
  }, []);

  return (
    <MultiplayerContext.Provider value={{ connection, isConnected, rejoinError, joinSession, checkSession, leaveSession, submitAnswer, createSession, selectQuiz, startMatch, sendLobbyMessage }}>
      {children}
    </MultiplayerContext.Provider>
  );
};
