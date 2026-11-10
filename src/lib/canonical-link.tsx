import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * The page's own clean address as `<link rel="canonical">`: origin + path, with no query string
 * and no trailing slash. Every SPA route is served the same `index.html`, so without it Google
 * sees `/`, `/?ref=x`, `/choose-quiz/` and the rest as unlabelled duplicates ("Duplicate without
 * user-selected canonical" in Search Console, 2026-11-09). Google reads it from the rendered page.
 *
 * A quiz listing (`/q/:id/:slug`) already has its canonical in the HTML the Worker serves; this
 * writes the same value once the page has redirected to its canonical path.
 * See docs/deployment/search-visibility.md.
 */
export function canonicalHref(origin: string, pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  return `${origin}${path || "/"}`;
}

/** Keeps the document's canonical link in step with the route — the DOM is the outside system. */
export const CanonicalLink = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalHref(window.location.origin, pathname);
  }, [pathname]);

  return null;
};
