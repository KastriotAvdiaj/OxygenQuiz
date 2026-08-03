import { useRef, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/utils/cn";

interface MobileChatDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Messages that arrived while the drawer was closed. 0 hides the badge. */
  unreadCount: number;
  children: ReactNode;
}

/**
 * Chat on phones: a floating button that opens the panel as a bottom drawer.
 *
 * Why chat and not one of the other panels — the lobby's 2×2 board collapses to a single stacked
 * column under `lg`, and chat is the tallest card in it. Pushing the roster, the room code and
 * the ready/start actions below the fold to make room for scrollback gets the priority backwards:
 * while you're waiting you want to see who's here and whether you can start. Chat is the one
 * thing you dip into, so it's the one thing that becomes a surface you open.
 *
 * A drawer rather than a full-screen route so the lobby stays visible behind it — a player who
 * opens chat should still notice the host picking a quiz or the match starting.
 *
 * Rendered `lg:hidden`; the desktop layout keeps chat as an always-open panel.
 */
export const MobileChatDrawer = ({
  isOpen,
  onOpenChange,
  unreadCount,
  children,
}: MobileChatDrawerProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
  <>
    <button
      type="button"
      onClick={() => onOpenChange(true)}
      aria-label={
        unreadCount > 0
          ? `Open chat, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
          : "Open chat"
      }
      className={cn(
        // Fixed, not absolute: it should stay put while the lobby column scrolls.
        "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full lg:hidden",
        // Clears the iOS home indicator / Android gesture bar (docs/RESPONSIVE.md).
        "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        "bg-primary text-white shadow-lg shadow-black/25",
        "transition-transform active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      <MessageCircle className="h-6 w-6" />

      {unreadCount > 0 && (
        <span
          // aria-hidden: the count is already in the button's accessible name above, and
          // announcing it twice is worse than not at all.
          aria-hidden
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center",
            "rounded-full border-2 border-background bg-destructive px-1",
            "text-xs font-bold leading-none text-white",
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>

    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent
        ref={contentRef}
        side="bottom"
        // Radix focuses the first focusable descendant when a dialog opens, which here is the
        // chat input — so opening chat raised the keyboard, and the keyboard ate most of a
        // 70dvh drawer before you had read a single message. Opening chat is "let me see what
        // was said", not "let me type"; typing is one deliberate tap away.
        //
        // Focus moves to the drawer itself rather than nowhere: Radix's Content carries
        // tabIndex={-1}, so this keeps the focus trap anchored inside the layer, keeps Escape
        // and Tab behaving, and keeps screen readers reading the drawer on open.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          contentRef.current?.focus();
        }}
        className={cn(
          "flex flex-col gap-0 rounded-t-2xl border-border bg-background p-0 lg:hidden",
          // Capped rather than full height: the strip of lobby left visible above is what tells
          // you this is an overlay you can dismiss, not a page you navigated to.
          "h-[70dvh] max-h-[70dvh]",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {/* Grab handle — the affordance that says "drag or tap away to dismiss". */}
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <DrawerTitle className="border-b border-border px-4 pb-2.5 text-center font-quiz text-base">
          Chat
        </DrawerTitle>

        {/* min-h-0 so the message list's own scroll region wins over this flex parent. */}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </DrawerContent>
    </Drawer>
  </>
  );
};
