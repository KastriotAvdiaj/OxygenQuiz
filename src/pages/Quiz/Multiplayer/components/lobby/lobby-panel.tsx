import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface LobbyPanelProps {
  title: string;
  /** Optional control pinned to the right of the header bar (e.g. a share or leave button). */
  headerAction?: ReactNode;
  /** Classes for the outer <section> — grid placement lives here. */
  className?: string;
  /** Classes for the body. Pass `p-0` when the child manages its own padding (chat). */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * The lobby's single structural unit: a bordered box with a solid title bar and an inset body.
 * Every region of the lobby screen (players, room, chat, settings) is one of these, which is what
 * gives the page its "control panel" read instead of a stack of loose cards.
 *
 * The header is centered with the action absolutely positioned so the title stays optically
 * centered whether or not an action is present.
 */
export const LobbyPanel = ({
  title,
  headerAction,
  className,
  bodyClassName,
  children,
}: LobbyPanelProps) => (
  <section
    // min-h-0 as well as min-w-0: as a grid item the default `min-height: auto` floors the panel
    // at its content height, which defeats a `1fr` row and lets the board grow past the viewport.
    className={cn(
      "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
      className,
    )}
  >
    {/* Hairline on all four sides rather than a hand-picked shade: reads as a crisp edge under
        any header tint, in both themes, without needing to track --primary. The top/left/right
        runs sit directly inside the section's own border — at 10% alpha they just deepen that
        edge slightly rather than reading as a second line. */}
    <header className="relative flex items-center justify-center border border-black/10 bg-primary/10 px-9 py-1.5 dark:border-white/10 lg:py-2">
      <h2 className="truncate font-header text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground lg:text-sm">
        {title}
      </h2>
      {headerAction && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          {headerAction}
        </div>
      )}
    </header>

    {/* Light mode gets a flat --background body: the muted tint is a blue-grey that reads as a
        slightly dirty white next to the page. Dark mode keeps the tint, where it's what lifts the
        panel off the page at all. */}
    <div
      className={cn(
        "flex-1 bg-background p-2.5 dark:bg-muted/40 lg:p-4",
        bodyClassName,
      )}
    >
      {children}
    </div>
  </section>
);
