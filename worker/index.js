// @ts-check
/**
 * The oxygenquiz.com Worker. Everything is served from the static build (`dist/`) exactly as
 * before — this script runs only for the routes listed in wrangler.jsonc `assets.run_worker_first`
 * (`/play/shared/*`, `/q/*`, `/sitemap.xml`), so every other request stays a free static-asset hit.
 *
 * Three jobs, all for readers that never run the SPA's JavaScript (crawlers, chat-app previewers):
 *
 * - **Shared links** (`/play/shared/:token`): fills index.html's preview tags with the quiz's own
 *   title, description and image, and marks the page `noindex` — a share link is an access grant to
 *   an Unlisted quiz and must never become a search result. robots.txt deliberately does NOT block
 *   the path: several preview crawlers (Twitterbot, Slackbot) obey robots.txt and would then show no
 *   preview at all; `noindex` stops indexing while still letting them fetch.
 * - **Quiz listings** (`/q/:id/:slug`): renders the public page for a Public quiz — head tags,
 *   canonical, and real HTML in #root that the SPA replaces when it boots — with a real 404 for an
 *   ineligible id and a 301 for a stale slug (ADR 0028, docs/quiz/quiz-listing.md).
 * - **`/sitemap.xml`**: every listing, built from the API.
 *
 * All of it fails open: if the API is slow or down, the page is served as the plain SPA shell (and a
 * listing is marked `noindex` for that response). Decoration must never delay or break a page.
 *
 * docs/deployment/frontend-worker.md
 */
import { SHARED_PATH, escapeAttribute, previewFor } from "./preview.js";
import { isIndexable, listingBody, resolveListing, sitemapXml } from "./listing.js";

/** How long a preview card is reused at the edge before the API is asked again. */
const CARD_TTL_SECONDS = 300;
/** Past this the page is served without a custom preview rather than keep a crawler waiting. */
const API_TIMEOUT_MS = 1500;
/** How long the sitemap's source list is reused at the edge. */
const SITEMAP_TTL_SECONDS = 3600;
/**
 * A page built here names the build's hashed /_app/ files, like index.html, so it must revalidate
 * on every load or a deploy wouldn't reach it. Only the API calls behind it are cached.
 */
const REVALIDATE = "public, max-age=0, must-revalidate";

/**
 * public/_headers, repeated. Cloudflare applies that file to responses it serves from assets, not
 * to a Response this script builds — so without these the one route the Worker handles would be
 * the one route missing them (verified with `wrangler dev`). Keep the two in step.
 */
const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch: (r: Request) => Promise<Response> }, API_ORIGIN: string }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/sitemap.xml") return sitemap(env.API_ORIGIN);
    if (url.pathname.startsWith("/q/")) return listingPage(request, url, env);

    const page = await env.ASSETS.fetch(request);
    const match = url.pathname.match(SHARED_PATH);
    if (!match || !(page.headers.get("content-type") ?? "").includes("text/html")) return page;

    const card = await fetchCard(env.API_ORIGIN, match[1]);
    const response = card ? rewrite(page, previewFor(card, request.url, env.API_ORIGIN)) : page;

    const headers = withSecurityHeaders(response.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, headers });
  },
};

/** A copy of `source` (or empty headers) with SECURITY_HEADERS set. */
function withSecurityHeaders(/** @type {HeadersInit=} */ source) {
  const headers = new Headers(source);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return headers;
}

// ── Quiz listings: /q/:id/:slug ─────────────────────────────────────────────────────────────

/**
 * @param {Request} request
 * @param {URL} url
 * @param {{ ASSETS: { fetch: (r: Request) => Promise<Response> }, API_ORIGIN: string }} env
 */
async function listingPage(request, url, env) {
  const resolution = await resolveListing(url.pathname, url.search, (id) => fetchListing(env.API_ORIGIN, id));

  if (resolution.kind === "redirect") {
    const headers = withSecurityHeaders({ Location: resolution.location, "Cache-Control": "public, max-age=300" });
    return new Response(null, { status: 301, headers });
  }

  // The SPA shell, asked for cleanly: the visitor's own conditional headers could earn a bodiless
  // 304, and there would be nothing to rewrite.
  const shell = await env.ASSETS.fetch(new Request(new URL("/", url), { method: "GET" }));

  /** @type {Response} */
  let response = shell;
  let status = 200;
  const indexable = isIndexable(resolution);
  if (resolution.kind === "page") {
    const { listing, canonical } = resolution;
    response = rewrite(shell, previewFor(listing, canonical, env.API_ORIGIN), {
      canonical,
      body: listingBody(listing),
    });
  } else if (resolution.kind === "notFound") {
    status = 404; // the SPA boots on its not-found screen; crawlers get a real 404
  }

  const headers = withSecurityHeaders(response.headers);
  headers.set("Cache-Control", REVALIDATE);
  headers.delete("ETag"); // the shell's ETag doesn't describe this page
  if (!indexable) headers.set("X-Robots-Tag", "noindex");
  return new Response(request.method === "HEAD" ? null : response.body, { status, headers });
}

/**
 * The API's answer for one listing: `{ status, listing }`, or null when it couldn't be asked
 * (timeout, network). Only 200 and 404 mean anything; resolveListing fails open on the rest.
 * @param {string} apiOrigin
 * @param {number} id
 */
async function fetchListing(apiOrigin, id) {
  try {
    const res = await fetch(`${apiOrigin}/api/quiz/${id}/listing`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      // 5 minutes per listing; a 404 for 1, so a quiz just made Public appears soon.
      cf: { cacheTtlByStatus: { "200-299": CARD_TTL_SECONDS, "404": 60, "500-599": 0 } },
    });
    return { status: res.status, listing: res.ok ? await res.json() : undefined };
  } catch {
    return null;
  }
}

// ── /sitemap.xml ─────────────────────────────────────────────────────────────────────────────

/**
 * Built from GET /api/quiz/listings. When the API can't answer, a 503 — never an empty sitemap,
 * which a crawler would read as "every page is gone".
 * @param {string} apiOrigin
 */
async function sitemap(apiOrigin) {
  try {
    const res = await fetch(`${apiOrigin}/api/quiz/listings`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS * 2),
      cf: { cacheTtlByStatus: { "200-299": SITEMAP_TTL_SECONDS, "400-599": 0 } },
    });
    if (!res.ok) throw new Error(`listings: ${res.status}`);
    const entries = await res.json();
    if (!Array.isArray(entries)) throw new Error("listings: not a list");

    const headers = withSecurityHeaders({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${SITEMAP_TTL_SECONDS}`,
    });
    return new Response(sitemapXml(entries), { status: 200, headers });
  } catch {
    const headers = withSecurityHeaders({ "Retry-After": "300", "Cache-Control": "no-store" });
    return new Response("Sitemap temporarily unavailable.", { status: 503, headers });
  }
}

// ── Shared links: /play/shared/:token ───────────────────────────────────────────────────────

/** The API's preview card, or null for any failure (unknown/Draft token, timeout, outage). */
async function fetchCard(apiOrigin, token) {
  try {
    const res = await fetch(`${apiOrigin}/api/quiz/shared/${encodeURIComponent(token)}/preview`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      // Cache at the edge: a link pasted into a busy group chat is fetched by many clients at once.
      // A dead link is remembered briefly too, so it can't be used to hammer the API.
      cf: { cacheTtlByStatus: { "200-299": CARD_TTL_SECONDS, "404": 60, "500-599": 0 } },
    });
    if (!res.ok) return null;
    const card = await res.json();
    return typeof card?.title === "string" ? card : null;
  } catch {
    return null;
  }
}

/**
 * Write a card into the tags index.html already carries (site-wide defaults). A listing also gets
 * its canonical link and its body in #root.
 * @param {Response} page
 * @param {ReturnType<typeof previewFor>} preview
 * @param {{ canonical: string, body: string }=} listing
 */
function rewrite(page, preview, listing) {
  const { description } = preview;
  const setContent = (/** @type {string} */ value) => ({
    element(/** @type {any} */ el) {
      el.setAttribute("content", value); // setAttribute escapes; no HTML injection from a title
    },
  });

  let head = `<meta property="og:url" content="${escapeAttribute(preview.url)}" />`;
  if (listing) head += `<link rel="canonical" href="${escapeAttribute(listing.canonical)}" />`;

  let rewriter = new HTMLRewriter()
    .on("title", { element: (el) => void el.setInnerContent(preview.title) })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(preview.ogTitle))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[name="twitter:title"]', setContent(preview.ogTitle))
    .on('meta[name="twitter:description"]', setContent(description))
    .on("head", { element: (el) => void el.append(head, { html: true }) });

  if (listing) {
    // listingBody escapes every value it writes (tested in worker/__tests__/listing.test.js).
    rewriter = rewriter.on("div#root", { element: (el) => void el.setInnerContent(listing.body, { html: true }) });
  }

  if (preview.image) {
    rewriter = rewriter
      .on('meta[property="og:image"]', setContent(preview.image))
      .on('meta[name="twitter:image"]', setContent(preview.image))
      // The default card's size no longer applies to the quiz's own picture.
      .on('meta[property="og:image:width"]', { element: (el) => void el.remove() })
      .on('meta[property="og:image:height"]', { element: (el) => void el.remove() });
  }
  return rewriter.transform(page);
}
