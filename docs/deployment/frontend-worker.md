# The frontend Worker — link previews, quiz listings, sitemap, headers, robots

How `oxygenquiz.com` is served **today**, beyond "Cloudflare serves `dist/`". The deploy itself
(push to `main` → Workers Builds → `wrangler deploy`) is in [`cheatsheet.md`](cheatsheet.md) and
[`frontend-deploy-explained.md`](frontend-deploy-explained.md).

## What runs where

| Request | Who answers | Cost |
|---|---|---|
| Any path **except** the three below | Cloudflare static assets, straight from `dist/` — the SPA shell for unknown routes (`not_found_handling: "single-page-application"`) | Free, not a Worker invocation |
| `/play/shared/*` | `worker/index.js` first (`assets.run_worker_first` in `wrangler.jsonc`) | One Worker request, plus one API call per 5 minutes per link (cached) |
| `/q/*` | `worker/index.js` — the quiz listing | One Worker request, plus one API call per 5 minutes per quiz (cached) |
| `/sitemap.xml` | `worker/index.js` | One Worker request, plus one API call an hour (cached) |

The script is opt-in per path. Adding a path to `run_worker_first` makes every request to it a
Worker request — keep the list to routes that need it.

## Link previews (`/play/shared/:token`)

Chat apps (WhatsApp, Discord, Slack, X, Facebook, iMessage) build a link's preview card from the
page's HTML `<meta>` tags and never run JavaScript, so a single-page app shows every link as the
same generic card. The Worker fixes that for shared links:

1. Serves `index.html` from assets, as for any route.
2. Calls `GET {API_ORIGIN}/api/quiz/shared/{token}/preview` — an anonymous endpoint returning only
   card fields (`SharedQuizPreviewDTO`: title, description, image, category, format, question
   count; no questions, owner or token). It 404s exactly where the link wouldn't work: unknown
   token, a Draft, a format in preview. Crawlers are never signed in, which is why this exists
   beside the `[Authorize]` resolver `GET shared/{token}`.
3. Rewrites the tags `index.html` already carries — `<title>`, `description`, `og:*`,
   `twitter:*` — with `HTMLRewriter`, and adds `og:url`. `setAttribute`/`setInnerContent` escape, so
   a quiz title can't inject HTML (tested with `"<script>` in a title under `wrangler dev`).
4. With no description, writes one from the facts: "6 questions · History. Play it on Oxygen Quiz."
   (`worker/preview.js`, unit-tested in `worker/__tests__/preview.test.js`).

**It fails open.** API slow (> 1.5 s), down, or 404 → the page is served unchanged with the
site-wide tags. A preview never delays or breaks the link.

**Cached at the edge.** A card is reused for 5 minutes (a 404 for 1), so a link pasted into a busy
chat doesn't fetch it once per client.

**Unlisted titles.** The card shows an Unlisted quiz's title to anyone holding the link — which
the start screen already does. The link is the grant ([`quiz-visibility.md`](../quiz/quiz-visibility.md)).

### Shared links stay out of search

The Worker sets `X-Robots-Tag: noindex, nofollow` on every `/play/shared/*` response. A share link
is an access grant to an Unlisted quiz and must never become a search result.

`robots.txt` deliberately does **not** list `/play/shared/`: Twitterbot and Slackbot obey
`robots.txt`, and a disallowed URL gets no preview at all. `noindex` lets them fetch but tells search
engines not to index.

## Quiz listings (`/q/:id/:slug`)

The public page for each Public quiz — indexable when the quiz is picked, `noindex` otherwise. The full behaviour is
[`quiz-listing.md`](../quiz/quiz-listing.md) and the decision
[ADR 0028](../adr/0028-the-worker-renders-the-quiz-listing-for-crawlers.md); in short, the Worker:

1. reads `GET {API_ORIGIN}/api/quiz/{id}/listing` (edge-cached 5 minutes, a 404 for 1);
2. answers **404** + `X-Robots-Tag: noindex` (the SPA shell, which boots on its not-found screen) for
   an ineligible id — Draft, Unlisted, held, deleted, preview format, unknown, all alike;
3. answers **301** to `https://oxygenquiz.com/q/:id/:slug` for a wrong, old or missing slug;
4. otherwise rewrites the shell: the same head tags as a shared link plus
   `<link rel="canonical">`, and real HTML in `#root` (`<h1>`, description, facts, a plain Play link)
   that the SPA's `/q/:quizId/:slug?` route replaces when it boots — the same facts either way —
   and `X-Robots-Tag: noindex` unless the listing says `isPicked` (community quizzes aren't
   submitted to search; [`moderation.md`](../media/moderation.md) §5);
5. **fails open** past 1.5 s or on any other status: the plain shell, 200, `noindex`.

The pure part — slug, path resolution, the `#root` HTML, escaping — is `worker/listing.js` and
`worker/listing-url.js`, tested in `worker/__tests__/listing.test.js`. A page built here is
`Cache-Control: public, max-age=0, must-revalidate`, like `index.html`: it names the build's hashed
files, so a deploy must reach it. Only the API call behind it is cached.

## Sitemap (`/sitemap.xml`)

Built from `GET {API_ORIGIN}/api/quiz/listings` (edge-cached an hour): `/`, `/choose-quiz`, and one
listing URL per picked quiz with `<lastmod>` from `Quiz.UpdatedAt`. If the API can't answer it is a **503**
with `Retry-After`, never an empty sitemap. One file holds 50,000 URLs; see
[`quiz-listing.md`](../quiz/quiz-listing.md), "Sitemap", for when to switch to an index.

## Site-wide tags (`index.html`)

Every page carries a `description`, Open Graph and Twitter-card tags pointing at
`/og-image.png` — so even a link to the home page or the catalogue previews as Oxygen Quiz, not as a
blank card. The Worker rewrites these same tags; keep their `name`/`property` attributes unchanged.

`public/og-image.png` (1200×630, the O₂ mark on the primary blue) is generated by
`scripts/generate-og-image.py`. Re-run it only if the brand changes. It is drawn rather than a
photo on purpose: `public/assets/oxygenquiz*.jp*g` show a TV studio and real people.

## Headers (`public/_headers`)

Applied by Cloudflare to everything served from assets:

| Header | Why |
|---|---|
| `Strict-Transport-Security: max-age=31536000` | After one visit the browser never tries plain HTTP. No `includeSubDomains`/`preload` yet — both are hard to undo. |
| `X-Content-Type-Options: nosniff` | No MIME sniffing. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Other sites see the origin, not the path (a share link is a path). |
| `X-Frame-Options: SAMEORIGIN` | No framing by other sites. Not `DENY`: auth libraries can frame the app's own origin. |
| `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` | Nothing uses them. |

**`_headers` does not reach responses the Worker builds**, so `worker/index.js` sets the same set
(`SECURITY_HEADERS`). Change both together.

### Caching

| Path | `Cache-Control` | Why |
|---|---|---|
| `/_app/*` — Vite's build output (`build.assetsDir` in `vite.config.ts`) | `public, max-age=31536000, immutable` | Every file is named by its content hash, so a changed file is a new URL. Browsers keep these for a year and never ask again. |
| `index.html`, every SPA route, `/assets/*` (`public/assets/`, unhashed images) | Cloudflare's default, `public, max-age=0, must-revalidate` + ETag | Revalidated on every load. `index.html` is how a deploy reaches a browser — it names the new `/_app/` files. An image replaced under the same name shows up on the next load. |

The build has its own folder because Vite's default, `assets/`, is also where `public/assets/` lands:
an `immutable` rule there would freeze a replaced image for a year. Only hashed files may ever go in
`_app/`, and nothing in `public/` may be named `_app/` — `src/lib/__tests__/build-cache.test.ts`
asserts both, and that the rule names exactly that folder. The local Docker image
(`docker/nginx-spa.conf`) has the same rule.

**A missing `/_app/` file is answered with `index.html`, immutable.** With `run_worker_first` set as
a path list, Cloudflare's single-page fallback answers *every* unknown path with `index.html` and a
200 — a script request included — and `_headers` still applies the `/_app/*` rule to it (checked
with `wrangler dev`). A tab left open across a deploy asks for chunk names the new version no longer
has; it gets HTML, the import fails, and the route error screen shows `StaleVersionNotice`. The
browser now holds HTML under that chunk's URL for a year, which is harmless while the name stays dead
— hashes don't come back. It stops being harmless only if an older version containing that exact
file is promoted again (a rollback): that browser keeps loading HTML for it until its cache is
cleared. Accepted — see known-issues. Answering misses with a 404 instead would mean adding `/_app/*`
to `run_worker_first`, a billed Worker request for every file of every page load.

## robots.txt

Keeps crawlers out of `/dashboard`, `/my-dashboard`, `/settings`, the play and results routes
(`/quiz/`, `/associations/`), `/multiplayer` and `/screen` — pages that are personal, need a login,
or are mid-game. The home page, the catalogue and the quiz listings (`/q/`) stay crawlable, and the
file names the sitemap (`Sitemap: https://oxygenquiz.com/sitemap.xml`). A listing's Play link goes
to `/quiz/` or `/associations/`, so crawlers don't follow it into a game.

## Testing it locally

```bash
npm run build
npx wrangler dev --var API_ORIGIN:https://api.oxygenquiz.com   # or a local mock
curl -s http://localhost:8787/play/shared/<token> | grep -E "<title>|og:"
curl -sI http://localhost:8787/play/shared/<token> | grep -i x-robots
curl -s  http://localhost:8787/q/<id> -o /dev/null -w "%{http_code} %{redirect_url}\n"   # 301 to the slug
curl -s  http://localhost:8787/sitemap.xml
```

A real token comes from **Copy share link** on one of your quizzes. In production, paste the link
into https://www.opengraph.xyz or a Discord message to see the card.
