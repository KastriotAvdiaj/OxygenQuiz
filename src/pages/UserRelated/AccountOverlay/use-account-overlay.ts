import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_SECTION,
  MENU_SECTION,
  OverlaySectionId,
  isOverlaySection,
} from "./overlay-sections";

/** The query key that drives the overlay, e.g. `/choose-quiz?settings=appearance`. */
export const SETTINGS_PARAM = "settings";

/** URL for opening the overlay on a given section, for use in `to=` props. */
export const accountOverlayHref = (
  section: OverlaySectionId | typeof MENU_SECTION = MENU_SECTION,
) => `?${SETTINGS_PARAM}=${section}`;

/**
 * Reads and writes the overlay's open/section state from the URL.
 *
 * **Why a search param rather than a `/settings/account` path.** The app uses a data
 * router (`createBrowserRouter`), where the matched route owns the whole screen — a
 * path-based modal route would unmount the page you opened it from, so there'd be
 * nothing behind the scrim. React Router's `backgroundLocation` trick needs
 * `<Routes>`-style rendering, which a data router doesn't do. A search param changes
 * the URL without changing the match, so the page underneath stays mounted and visible.
 *
 * Everything path routes would have given us still holds: the URL is shareable, the
 * back button closes the overlay (it's a real history entry), and because opening and
 * closing are navigations, the settings form's `useBlocker` unsaved-changes guard keeps
 * working untouched. `/settings/:section` still exists as a redirect for pretty links.
 */
export const useAccountOverlay = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Every write below works on a copy. The updater is handed the live `searchParams` object,
  // not a clone, and this hook reads `isOpen` from that same object — so editing it in place
  // changed what the overlay saw whether or not the navigation went through. When the
  // unsaved-changes guard blocked a close, the overlay shut anyway (taking the guard's own
  // dialog with it) while the URL still said open, and the dialog turned up on the next visit.

  const raw = searchParams.get(SETTINGS_PARAM);
  const isOpen = raw !== null;

  // An unrecognised value (typo, stale link) opens the menu rather than 404-ing or
  // rendering an empty pane.
  const section: OverlaySectionId | typeof MENU_SECTION = isOverlaySection(raw)
    ? raw
    : MENU_SECTION;

  /** The section a two-pane (desktop) layout should show — `menu` isn't a real panel. */
  const resolvedSection: OverlaySectionId =
    section === MENU_SECTION ? DEFAULT_SECTION : section;

  const open = useCallback(
    (next: OverlaySectionId | typeof MENU_SECTION = MENU_SECTION) => {
      setSearchParams(
        (params) => {
          const copy = new URLSearchParams(params);
          copy.set(SETTINGS_PARAM, next);
          return copy;
        },
        // push: opening is a history entry, so Back closes the overlay.
        { replace: false },
      );
    },
    [setSearchParams],
  );

  /** Switching sections replaces rather than pushes — Back should leave the overlay,
   *  not walk you backwards through every section you clicked. */
  const goToSection = useCallback(
    (next: OverlaySectionId | typeof MENU_SECTION) => {
      setSearchParams(
        (params) => {
          const copy = new URLSearchParams(params);
          copy.set(SETTINGS_PARAM, next);
          return copy;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const close = useCallback(() => {
    setSearchParams(
      (params) => {
        const copy = new URLSearchParams(params);
        copy.delete(SETTINGS_PARAM);
        return copy;
      },
      { replace: false },
    );
  }, [setSearchParams]);

  return { isOpen, section, resolvedSection, open, goToSection, close };
};
