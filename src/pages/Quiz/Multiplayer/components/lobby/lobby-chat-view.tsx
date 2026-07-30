import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LobbyChatMessage } from "../../hooks/use-lobby-chat";

export interface LobbyChatViewProps {
  messages: LobbyChatMessage[];
  username: string;
  draft: string;
  sending: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}

/**
 * Presentational half of LobbyChat: message list + composer. Split out of the hook-wired
 * component (useLobbyChat owns the SignalR subscription) so it can be previewed in Storybook
 * with no backend — same pattern as MultiplayerGame / QuizInterface.
 */
export const LobbyChatView = ({
  messages,
  username,
  draft,
  sending,
  onDraftChange,
  onSubmit,
}: LobbyChatViewProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

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
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Type a message…"
          className="flex-1 h-9 rounded-md border-2 border-foreground/20 bg-background px-3 text-sm focus:border-primary/60 focus:outline-none"
        />
        <Button size="sm" className="h-9 px-3" onClick={onSubmit} disabled={sending || !draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
