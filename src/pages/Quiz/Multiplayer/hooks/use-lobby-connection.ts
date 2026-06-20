import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useNotifications } from "@/common/Notifications";
import { useUser } from "@/lib/Auth";
import { useNavigationGuard } from "./use-navigation-guard";

export interface SelectedQuiz {
  id: string;
  title: string;
}

export interface Participant {
  username: string;
  isReady: boolean;
  isHost: boolean;
}

interface UseLobbyConnectionOptions {
  mode?: "create" | "join";
}

export const useLobbyConnection = ({ mode = "join" }: UseLobbyConnectionOptions) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { connection, isConnected, joinSession, leaveSession, selectQuiz } = useMultiplayer();
  const { addNotification } = useNotifications();
  const { data: user } = useUser();

  // Identity always comes from the logged-in account — the lobby routes are auth-gated,
  // so `user` is present. The host/participant name is therefore the real account username,
  // never free-typed text.
  const username = user?.username ?? "";
  const [sessionId, setSessionId] = useState(searchParams.get("code")?.toUpperCase() || "");
  const [hasJoined, setHasJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<SelectedQuiz | null>(null);

  // Refs to capture latest values for the cleanup effect
  const sessionIdRef = useRef(sessionId);
  const usernameRef = useRef(username);
  const hasJoinedRef = useRef(hasJoined);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { hasJoinedRef.current = hasJoined; }, [hasJoined]);

  // Auto-leave when the component unmounts (e.g., browser back button)
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current && sessionIdRef.current && usernameRef.current) {
        leaveSession(sessionIdRef.current).catch((err) =>
          console.error("Failed to leave session on unmount:", err)
        );
        sessionStorage.removeItem("quiz_session");
      }
    };
  }, [leaveSession]);

  const currentUser = useMemo(
    () => participants.find((p) => p.username === username),
    [participants, username]
  );
  const isHost = currentUser?.isHost ?? false;
  const isReady = currentUser?.isReady ?? false;
  const allPlayersReady = participants.length > 0 && participants.every((p) => p.isReady);
  const hasSelectedQuiz = selectedQuiz !== null;

  // Navigation guard — blocks accidental back-button / navigation while in the lobby
  const { showLeaveDialog, confirmNavigation, cancelNavigation } =
    useNavigationGuard(hasJoined);
  const canStartQuiz = isHost && participants.length >= 2 && allPlayersReady && hasSelectedQuiz;

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Generate room code for create mode
  useEffect(() => {
    if (mode === "create" && !sessionId) {
      setSessionId(generateRoomCode());
    }
  }, [mode, sessionId]);

  // SignalR event listeners
  useEffect(() => {
    if (!connection) return;

    connection.on("UserJoined", (joinedUsername: string, isFirstUser: boolean) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.username === joinedUsername)) return prev;
        return [
          ...prev,
          {
            username: joinedUsername,
            isReady: false,
            isHost: isFirstUser,
          },
        ];
      });

      if (joinedUsername !== username) {
        addNotification({
          type: "success",
          title: `${joinedUsername} joined the lobby`,
        });
      }
    });

    connection.on("CurrentParticipants", (currentParticipants: Participant[]) => {
      setParticipants(currentParticipants);
    });

    connection.on("UserLeft", (leftUsername: string) => {
      setParticipants((prev) => prev.filter((p) => p.username !== leftUsername));

      addNotification({
        type: "error",
        title: `${leftUsername} left the lobby`,
      });
    });

    connection.on("PlayerReadyChanged", (playerUsername: string, ready: boolean) => {
      setParticipants((prev) =>
        prev.map((p) => (p.username === playerUsername ? { ...p, isReady: ready } : p))
      );
    });

    connection.on("HostChanged", (newHostUsername: string) => {
      setParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          isHost: p.username === newHostUsername,
        }))
      );

      addNotification({
        type: "info",
        title: `${newHostUsername} is now the host`,
      });
    });

    connection.on("GameStarted", (startedQuizId: string) => {
      navigate(`/quiz/${startedQuizId}/play`);
    });

    connection.on("QuizSelected", (quizId: string, quizTitle: string) => {
      setSelectedQuiz({ id: quizId, title: quizTitle });
    });

    return () => {
      connection.off("UserJoined");
      connection.off("CurrentParticipants");
      connection.off("UserLeft");
      connection.off("PlayerReadyChanged");
      connection.off("HostChanged");
      connection.off("GameStarted");
      connection.off("QuizSelected");
    };
  }, [connection, addNotification, navigate, username]);

  const autoResumeAttempted = useRef(false);

  // Auto-resume session from sessionStorage
  useEffect(() => {
    const storedSession = sessionStorage.getItem("quiz_session");
    if (!storedSession || !isConnected || hasJoined || autoResumeAttempted.current) return;

    try {
      const { sessionId: storedId, username: storedUser } = JSON.parse(storedSession);

      const shouldAutoResume =
        mode === "join" || (mode === "create" && storedId === sessionId);

      // Only auto-resume a stored session that belongs to the current account.
      if (storedId && storedUser === username && shouldAutoResume) {
        autoResumeAttempted.current = true;
        setSessionId(storedId);

        joinSession(storedId)
          .then(() => {
            setHasJoined(true);
            console.log("Auto-resumed session:", storedId);
          })
          .catch((err) => {
            console.error("Failed to auto-resume session:", err);
            sessionStorage.removeItem("quiz_session");
            addNotification({
              type: "warning",
              title: "Could not rejoin previous session",
            });
          });
      } else if (!shouldAutoResume) {
        sessionStorage.removeItem("quiz_session");
      }
    } catch (e) {
      console.error("Failed to parse stored session", e);
      sessionStorage.removeItem("quiz_session");
    }
  }, [isConnected, hasJoined, joinSession, mode, sessionId, addNotification, username]);

  const handleJoinSession = useCallback(async () => {
    if (!username.trim()) {
      setJoinError("You must be logged in to join a lobby");
      return;
    }
    if (!sessionId.trim()) {
      setJoinError("Room code is required");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      await joinSession(sessionId);
      sessionStorage.setItem("quiz_session", JSON.stringify({ sessionId, username }));
      setHasJoined(true);

      addNotification({
        type: "success",
        title: "Successfully joined lobby",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join lobby";
      setJoinError(errorMessage);

      addNotification({
        type: "error",
        title: "Failed to join lobby - Please check the room code and try again",
      });
    } finally {
      setIsJoining(false);
    }
  }, [username, sessionId, joinSession, addNotification]);

  const handleLeaveSession = useCallback(async () => {
    await leaveSession(sessionId);
    sessionStorage.removeItem("quiz_session");
    setHasJoined(false);
    setParticipants([]);
    setSessionId("");
  }, [sessionId, username, leaveSession]);

  const handleCopyInvite = useCallback(() => {
    const inviteLink = `${window.location.origin}/multiplayer/join?code=${sessionId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);

    addNotification({
      type: "success",
      title: "Invite link copied to clipboard",
    });

    setTimeout(() => setCopied(false), 2000);
  }, [sessionId, addNotification]);

  const handleToggleReady = useCallback(async () => {
    const newReadyState = !isReady;

    try {
      await connection?.invoke("ToggleReady", sessionId, newReadyState);
    } catch (err) {
      console.error("ToggleReady failed", err);
      addNotification({
        type: "error",
        title: "Failed to update ready status",
      });
    }
  }, [isReady, connection, sessionId, username, addNotification]);

  const handleSelectQuiz = useCallback(
    async (quizId: string, quizTitle: string) => {
      try {
        await selectQuiz(sessionId, quizId, quizTitle);
        addNotification({
          type: "success",
          title: `Selected: ${quizTitle}`,
        });
      } catch (err) {
        console.error("SelectQuiz failed", err);
        addNotification({
          type: "error",
          title: "Failed to select quiz",
        });
      }
    },
    [sessionId, selectQuiz, addNotification]
  );

  // Kicks off the live multiplayer match. The server runs the question loop and pushes
  // MatchStarting / QuestionStarted / QuestionEnded / MatchEnded to everyone (see useMatch).
  const handleStartQuiz = useCallback(() => {
    if (!selectedQuiz) return;
    connection
      ?.invoke("StartMatch", sessionId)
      .then(() => {
        addNotification({
          type: "success",
          title: "Starting match...",
        });
      })
      .catch((err) => {
        console.error("StartMatch failed", err);
        addNotification({
          type: "error",
          title: err?.message ?? "Failed to start the match",
        });
      });
  }, [connection, sessionId, selectedQuiz, addNotification]);

  return {
    // State
    username,
    sessionId,
    setSessionId,
    hasJoined,
    participants,
    copied,
    isJoining,
    joinError,
    isConnected,
    selectedQuiz,

    // Computed
    isHost,
    isReady,
    allPlayersReady,
    canStartQuiz,
    hasSelectedQuiz,

    // Navigation guard
    showLeaveDialog,
    confirmNavigation,
    cancelNavigation,

    // Actions
    handleJoinSession,
    handleLeaveSession,
    handleCopyInvite,
    handleToggleReady,
    handleStartQuiz,
    handleSelectQuiz,
  };
};
