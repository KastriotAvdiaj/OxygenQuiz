import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useNotifications } from "@/common/Notifications";

export interface Participant {
  username: string;
  isReady: boolean;
  isHost: boolean;
}

interface UseLobbyConnectionOptions {
  mode?: "create" | "join";
  quizId?: string;
}

export const useLobbyConnection = ({ mode = "join", quizId = "" }: UseLobbyConnectionOptions) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { connection, isConnected, joinSession, leaveSession } = useMultiplayer();
  const { addNotification } = useNotifications();

  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState(searchParams.get("code")?.toUpperCase() || "");
  const [hasJoined, setHasJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const currentUser = useMemo(
    () => participants.find((p) => p.username === username),
    [participants, username]
  );
  const isHost = currentUser?.isHost ?? false;
  const isReady = currentUser?.isReady ?? false;
  const allPlayersReady = participants.length > 0 && participants.every((p) => p.isReady);
  const canStartQuiz = isHost && participants.length >= 2 && allPlayersReady;

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

    return () => {
      connection.off("UserJoined");
      connection.off("CurrentParticipants");
      connection.off("UserLeft");
      connection.off("PlayerReadyChanged");
      connection.off("HostChanged");
      connection.off("GameStarted");
    };
  }, [connection, addNotification, navigate, username]);

  // Auto-resume session from sessionStorage
  useEffect(() => {
    const storedSession = sessionStorage.getItem("quiz_session");
    if (!storedSession || !isConnected || hasJoined) return;

    try {
      const { sessionId: storedId, username: storedUser } = JSON.parse(storedSession);

      const shouldAutoResume =
        mode === "join" || (mode === "create" && storedId === sessionId);

      if (storedId && storedUser && shouldAutoResume) {
        setSessionId(storedId);
        setUsername(storedUser);

        joinSession(storedId, storedUser)
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
  }, [isConnected, hasJoined, joinSession, mode, sessionId, addNotification]);

  const handleJoinSession = useCallback(async () => {
    if (!username.trim()) {
      setJoinError("Username is required");
      return;
    }
    if (!sessionId.trim()) {
      setJoinError("Room code is required");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      await joinSession(sessionId, username);
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
    await leaveSession(sessionId, username);
    sessionStorage.removeItem("quiz_session");
    setHasJoined(false);
    setParticipants([]);
    setUsername("");
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
      await connection?.invoke("ToggleReady", sessionId, username, newReadyState);
    } catch (err) {
      console.error("ToggleReady failed", err);
      addNotification({
        type: "error",
        title: "Failed to update ready status",
      });
    }
  }, [isReady, connection, sessionId, username, addNotification]);

  const handleStartQuiz = useCallback(() => {
    connection
      ?.invoke("StartQuiz", sessionId, quizId)
      .then(() => {
        addNotification({
          type: "success",
          title: "Starting quiz...",
        });
      })
      .catch((err) => {
        console.error("StartQuiz failed", err);
        addNotification({
          type: "error",
          title: "Failed to start quiz",
        });
      });
  }, [connection, sessionId, quizId, addNotification]);

  return {
    // State
    username,
    setUsername,
    sessionId,
    setSessionId,
    hasJoined,
    participants,
    copied,
    isJoining,
    joinError,
    isConnected,

    // Computed
    isHost,
    isReady,
    allPlayersReady,
    canStartQuiz,

    // Actions
    handleJoinSession,
    handleLeaveSession,
    handleCopyInvite,
    handleToggleReady,
    handleStartQuiz,
  };
};
