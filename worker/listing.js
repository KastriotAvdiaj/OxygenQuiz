// @ts-check
/**
 * The quiz listing (`/q/:id/:slug`) and `/sitemap.xml`, as pure functions so they are unit-tested
 * without a Worker runtime (worker/__tests__/listing.test.js). worker/index.js does the I/O: it
 * fetches from the API, then writes these into index.html with HTMLRewriter.
 *
 * The HTML written into #root here is what search engines and link-less readers see; the SPA's
 * `/q/:id/:slug` route replaces it on boot with the styled page. **The two must say the same
 * things** — that is what keeps this from being cloaking. A change to what the page shows changes
 * both. docs/quiz/quiz-listing.md, ADR 0028.
 */
import { SITE_ORIGIN, LISTING_PATH, listingPath, listingUrl } from "./listing-url.js";
import { describe } from "./preview.js";

/**
 * The API's QuizListingDTO (camelCase JSON). It has no status, share token, owner id or questions —
 * nothing the page must never show is even in hand here.
 * @typedef {{ id: number, title: string, description?: string | null, category: string,
 *   colorPaletteJson?: string | null, gradient?: boolean, difficulty: string, language: string,
 *   questionCount: number, timeLimitInSeconds: number, author: string, imageUrl?: string | null,
 *   format: string, createdAt: string, updatedAt: string }} Listing
 */

/**
 * @typedef {{ kind: "page", listing: Listing, canonical: string }
 *   | { kind: "redirect", location: string }
 *   | { kind: "notFound" }
 *   | { kind: "failOpen" }} Resolution
 */

/**
 * What to answer for a `/q/*` path, given a way to ask the API. `fetchListing` resolves to
 * `{ status, listing? }`, or null when the API couldn't be asked (timeout, network).
 *
 * - not a listing path, or the API says 404 → **notFound** (a real 404, `noindex`). An ineligible
 *   id is never redirected first: the 404 must not depend on the slug.
 * - 200 with a slug other than the current one (old, missing, trailing slash) → **redirect** (301),
 *   query string kept. The slug is computed from the title, so a rename needs no redirect table.
 * - 200 with the current slug → **page**.
 * - anything else → **failOpen**: the plain SPA shell, `noindex`, never a broken page.
 *
 * @param {string} pathname
 * @param {string} search  the request's query string, `""` or `?…`
 * @param {(id: number) => Promise<{ status: number, listing?: Listing } | null>} fetchListing
 * @returns {Promise<Resolution>}
 */
export async function resolveListing(pathname, search, fetchListing) {
  const match = pathname.match(LISTING_PATH);
  if (!match) return { kind: "notFound" };

  const answer = await fetchListing(Number(match[1]));
  if (answer?.status === 404) return { kind: "notFound" };
  if (answer?.status !== 200 || !answer.listing || typeof answer.listing.title !== "string") {
    return { kind: "failOpen" };
  }

  const { listing } = answer;
  const canonicalPath = listingPath(listing.id, listing.title);
  if (pathname !== canonicalPath) {
    return { kind: "redirect", location: `${SITE_ORIGIN}${canonicalPath}${search}` };
  }
  return { kind: "page", listing, canonical: listingUrl(listing.id, listing.title) };
}

/**
 * Where Play goes — each format's own play screen. Mirrors `quizPlayPath`
 * (src/pages/Quiz/quiz-play-path.ts); robots.txt disallows both, so crawlers don't follow it.
 * @param {{ id: number, format?: string }} quiz
 */
/**
 * May search engines index this resolution? Only a listing page of a **picked** quiz — the main
 * catalogue. A community quiz still gets its page (links and previews work) but is served
 * `noindex`, the same rule that keeps it out of the sitemap (docs/media/moderation.md, "Picked
 * and community quizzes"). An API that predates the flag sends none, which reads as not picked.
 *
 * @param {{ kind: string, listing?: { isPicked?: boolean } }} resolution
 */
export function isIndexable(resolution) {
  return resolution.kind === "page" && resolution.listing?.isPicked === true;
}

export function playPath(quiz) {
  return quiz.format === "Associations" ? `/associations/${quiz.id}/play` : `/quiz/${quiz.id}/play`;
}

/**
 * The page's description: the author's, or one written from the facts — the same sentence a
 * shared link's card uses.
 * @param {Listing} listing
 */
export function describeListing(listing) {
  return describe(listing);
}

/**
 * The real HTML written into `#root` for crawlers and for the moment before the SPA boots: the
 * `<h1>`, the description, the facts and a plain Play link. Every value from the quiz is escaped.
 * @param {Listing} listing
 */
export function listingBody(listing) {
  const isBoard = listing.format === "Associations";
  /** @type {[string, string][]} */
  const facts = [
    ["Category", listing.category],
    ["Difficulty", listing.difficulty],
    ["Language", listing.language],
  ];
  if (!isBoard) {
    facts.push(["Questions", listing.questionCount === 1 ? "1 question" : `${listing.questionCount} questions`]);
  }
  if (listing.timeLimitInSeconds > 0) facts.push(["Duration", formatDuration(listing.timeLimitInSeconds)]);
  facts.push(["Format", isBoard ? "Associations board" : "Classic"]);
  facts.push(["By", listing.author]);
  const created = formatDate(listing.createdAt);
  if (created) facts.push(["Created", created]);

  const rows = facts
    .filter(([, value]) => value)
    .map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");

  return (
    `<main><article>` +
    `<h1>${escapeHtml(listing.title)}</h1>` +
    `<p>${escapeHtml(describeListing(listing))}</p>` +
    `<dl>${rows}</dl>` +
    `<p><a href="${escapeHtml(playPath(listing))}">Play</a></p>` +
    `</article></main>`
  );
}

/**
 * `/sitemap.xml`: the home page, the catalogue, and one listing per quiz with its `<lastmod>`.
 * One file holds 50,000 URLs (or 50 MB); past ~40,000 quizzes this becomes a sitemap index —
 * docs/quiz/quiz-listing.md, "Sitemap".
 * @param {{ id: number, title: string, updatedAt: string }[]} entries  GET /api/quiz/listings
 */
export function sitemapXml(entries) {
  const url = (/** @type {string} */ loc, /** @type {string=} */ lastmod) =>
    `<url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;

  const urls = [
    url(`${SITE_ORIGIN}/`),
    url(`${SITE_ORIGIN}/choose-quiz`),
    ...entries.map((e) => url(listingUrl(e.id, e.title), w3cDate(e.updatedAt))),
  ];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`
  );
}

/**
 * A W3C datetime in UTC, to the second. A timestamp with no zone is UTC — the API stores UTC, and
 * reading it as local time would shift every lastmod by the server's offset.
 * @param {string} value
 */
function w3cDate(value) {
  const zoned = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(zoned);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** "8m 10s" / "20s" — the catalogue's format (src/pages/Quiz/components/quiz-duration.ts). */
function formatDuration(/** @type {number} */ seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes > 0 ? `${minutes}m ` : ""}${seconds % 60}s`;
}

/** "Sep 1, 2026", as the start modal shows it. */
function formatDate(/** @type {string} */ value) {
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value ?? "") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Text and attribute values we write as markup ourselves (HTMLRewriter's setters escape their own). */
export function escapeHtml(/** @type {string} */ value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
