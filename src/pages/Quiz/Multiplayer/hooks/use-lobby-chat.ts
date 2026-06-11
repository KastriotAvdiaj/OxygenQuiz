import { useEffect, useState, useCallback } from "react";
import { useMultiplayer } from "@/hooks/useMultiplayer";

// Mirrors the server's LobbyChatMessage (SignalR serializes it camelCased).
export interface LobbyChatMessage {
  username: string;
  text: string;
  sentUtc: string;
  isSystem: boolean;
}

/**
 * Ephemeral lobby chat. Subscribes to ChatHistory (sent on join) and ChatMessageReceived on the
 * shared SignalR connection, and exposes a `send` that invokes the hub. Messages are not stored
 * anywhere on the client beyond this state.
 */
export const useLobbyChat = (sessionId: string) => {
  const { connection, sendLobbyMessage } = useMultiplayer();
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);

  useEffect(() => {
    if (!connection) return;

    connection.on("ChatHistory", (history: LobbyChatMessage[]) => {
      setMessages(history ?? []);
    });

    connection.on("ChatMessageReceived", (message: LobbyChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      connection.off("ChatHistory");
      connection.off("ChatMessageReceived");
    };
  }, [connection]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await sendLobbyMessage(sessionId, trimmed);
    },
    [sendLobbyMessage, sessionId]
  );

  return { messages, send };
};
