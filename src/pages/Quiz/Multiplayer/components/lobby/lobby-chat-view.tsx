import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
 *
 * Renders headerless: it lives inside a <LobbyPanel> whose title bar already says "Chat".
 */
export const LobbyChatView = ({
  messages,
  username,
  draft,
  sending,
  onDraftChange,
  onSubmit,
}: LobbyChatViewProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Keep the view pinned to the newest message. ScrollArea's actual scrollable element is the
  // Radix viewport it renders internally, not the Root the ref is attached to.
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    viewport?.scrollTo({ top: viewport.scrollHeight });
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* `flex-1 min-h-0`, not a fixed height: both containers now give this a definite height to
          divide up — the desktop board is a viewport-height grid with a `1fr` row, and the mobile
          drawer is capped at 70dvh. `min-h-0` is load-bearing; without it the flex child's default
          `min-height: auto` floors it at content size and the message list grows its container
          instead of scrolling.
          This used to be a hard-coded `lg:h-[17rem]` because no ancestor resolved to a definite
          height, which is what pushed the desktop board past the fold on a laptop. */}
      <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 px-2.5 py-2 lg:px-3">
        <div className="space-y-1.5 pr-3">
          {messages.length === 0 ? (
            <p className="py-8 text-center font-quiz text-sm text-muted-foreground/70 lg:text-base">
              Say hi while you wait…
            </p>
          ) : (
            messages.map((m, i) =>
              m.isSystem ? (
                <p
                  key={i}
                  className="text-center text-[11px] italic text-muted-foreground/70"
                >
                  {m.text}
                </p>
              ) : (
                <div
                  key={i}
                  className="text-sm leading-snug [overflow-wrap:anywhere]"
                >
                  <span
                    className={`font-semibold ${
                      m.username === username
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {m.username}
                  </span>
                  <span className="text-muted-foreground">: </span>
                  <span>{m.text}</span>
                </div>
              ),
            )
          )}
        </div>
      </ScrollArea>

      {/* Composer as a flush bottom rail rather than a boxed field — the panel border is the
          only frame this needs, and it keeps the message list the visual focus. */}
      <div className="flex items-center gap-1 border-t border-border bg-background/60 px-2 py-1.5">
        <input
          value={draft}
          maxLength={500}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Press enter to send a message"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:text-primary"
          onClick={onSubmit}
          disabled={sending || !draft.trim()}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
