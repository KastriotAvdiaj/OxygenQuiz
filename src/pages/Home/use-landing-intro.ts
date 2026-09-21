import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const KEY = "oq:landing-intro-played";

/**
 * The entrance's timing, in seconds, in one place (docs/home/landing-page.md): the wave rises
 * in, the pitch follows. Everything moves at a **constant speed** (`linear`) — eased curves
 * read as the page speeding up or slowing down.
 */
export const INTRO = {
  ease: "linear",
  wave: { duration: 0.7 },
  text: { delay: 0.25, duration: 0.6 },
  /** Gap between successive pieces of the pitch rising in. */
  stagger: 0.1,
} as const;

/** Motion props for one piece of the entrance: fade + rise, or nothing once the intro is done. */
export function riseIn(intro: boolean, step: number, from = 16) {
  if (!intro) return {};
  return {
    initial: { opacity: 0, y: from },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: INTRO.text.duration,
      delay: INTRO.text.delay + step * INTRO.stagger,
      ease: INTRO.ease,
    },
  };
}

/** Motion props for the wave (and the copy masked to it): fade only — see Home.tsx. */
export function fadeIn(intro: boolean) {
  if (!intro) return {};
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: INTRO.wave.duration, ease: INTRO.ease },
  };
}

const readPlayed = () => {
  // try/catch: storage can be disabled (private mode, blocked site data) — then the intro just
  // plays every time, which is the harmless failure.
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Whether the landing page should play its entrance: only on the first visit to `/` in this
 * browser tab (sessionStorage clears when the tab closes), and never under
 * `prefers-reduced-motion`. Later visits render at rest, so a returning player clicking Home
 * isn't made to sit through it again. In development (`npm run dev`) it plays on every visit.
 *
 * Read once, in the state initializer — the answer must not flip mid-visit when the flag is
 * written. Writing the flag is the Effect: it synchronizes with browser storage.
 */
export function useLandingIntro(): boolean {
  const reduceMotion = useReducedMotion();
  const [firstVisit] = useState(() => !readPlayed());

  useEffect(() => {
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      /* see readPlayed */
    }
  }, []);

  // In development it always plays, so the entrance can be watched and tuned on every reload
  // (`import.meta.env.DEV` is false in production builds, so this line compiles away there).
  return (import.meta.env.DEV || firstVisit) && !reduceMotion;
}
