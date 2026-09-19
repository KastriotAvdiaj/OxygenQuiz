import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";
import { cn } from "@/utils/cn";

/**
 * A hairline of progress across the top of the shell while a route loader is running.
 *
 * It fills the one gap the loading screens cannot: React Router holds the *current* page on
 * screen, fully painted and fully frozen, for as long as the next route's `loader` takes.
 * Nothing moves, nothing is disabled, and a second click on the same card feels like the
 * first one missed. A loading screen can't cover that moment — the new route hasn't rendered
 * yet — so the only thing that can say "heard you" is a mark on the shell itself.
 *
 * Same appearance delay as `PageLoading`, for the same reason: a navigation that resolves in
 * 60ms should look instant, not like a bar flashed past.
 *
 * Deliberately NOT a percentage. There is no number to report — a loader promise has no
 * progress events — so the bar creeps toward 90% on a long transition and only reaches the
 * end when the navigation actually does. Inventing a percentage would be a lie that gets
 * caught every time the server is slow.
 *
 * The bar element stays mounted at zero width rather than unmounting between navigations.
 * A width transition needs a *previous* width to animate from; an element that mounts at 90%
 * is simply at 90%, and the creep never happens.
 */

/** Below this, a navigation reads as instant and the bar would only flicker. */
const APPEAR_AFTER_MS = 140;
/** How long the finished bar takes to reach the end and fade out. */
const FINISH_MS = 260;

type Phase = "idle" | "running" | "finishing";

const PHASE_CLASS: Record<Phase, string> = {
  // duration-0 so the retreat to zero is instant and invisible, ready for the next run.
  idle: "w-0 opacity-0 duration-0",
  // A long, decelerating creep: quick enough to register at once, slow enough that it can
  // never arrive on its own.
  running: "w-[90%] opacity-100 duration-[8000ms]",
  finishing: "w-full opacity-0 duration-[260ms]",
};

export const RouteProgressBar = () => {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [phase, setPhase] = useState<Phase>("idle");

  // Effect: timers, which is the outside system an Effect is for (CLAUDE.md). `busy` is the
  // only input — the phase follows its edges, so there is nothing to keep in sync.
  useEffect(() => {
    if (busy) {
      const start = window.setTimeout(
        () => setPhase("running"),
        APPEAR_AFTER_MS,
      );
      return () => window.clearTimeout(start);
    }

    // Idle again. A bar that never appeared has nothing to finish — go straight back, so a
    // fast navigation leaves no trace at all.
    setPhase((current) => (current === "running" ? "finishing" : "idle"));
    const done = window.setTimeout(() => setPhase("idle"), FINISH_MS);
    return () => window.clearTimeout(done);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
    >
      <div
        className={cn(
          "h-full rounded-r-full bg-primary transition-[width,opacity] ease-out",
          PHASE_CLASS[phase],
        )}
      />
    </div>
  );
};
