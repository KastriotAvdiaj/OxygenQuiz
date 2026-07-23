/**
 * App-shell scroll helpers — see docs/RESPONSIVE.md ("Scrolling model").
 *
 * The window never scrolls in this app (html/body are `overflow: hidden`);
 * every route scrolls inside the layout's `.app-shell-viewport` container.
 * That means `window.scrollTo(...)` and `window.scrollY` are silent no-ops.
 * Any code that needs to scroll the page (pagination, "back to top", the
 * header's hide-on-scroll) must go through these helpers instead.
 */

/** Set by the layouts on their scroll container. Exactly one exists per route. */
export const APP_SCROLL_CONTAINER_ID = "app-scroll-container";

/** The element that actually scrolls for the current route, if mounted. */
export function getAppScrollContainer(): HTMLElement | null {
  return document.getElementById(APP_SCROLL_CONTAINER_ID);
}

/** Scroll the current route back to the top (e.g. after a page change). */
export function scrollAppToTop(behavior: ScrollBehavior = "auto"): void {
  getAppScrollContainer()?.scrollTo({ top: 0, behavior });
}
