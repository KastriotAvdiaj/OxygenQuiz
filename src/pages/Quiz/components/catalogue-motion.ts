import type { Transition } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * The quiz catalogue's entrance (`/choose-quiz`) — docs/development/motion.md, "Page entrances".
 *
 * The page arrives with its data already cached (the route loader prefetches it), so nothing
 * here waits for anything: the animation starts on the first frame and is the page *arriving*,
 * not a curtain over a load. The old one faded the whole grid in and then staggered the cards
 * 50ms apart in DOM order, which took ~850ms and read as lag.
 *
 * Three beats, overlapping:
 *  1. The controls (catalogue switch, search, sort) rise into place — `controlsEntrance`.
 *  2. The filter sidebar slides in from the left edge it is anchored to — `sidebarEntrance`.
 *  3. The cards sweep in as a diagonal wave from the top-left: a card's delay is its row plus
 *     its column, so each diagonal of the grid lands together and the wave travels the way the
 *     eye reads. On a 4-column page of 12 that is 6 diagonals instead of 12 steps, which is what
 *     makes it fast: the first card is settled by ~340ms and the last by ~520ms, wherever the
 *     grid wraps. A card rises, grows from 96% and fades in on a soft ease-out, so it settles
 *     rather than stops.
 *
 * Reduced motion: the cards and controls arrive with a short fade only, all at once.
 */

/** A strong ease-out (easeOutQuint): fast off the mark, long gentle landing. */
const LAND = [0.22, 1, 0.36, 1] as const;

const CARD_DURATION = 0.3;
const DIAGONAL_STEP = 0.035;
/** Phones show one column — a 12-row "wave" would make the last card wait. Cap the steps. */
const MAX_DIAGONALS = 6;
/** Lets the controls lead by a beat, so the eye lands on the page before the cards. */
const CARD_LEAD_IN = 0.04;

const FADE_ONLY: Transition = { duration: 0.15, ease: "easeOut" };

/**
 * Columns of the grid at the current width. Mirrors the grid's classes in `Quiz-Selection.tsx`
 * (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`) — change both together.
 */
export const useCatalogueColumns = (): number => {
  const sm = useMediaQuery("(min-width: 640px)");
  const xl = useMediaQuery("(min-width: 1280px)");
  const xxl = useMediaQuery("(min-width: 1536px)");
  return xxl ? 4 : xl ? 3 : sm ? 2 : 1;
};

export const cardEntrance = (index: number, columns: number, reduceMotion: boolean) => {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: FADE_ONLY,
    };
  }
  const diagonal = Math.min(Math.floor(index / columns) + (index % columns), MAX_DIAGONALS);
  return {
    initial: { opacity: 0, y: 18, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: CARD_DURATION,
      ease: LAND,
      delay: CARD_LEAD_IN + diagonal * DIAGONAL_STEP,
    } satisfies Transition,
  };
};

export const controlsEntrance = (reduceMotion: boolean) =>
  reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: FADE_ONLY }
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: LAND } satisfies Transition,
      };

export const sidebarEntrance = (reduceMotion: boolean) =>
  reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: FADE_ONLY }
    : {
        initial: { opacity: 0, x: -16 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.32, ease: LAND, delay: 0.02 } satisfies Transition,
      };
