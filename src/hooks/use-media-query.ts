import { useEffect, useState } from "react";

/**
 * Whether a CSS media query matches, kept live as the window changes.
 *
 * For the rare case where a breakpoint changes *what is mounted*, not just how it looks — the
 * quiz builder swaps its whole interaction model at `lg` (docs/adr/0026-the-quiz-overview.md). Anything that is only
 * a matter of layout belongs in Tailwind's responsive classes instead: those cost nothing and
 * can't disagree with the stylesheet.
 *
 * Read synchronously in the initializer, so the first render already has the right answer and
 * the page never mounts one layout only to swap it for the other a frame later.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
};

/** Tailwind's `lg` — where the quiz builder has room for its three columns. */
export const DESKTOP_QUERY = "(min-width: 1024px)";
