# 28. The Worker renders the quiz listing for crawlers; React takes over in the browser

Date: 2026-10-20
Status: Accepted

## Context

Search engines can't find any single quiz. The app is a single-page app: every URL answers the same
`index.html` with an empty `<div id="root">`, the catalogue is one URL, and `/quiz/:id/play` starts a
game ([`known-issues.md`](../deployment/known-issues.md), "No page per quiz for search engines").
The fix is a public page per Public quiz — the **quiz listing**, `/q/:id/:slug`
([`quiz-listing.md`](../quiz/quiz-listing.md)) — plus a sitemap.

A page only helps if what a crawler fetches *is* the page:

- **Google** renders JavaScript, but in a second, deferred pass, and judges a URL's status from the
  first response — an SPA answers 200 for an id that doesn't exist, which Google files as a soft 404.
- **Bing, DuckDuckGo, and every chat app** that builds a link card (WhatsApp, Discord, Slack, X,
  Facebook) read the HTML and never run the app.

So the listing needs, in the first response: the quiz's own `<head>` tags, real content in the body,
and a real status code (404 for a quiz that isn't public). The frontend is static assets on a
Cloudflare Worker; the API is a separate origin on a VPS. A Worker already rewrites `index.html`'s
`<head>` for shared links (`worker/index.js`, [`frontend-worker.md`](../deployment/frontend-worker.md)).

## Decision

**The Worker renders the listing; the SPA replaces it when it boots.**

For `/q/*` the Worker reads `GET /api/quiz/{id}/listing` (cached at the edge), then:

- fills `index.html`'s `<head>` — title, description, `og:*`, `twitter:*`, canonical — the way the
  share-preview path already does;
- writes real HTML into `#root`: the `<h1>`, the description, the facts, a plain `<a>` Play link;
- answers a real **404** (`noindex`) when the quiz isn't eligible, and a **301** when the slug is
  wrong;
- **fails open** when the API is slow or down: the plain SPA shell, `noindex`, never a broken page.

The SPA has a `/q/:id/:slug` route that reads the same endpoint and renders the styled page;
`createRoot` replaces the Worker's markup. **The two show the same content**, so a crawler and a
person see the same page — differently dressed, never different. That is what keeps it from being
cloaking, and it is a rule for every later change to either side.

Every value is escaped by `HTMLRewriter`'s `setAttribute`/`setInnerContent`, or by an explicit
escape for markup the Worker writes itself.

## Alternatives rejected

**Client-side only (set the tags from React, e.g. react-helmet).** Free to build, and Google would
eventually see the content. But chat apps and the other engines would see a blank page, every
missing id would be a 200 soft-404, and indexing would wait on Google's rendering queue. It fixes
the one reader that needed fixing least.

**The Worker fills the `<head>` only, like share previews.** Gets the cards and titles right, and is
the smallest change. But the body is still an empty `<div>` — to every engine but Google that is a
page with no content, which ranks as thin or not at all. The head is the easy half; the body is what
gets indexed.

**Prerender at build time (static HTML per quiz).** Fast and simple to serve, but quizzes are
created and edited all day and the frontend deploys only on a push to `main`. A new quiz would
have no page until the next deploy, a renamed one would keep its old title, and the build would
need the production API. Wrong lifetime for user-generated content.

**Server-side render the React app** (move to a framework such as Next/Remix, or run React's
server renderer in the Worker). The most faithful result — one rendering, no duplicated markup. It
also means moving the router, React Query's data loading and the bundle onto a server runtime, for
one public page. The cost is the whole frontend's architecture; the benefit is one page's markup
written once instead of twice. Revisit if public pages multiply.

**Serve the listing from the .NET API.** The API has the data, but it lives on another origin:
`oxygenquiz.com/q/*` would have to be routed through to the VPS, coupling a static site's pages to
the origin's uptime and moving them off the edge. And the backend would grow an HTML template
engine for a frontend page.

**Dynamic rendering — different HTML for crawler user-agents.** Google's old workaround, now
discouraged by Google itself. User-agent sniffing misses the crawlers nobody listed, and serving
crawlers something visitors never see is the definition of cloaking.

**A standalone HTML page with no React takeover.** The Worker's markup as the whole page. Simpler —
no SPA route — but a person following a shared link lands on a bare page that doesn't look or behave
like the app around it, and a second, unstyled UI for the same quiz drifts from the real one.

## Consequences

- **Every `/q/*` and `/sitemap.xml` request is a Worker invocation**, billed against the Workers
  quota, where static assets are free. The edge cache limits the *API* calls (5 minutes per listing,
  1 hour for the sitemap), not the invocations.
- **The listing's content exists in two places** — the Worker's HTML and the React page. They must
  stay the same facts; the Worker's builder is a pure module with its own unit tests, and a change to
  what the page shows changes both.
- **The Worker depends on the API at request time.** It fails open (SPA shell, `noindex`), so an API
  outage costs indexability for its duration, never availability.
- **Real status codes at the edge.** An ineligible id is a 404 indistinguishable from a missing one;
  a renamed quiz's old URL 301s to the new one with no redirect table, because the slug is computed,
  never stored.
- **All Worker reads reach the API from Cloudflare's egress**, so they likely land in one anonymous
  rate-limit partition (300 per 10 s — [`rate-limiting.md`](../development/rate-limiting.md)). The
  edge cache keeps that far out of reach at today's scale; check it when traffic grows.
- **The HTML response is never cached long**: it names the build's hashed files, like `index.html`.
