import React, { createContext, useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";

interface MultiplayerContextType {
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  joinSession: (sessionId: string, username: string) => Promise<void>;
  leaveSession: (sessionId: string, username: string) => Promise<void>;
  submitAnswer: (sessionId: string, username: string, answer: string) => Promise<void>;
  createSession: (sessionId: string, lobbyName: string, maxPlayers: number, username: string) => Promise<void>;
  selectQuiz: (sessionId: string, quizId: string, quizTitle: string) => Promise<void>;
  startMatch: (sessionId: string) => Promise<void>;
  sendLobbyMessage: (sessionId: string, text: string) => Promise<void>;
}

export const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Ref to track if we are currently connected/connecting to avoid re-renders or double connections
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    // Derive SignalR URL from the API base URL
    const apiBaseUrl = "https://localhost:7153"; // Same as Api-client.ts
    const hubUrl = `${apiBaseUrl}/quizHub`;
    
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

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
    };
  }, []);

  const joinSession = useCallback(async (sessionId: string, username: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
         await connectionRef.current.invoke("JoinSession", sessionId, username);
      } catch (err) {
        console.error("Error joining session:", err);
        throw new Error("Failed to join session. The room may not exist.");
      }
    } else {
      throw new Error("Not connected to server. Please refresh and try again.");
    }
  }, []);

  const leaveSession = useCallback(async (sessionId: string, username: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
        try {
            await connectionRef.current.invoke("LeaveSession", sessionId, username);
        } catch (err) {
            console.error("Error leaving session:", err);
            throw new Error("Failed to leave session.");
        }
    }
  }, []);

  const submitAnswer = useCallback(async (sessionId: string, username: string, answer: string) => {
      if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
          try {
              await connectionRef.current.invoke("SubmitAnswer", sessionId, username, answer);
          } catch (err) {
              console.error("Error submitting answer:", err);
              throw new Error("Failed to submit answer.");
          }
      }
  }, []);

  const createSession = useCallback(async (sessionId: string, lobbyName: string, maxPlayers: number, username: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke("CreateSession", sessionId, lobbyName, maxPlayers, username);
      } catch (err) {
        console.error("Error creating session:", err);
        throw new Error("Failed to create session. The room code may already exist.");
      }
    } else {
      throw new Error("Not connected to server. Please refresh and try again.");
    }
  }, []);

  const selectQuiz = useCallback(async (sessionId: string, quizId: string, quizTitle: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke("SelectQuiz", sessionId, quizId, quizTitle);
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
        // Surface the server's reason (e.g. "Need at least 2 players to start.").
        throw new Error(err instanceof Error ? err.message : "Failed to start the match.");
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
        throw new Error(err instanceof Error ? err.message : "Failed to send message.");
      }
    }
  }, []);

  return (
    <MultiplayerContext.Provider value={{ connection, isConnected, joinSession, leaveSession, submitAnswer, createSession, selectQuiz, startMatch, sendLobbyMessage }}>
      {children}
    </MultiplayerContext.Provider>
  );
};
