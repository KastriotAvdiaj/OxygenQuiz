import { useState } from "react";
import { useLobbyChat } from "../../hooks/use-lobby-chat";
import { LobbyChatView } from "./lobby-chat-view";

interface LobbyChatProps {
  sessionId: string;
  username: string;
}

/**
 * Ephemeral lobby chat panel. Renders the recent messages and lets the user send new ones.
 * Messages are escaped as text by React (never HTML), so chat input can't inject markup.
 */
export const LobbyChat = ({ sessionId, username }: LobbyChatProps) => {
  const { messages, send } = useLobbyChat(sessionId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await send(text);
      setDraft("");
    } catch {
      // Notification is surfaced by the context layer; keep the draft so they can retry.
    } finally {
      setSending(false);
    }
  };

  return (
    <LobbyChatView
      messages={messages}
      username={username}
      draft={draft}
      sending={sending}
      onDraftChange={setDraft}
      onSubmit={submit}
    />
  );
};
