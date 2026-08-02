import { useState } from "react";
import type { LobbyChatMessage } from "../../hooks/use-lobby-chat";
import { LobbyChatView } from "./lobby-chat-view";

interface LobbyChatProps {
  messages: LobbyChatMessage[];
  username: string;
  onSend: (text: string) => Promise<void>;
}

/**
 * Composer half of the lobby chat: owns the draft and the in-flight state, and delegates
 * rendering to LobbyChatView.
 *
 * **It deliberately owns no subscription.** `useLobbyChat` lives up in MultiplayerLobbyPage and
 * the messages arrive here as props, which is what lets the lobby render chat in two shells —
 * the desktop panel and the mobile drawer. The hook registers handlers on the *shared* SignalR
 * connection and its cleanup calls `connection.off("ChatHistory")`, which removes handlers for
 * that event globally: a second mounted copy would mean unmounting either one silently killed
 * the other's messages. See docs/RESPONSIVE.md ("a shared child that owns live state").
 *
 * Both shells are mounted at once (CSS hides one), so two copies of this component exist and
 * keep independent drafts. Harmless in practice — only one is ever visible, and the only way to
 * swap is to cross the `lg` breakpoint mid-sentence.
 */
export const LobbyChat = ({ messages, username, onSend }: LobbyChatProps) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
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
