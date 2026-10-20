// @ts-check
/**
 * The oxygenquiz.com Worker. Everything is served from the static build (`dist/`) exactly as
 * before — this script runs only for the routes listed in wrangler.jsonc `assets.run_worker_first`
 * (today: `/play/shared/*`), so every other request stays a free static-asset hit.
 *
 * For a shared link it fills index.html's preview tags with the quiz's own title, description and
 * image, because chat apps (WhatsApp, Discord, Slack, X, Facebook) read those from the HTML and
 * never run the SPA's JavaScript. It also marks the page `noindex`: a share link is an access grant
 * to an Unlisted quiz and must never become a search result. robots.txt deliberately does NOT block
 * the path — several preview crawlers (Twitterbot, Slackbot) obey robots.txt and would then show no
 * preview at all; `noindex` stops indexing while still letting them fetch.
 *
 * Fails open: if the API is slow, down, or says the link is dead, the page is served unchanged
 * with the site-wide tags. A preview is decoration; it must never delay or break the link.
 *
 * docs/deployment/frontend-worker.md
 */
import { SHARED_PATH, escapeAttribute, previewFor } from "./preview.js";

/** How long a preview card is reused at the edge before the API is asked again. */
const CARD_TTL_SECONDS = 300;
/** Past this the page is served without a custom preview rather than keep a crawler waiting. */
const API_TIMEOUT_MS = 1500;

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
    const page = await env.ASSETS.fetch(request);
    const match = new URL(request.url).pathname.match(SHARED_PATH);
    if (!match || !(page.headers.get("content-type") ?? "").includes("text/html")) return page;

    const card = await fetchCard(env.API_ORIGIN, match[1]);
    const response = card ? rewrite(page, previewFor(card, request.url, env.API_ORIGIN)) : page;

    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, headers });
  },
};

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

/** Write the card into the tags index.html already carries (site-wide defaults). */
function rewrite(page, preview) {
  const setContent = (value) => ({
    element(/** @type {any} */ el) {
      el.setAttribute("content", value); // setAttribute escapes; no HTML injection from a title
    },
  });

  let rewriter = new HTMLRewriter()
    .on("title", { element: (el) => void el.setInnerContent(preview.title) })
    .on('meta[name="description"]', setContent(preview.description))
    .on('meta[property="og:title"]', setContent(preview.ogTitle))
    .on('meta[property="og:description"]', setContent(preview.description))
    .on('meta[name="twitter:title"]', setContent(preview.ogTitle))
    .on('meta[name="twitter:description"]', setContent(preview.description))
    .on("head", {
      element: (el) =>
        void el.append(`<meta property="og:url" content="${escapeAttribute(preview.url)}" />`, {
          html: true,
        }),
    });

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
