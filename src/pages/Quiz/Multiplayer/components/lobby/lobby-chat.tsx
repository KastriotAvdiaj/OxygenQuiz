import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLobbyChat } from "../../hooks/use-lobby-chat";

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
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

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
    <div className="flex flex-col h-full min-h-[200px]">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Chat
      </h3>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-3 max-h-[280px]"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 text-center py-6">
            Say hi while you wait…
          </p>
        ) : (
          messages.map((m, i) =>
            m.isSystem ? (
              <p key={i} className="text-center text-[11px] italic text-muted-foreground/70">
                {m.text}
              </p>
            ) : (
              <div key={i} className="text-sm leading-snug">
                <span
                  className={`font-semibold ${
                    m.username === username ? "text-primary" : "text-foreground"
                  }`}
                >
                  {m.username}
                </span>
                <span className="text-muted-foreground">: </span>
                <span className="break-words">{m.text}</span>
              </div>
            )
          )
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type a message…"
          className="flex-1 h-9 rounded-md border-2 border-foreground/20 bg-background px-3 text-sm focus:border-primary/60 focus:outline-none"
        />
        <Button size="sm" className="h-9 px-3" onClick={submit} disabled={sending || !draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
