import { useEffect, useState } from "react";

/**
 * Tracks the `prefers-reduced-motion` media query, and keeps tracking it — the OS setting
 * can change while the tab is open, so this listens rather than reading once.
 *
 * Starts `false` so the first paint matches the majority case; a reduced-motion user gets
 * one frame of "motion allowed" before the effect corrects it, which is a frame in which
 * nothing has started moving yet.
 */
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReduced(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
};
