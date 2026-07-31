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
/** Newest N messages kept in state — the list is scrollback-only, so older ones are just DOM
 *  nodes nobody scrolls back to. Keeps a long-lived lobby from unbounded growth. */
const MAX_MESSAGES = 200;

const appendCapped = (prev: LobbyChatMessage[], message: LobbyChatMessage) => {
  const next = [...prev, message];
  return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
};

export const useLobbyChat = (sessionId: string) => {
  const { connection, sendLobbyMessage } = useMultiplayer();
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);

  useEffect(() => {
    if (!connection) return;

    connection.on("ChatHistory", (history: LobbyChatMessage[]) => {
      setMessages((history ?? []).slice(-MAX_MESSAGES));
    });

    connection.on("ChatMessageReceived", (message: LobbyChatMessage) => {
      setMessages((prev) => appendCapped(prev, message));
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
