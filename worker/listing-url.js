// @ts-check
/**
 * A quiz listing's URL — `/q/:id/:slug` — in one place, imported by the Worker (redirects,
 * canonical, sitemap) and by the SPA (Copy link, the route's canonical check), so the two can never
 * disagree about where a quiz lives. Plain JS so the Worker runs it as-is; listing-url.d.ts types it
 * for the SPA. docs/quiz/quiz-listing.md, "The URL".
 */

/** The canonical origin: the apex. `www` 301s here through a Cloudflare rule. */
export const SITE_ORIGIN = "https://oxygenquiz.com";

/** `/q/:id`, `/q/:id/`, `/q/:id/:slug`, `/q/:id/:slug/`. Group 1 is the id, group 2 the slug (if any). */
export const LISTING_PATH = /^\/q\/(\d{1,9})(?:\/([^/]*))?\/?$/;

const MAX_SLUG = 60;

/**
 * The slug for a title: diacritics stripped (`ë → e`, `ç → c`), lowercased, every run of anything
 * else a single hyphen, at most 60 characters cut at a hyphen. Empty when nothing Latin is left
 * (a title in Cyrillic, or only symbols) — the URL is then just `/q/:id`.
 * @param {string} title
 */
export function slugify(title) {
  const slug = (title ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= MAX_SLUG) return slug;

  const cut = slug.slice(0, MAX_SLUG + 1);
  const lastHyphen = cut.lastIndexOf("-");
  // One word longer than the limit has no hyphen to cut at; cut it mid-word instead.
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : slug.slice(0, MAX_SLUG)).replace(/-+$/, "");
}

/**
 * The path of a quiz's listing: `/q/32/kerre-gjeneral-per-makina`, or `/q/7` with no slug.
 * @param {number} id
 * @param {string} title
 */
export function listingPath(id, title) {
  const slug = slugify(title);
  return slug ? `/q/${id}/${slug}` : `/q/${id}`;
}

/**
 * The absolute, canonical URL — what Copy link puts on the clipboard and `<link rel="canonical">` names.
 * @param {number} id
 * @param {string} title
 */
export function listingUrl(id, title) {
  return `${SITE_ORIGIN}${listingPath(id, title)}`;
}
