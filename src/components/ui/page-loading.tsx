import { useEffect, useState } from "react";
import { LoadingWave } from "@/components/ui/loading-wave";
import { cn } from "@/utils/cn";

/**
 * THE full-page wait. One component, one size, one position — used by the app shell's
 * Suspense boundary, the auth gate, and every route that has to hold the screen while it
 * resolves.
 *
 * It exists because the app used to hand a wait from one loader to another mid-flight:
 * starting a quiz ran the shell's `xl` wordmark, then a route wrapper's `lg` one with
 * `py-16`, then the page's own `lg` one centred differently — the same word jumping size
 * and position twice inside a second. Anything that fills the screen while waiting goes
 * through here now, so a handover is invisible by construction rather than by three call
 * sites happening to agree.
 *
 * ## The delay is the point
 *
 * A loader that appears instantly and vanishes 80ms later reads as a flicker, not as
 * progress — that is the "jump" in a fast navigation. So nothing paints for
 * `APPEAR_AFTER_MS`: a wait short enough not to notice shows no loader at all, and a real
 * wait fades one in. The element is mounted the whole time at `opacity-0`, so the fade
 * costs no layout shift when it arrives.
 *
 * Deliberately not a spinner-with-a-delay-prop: the delay is not a per-call-site decision.
 */

/** How long a wait has to last before showing it is worth more than the flicker costs. */
const APPEAR_AFTER_MS = 140;

export type PageLoadingProps = {
  /** Word to wave. Short and uppercase — `LoadingWave` animates one letter at a time. */
  text?: string;
  /** What a screen reader announces. Say which wait this is; the word on screen doesn't. */
  label?: string;
  /**
   * `true` for a boundary that owns the whole viewport (the app shell, before any layout
   * has mounted). `false` — the default — fills the layout's flex column instead, leaving
   * the header and background in place.
   */
  fullScreen?: boolean;
  className?: string;
};

export const PageLoading = ({
  text = "LOADING",
  label = "Loading",
  fullScreen = false,
  className,
}: PageLoadingProps) => {
  const [shown, setShown] = useState(false);

  // Effect: a timer is an outside system, which is what an Effect is for (CLAUDE.md).
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), APPEAR_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full items-center justify-center px-4",
        // app-shell-viewport, not h-screen: sizes to the real visible viewport on mobile
        // (docs/RESPONSIVE.md). Inside a layout the column already does that for us.
        fullScreen ? "app-shell-viewport bg-background" : "flex-1",
        className,
      )}
    >
      <span
        className={cn(
          "transition-opacity duration-200 ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
      >
        <LoadingWave text={text} size="xl" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
};
