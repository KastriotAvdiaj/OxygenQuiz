import { useReducedMotion } from "framer-motion";

/**
 * The entrance's timing, in seconds, in one place (docs/home/landing-page.md): the pitch rises
 * in line by line. Everything moves at a **constant speed** (`linear`) — eased curves read as
 * the page speeding up or slowing down.
 */
export const INTRO = {
  ease: "linear",
  text: { delay: 0.25, duration: 0.6 },
  /** Gap between successive pieces of the pitch rising in. */
  stagger: 0.1,
} as const;

/**
 * When the last piece of the pitch (the actions, step 2) has finished rising in, in seconds from
 * mount. The background globe waits for this before it appears.
 */
export const PITCH_SETTLED_SECONDS = INTRO.text.delay + 2 * INTRO.stagger + INTRO.text.duration;

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

/**
 * Whether the landing page should play its entrance: on **every** visit to `/`, except under
 * `prefers-reduced-motion` (on Windows, "Animation effects" off in Settings sets it).
 *
 * It used to play only once per browser tab (a `sessionStorage` flag), so on the live site a
 * reload or a click on Home showed a page at rest, and the entrance looked missing. The whole
 * thing is under a second, so it isn't worth hiding.
 */
export function useLandingIntro(): boolean {
  return !useReducedMotion();
}
