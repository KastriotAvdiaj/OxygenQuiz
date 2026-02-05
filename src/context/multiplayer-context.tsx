import React, { createContext, useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";

interface MultiplayerContextType {
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  joinSession: (sessionId: string, username: string) => Promise<void>;
  leaveSession: (sessionId: string, username: string) => Promise<void>;
  submitAnswer: (sessionId: string, username: string, answer: string) => Promise<void>;
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
      }
    }
  }, []);

  const leaveSession = useCallback(async (sessionId: string, username: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
        try {
            await connectionRef.current.invoke("LeaveSession", sessionId, username);
        } catch (err) {
            console.error("Error leaving session:", err);
        }
    }
  }, []);

  const submitAnswer = useCallback(async (sessionId: string, username: string, answer: string) => {
      if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
          try {
              await connectionRef.current.invoke("SubmitAnswer", sessionId, username, answer);
          } catch (err) {
              console.error("Error submitting answer:", err);
          }
      }
  }, []);

  return (
    <MultiplayerContext.Provider value={{ connection, isConnected, joinSession, leaveSession, submitAnswer }}>
      {children}
    </MultiplayerContext.Provider>
  );
};
