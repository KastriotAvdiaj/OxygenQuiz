# The quiz listing — one public page per quiz, for search and shared links

> **Status: built 2026-10-20.** The rendering decision is
> [ADR 0028](../adr/0028-the-worker-renders-the-quiz-listing-for-crawlers.md); the Worker side is
> also in [`frontend-worker.md`](../deployment/frontend-worker.md).

A **quiz listing** is a public page for one quiz at `/q/:id/:slug` — title, description, the
facts, and a Play button. It exists for two readers that the rest of the app can't serve:

- **search engines**, which need a URL per quiz with real content in the HTML (the catalogue is
  one URL, and `/quiz/:id/play` starts a game);
- **people a Public quiz is shared with**, who should land on a page about the quiz, not in the
  middle of one.

It is not a new way to browse. Clicking a card in the catalogue still opens the start modal, as
today ([`quiz-card.md`](quiz-card.md)); nothing in the app navigates to a listing except a copied
link. Not to be confused with the **single-quiz page** — the owner's and admins' page at
`/my-dashboard/quiz/:id` and `/dashboard/quiz/:id` ([`glossary.md`](glossary.md)).

## Which quizzes have one

**Exactly the catalogue's quizzes:** `Status == Public`, not held by a moderator
([`../media/moderation.md`](../media/moderation.md)), **and** a released format —
`QuizFormatAccess.IsAvailableTo(format, canSeePreview: false)`, the rule for an anonymous caller.
Associations is a preview format today, so no board has a listing; releasing the format
(removing it from `PreviewFormats`) gives every Public board one with no further change.

**Only picked quizzes are indexed.** A community quiz (not picked) has a page — links and previews
work — but the Worker serves it with `X-Robots-Tag: noindex` (`isIndexable` in `worker/listing.js`)
and the sitemap leaves it out: search engines judge a site by what it submits, and community quizzes
aren't reviewed. The listing carries `isPicked` for this.

**Everything else is the same 404**: Draft, Unlisted, held, soft-deleted, a preview format, and an id
that never existed all answer `404` with `noindex`, byte-for-byte alike. Ids are sequential, so a
404 that differed by cause would let anyone map which ids are Unlisted
([`quiz-visibility.md`](quiz-visibility.md), "Reading a quiz by id").

**Unlisted quizzes get nothing.** Their share link (`/play/shared/:token`) stays their only door,
and stays out of search ([`frontend-worker.md`](../deployment/frontend-worker.md)).

The rule is evaluated **as an anonymous caller, whoever asks** — an admin or a Teacher calling the
endpoint gets the same answer as a guest. The page is one cacheable document for everyone, so its
eligibility can't depend on who requested it.

There is no quality bar beyond the publication gate (a Public quiz already has a real category,
language and difficulty — [`quiz-visibility.md`](quiz-visibility.md), "Publishing requires a full
classification").

## The URL

```
https://oxygenquiz.com/q/32/kerre-gjeneral-per-makina
                          ^^ ^^^^^^^^^^^^^^^^^^^^^^^^^
                          id  slug — decoration, computed from the title
```

- **The id does the lookup.** The slug is never stored and never read: it is computed from the
  current title every time.
- **Slug:** Unicode-decompose and drop the combining marks (`ë → e`, `ç → c`), lowercase, every run
  of anything that isn't `a–z` or `0–9` becomes one hyphen, trim hyphens from both ends, then cut
  to about 60 characters at a hyphen boundary. A letter that doesn't decompose to ASCII (`ß`, `ł`,
  Cyrillic) counts as a separator. *Kërrë gjeneral për makina* → `kerre-gjeneral-per-makina`.
- **Nothing left** (a title of only symbols or a non-Latin script) → the URL is just `/q/:id`.
- **A wrong, old or missing slug gets a 301 to the current one**, from the Worker, keeping any
  query string. So renaming a quiz needs no redirect table: every old link still resolves through
  its id. `/q/32`, `/q/32/old-title` and `/q/32/kerre-gjeneral-per-makina/` all land on
  `/q/32/kerre-gjeneral-per-makina`. An ineligible id is a 404 whatever the slug — it is never
  redirected first.
- **Canonical** is always `https://oxygenquiz.com/q/:id/:slug` — the apex. `www` already 301s to the
  apex through a Cloudflare Redirect Rule ([`known-issues.md`](../deployment/known-issues.md)).

The slug is one JavaScript function, `worker/listing-url.js`, used by the Worker (redirects,
canonical, sitemap) and by the SPA through `src/lib/quiz-listing-url.ts` (Copy link, the route's own
canonical check), so the two can't disagree on a URL.

## What the page shows

| Shown | Detail |
|---|---|
| Title | The `<h1>` |
| Description | The author's. With none, generated from the facts, as share previews already do (`worker/preview.js`): "6 questions · History. Play it on Oxygen Quiz." |
| Category | With its palette, as on the card and the start modal |
| Difficulty, language | The lookup names |
| Question count | Classic only. A board shows "Associations board", never "0 questions" (`quizSizeLabel`) |
| Duration | `TimeLimitInSeconds`, formatted as the catalogue does (`secondsToMinutes`, "8m 10s"); omitted when 0, as on the card |
| Author | Username only, not a link |
| Image | The quiz's image, if any |
| Format | Classic / Associations |
| Created date | |
| **Play** | The one action — see below |

**Never shown, and never in the API response:** question text, answers or `isCorrect`, the share
token, the owner's id or email, the status. The DTO has no field for any of them, so a later
change to the page can't leak one by accident.

## Play

**The HTML is the same for every visitor** — no cookies are read, nothing is personalised — so it
can be cached. Only what happens *after* Play differs, and the play route already decides it:

- **A guest** goes to `/quiz/:id/play` and gets the one free guest attempt, or the login prompt
  once it is spent ([`../auth/guest-play.md`](../auth/guest-play.md)).
- **A signed-in user** starts directly.

In the Worker's HTML Play is a plain `<a href>`, so it works before (or without) the SPA. The target
is the format's play path (`quizPlayPath`): `/quiz/:id/play` for Classic, `/associations/:id/play`
for a board once the format is released. `robots.txt` already disallows both, so crawlers don't
follow Play into a game.

## How it is served

The full decision, and what it beat, is
[ADR 0028](../adr/0028-the-worker-renders-the-quiz-listing-for-crawlers.md). In short: **the Worker
renders the page; React takes over when it boots.**

1. A request to `/q/*` runs `worker/index.js` (it is in `run_worker_first`).
2. The Worker parses the id and asks the API for the listing:
   `GET {API_ORIGIN}/api/quiz/{id}/listing`, cached at the edge for 5 minutes (a 404 for 1, as
   share previews do).
3. **404** → `index.html` with status **404** and `X-Robots-Tag: noindex`. The SPA boots and shows
   its not-found screen.
4. **200, wrong slug** → **301** to the canonical URL (`Cache-Control: max-age=300`, so a browser
   doesn't hold a redirect past the next rename for long).
5. **200, right slug** → `index.html` rewritten with `HTMLRewriter`:
   - `<head>`: `<title>`, `description`, `og:*`, `twitter:*`, `og:url` and
     `<link rel="canonical">`, in the tags `index.html` already carries (as for share previews);
     the quiz's image replaces the default card image when it has one (absolute URL, through
     `API_ORIGIN` for `/uploads/...`).
   - `#root`: real HTML — the `<h1>`, the description, the facts, the Play link.
   Every value is escaped (`setAttribute` / `setInnerContent`, and `escapeAttribute` /
   `escapeHtml` for markup the Worker writes itself), so a title can't inject HTML. The shell is
   fetched from assets as a clean `GET /`, so a visitor's conditional headers can't earn a bodiless
   304 with nothing to rewrite.
6. The SPA boots, its `/q/:quizId/:slug?` route (`QuizListingPage`) reads the same listing endpoint
   through React Query and renders the styled page in place of the Worker's HTML (`createRoot`
   replaces the container's children). Same facts in both, which is why this isn't cloaking — and the
   description in both comes from one function (`describeListing`). The route also replaces a stale
   slug with the canonical one, for navigation inside the app and the dev server, which has no
   Worker; its 404 is the app's not-found screen.

**It fails open.** API slower than 1.5 s, down, or any status other than 200/404 → the plain SPA
shell, status 200, with `noindex`, not cached. A slow API never delays the page beyond that
timeout; it just isn't indexable on that request.

**Headers.** Every Worker-built response carries `SECURITY_HEADERS` (the `_headers` set, which
Cloudflare doesn't apply to Worker responses). The HTML is cached like `index.html` —
`max-age=0, must-revalidate` — because it names the build's hashed `/_app/` files, and a deploy
must reach it. Only the API call behind it is cached at the edge.

`<html lang>` stays `en`: the app is English, and a quiz's language is a lookup with no ISO code.
Setting it per quiz is deferred.

## The API

Two anonymous endpoints on `QuizController`, copying `GetSharedQuizPreview`: a slim DTO, no
`[Authorize]`, access checked in the endpoint (there is no visibility query filter on `Quiz` —
[ADR 0019](../adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md)).

| Endpoint | Returns | Notes |
|---|---|---|
| `GET /api/quiz/{id}/listing` | `QuizListingDTO` — the fields in "What the page shows", plus `updatedAt` | 404 on the eligibility rule above, for every reason alike |
| `GET /api/quiz/listings` | `[{ id, title, updatedAt }]` for every eligible **picked** quiz | The sitemap's source. Unpaged — see "Sitemap" for when that changes |

- **Not `GET /api/quiz/{id}`.** That shape serves the app: it carries `status`, `version` and the
  user object, and its access depends on the caller. The listing's must not.
- Both answer `Cache-Control: public, max-age=300`. They are safe to cache publicly because they
  ignore the caller entirely.
- Data access goes through `IQuizRepository`, as a SQL-translated projection (no `ToString()` on
  enums; the `FormatNames` ternary, as `ProjectSummary` does).
- `{id}` and `listings` don't collide: a literal route segment outranks a parameter.

## Sitemap

`/sitemap.xml` is served by the Worker, built from `GET /api/quiz/listings` and cached at the edge
for an hour:

- `https://oxygenquiz.com/` and `https://oxygenquiz.com/choose-quiz`;
- one `https://oxygenquiz.com/q/:id/:slug` per eligible picked quiz, with `<lastmod>` from `UpdatedAt`.

Slugs are `a–z0–9-` by construction, but URLs are XML-escaped anyway. If the API is unreachable the
Worker answers 503 rather than an empty sitemap, which a crawler would read as "every page is gone".

**One file holds 50,000 URLs (or 50 MB).** There are 12 Public quizzes today. Past roughly 40,000,
switch to a sitemap index (`/sitemap.xml` listing `/sitemap-1.xml`, …) and page
`GET /api/quiz/listings` — the place to change is the Worker's sitemap builder.

`robots.txt` gains `Sitemap: https://oxygenquiz.com/sitemap.xml`. `/q/` is not disallowed.

## `Quiz.UpdatedAt`

A new non-null column, existing rows backfilled from `CreatedAt`. It is what `<lastmod>` reports,
so it moves whenever what a listing shows — or what the quiz plays — changes:

| Bumped by | Where |
|---|---|
| Quiz update | `QuizService.UpdateQuizAsync` |
| Status change | `QuizService.SetQuizStatusAsync` |
| Associations board save | `AssociationBoardService` |
| An edit to any question that is live in the quiz — from the quiz builder **or the question bank** | `QuestionService`'s three `Update…QuestionAsync` methods: one `UPDATE` over every quiz with a live `QuizQuestion` row for that question (`RemovedInVersion IS NULL`), whoever owns those quizzes |

Not bumped by a change to a lookup (renaming a category) or to the author's username: those change
what many listings show, not the quiz itself, and a stale `<lastmod>` only delays a recrawl.

## Copy link

One hook, `useCopyQuizLink`, picks the link by status:

- **Public quiz:** *Copy link* in the quiz row's ⋯ menu and the single-quiz page's ⋯ menu copies the
  listing URL (`https://oxygenquiz.com/q/:id/:slug`) — built in the browser, no API call. A Public
  quiz's link is public, so the row menu offers it on anyone's Public quiz, not only the viewer's.
- **Unlisted quiz:** *Copy share link* copies the share link, minting the token as before — owner
  only.
- **The start modal** gains a *Copy link* button for Public quizzes only — a muted secondary
  `LiftedButton` with a link icon, after *Start Quiz*. The modal also opens for an Unlisted quiz
  reached through a share link (`/choose-quiz?shared=…`); it has no Copy link there.

## Files

| File | Role |
|---|---|
| `worker/listing-url.js` (+ `.d.ts`) | The slug and the URL — shared with the SPA |
| `worker/listing.js` (+ `.d.ts`) | Pure: resolving a path to page / 301 / 404 / fail-open, the `#root` HTML, the sitemap XML |
| `worker/index.js` | The I/O: API calls with edge caching, `HTMLRewriter`, headers |
| `wrangler.jsonc` | `run_worker_first: ["/play/shared/*", "/q/*", "/sitemap.xml"]` |
| `public/robots.txt` | The `Sitemap:` line |
| `QuizController.GetQuizListing` / `GetQuizListings` | The two anonymous endpoints |
| `QuizService.GetQuizListingAsync` / `GetQuizListingsAsync` | Eligibility (`Listable()`) |
| `QuizMappers.ProjectListing` / `ProjectListingEntry` | The SQL projections |
| `IQuestionRepository.TouchQuizzesContainingAsync` | The question-edit bump |
| Migration `AddQuizUpdatedAt` | The column, backfilled from `CreatedAt` |
| `src/pages/Quiz/QuizListing/` | The SPA's page and its query |
| `src/pages/Dashboard/Pages/Quiz/api/use-copy-quiz-link.ts` | Copy link |

Tests: `QuizAPI.Tests/Discovery/QuizListingTests.cs` (eligibility, the uniform 404 for every
caller, the DTO's fields), `Discovery/QuizUpdatedAtTests.cs` and
`Associations/AssociationBoardServiceTests.cs` (the bumps), `worker/__tests__/listing.test.js`
(slug, 301, 404, fail-open, escaping, XML), `use-copy-quiz-link.test.tsx`, and the E2E journey
`e2e/quiz-listing.spec.ts`. The bulk `UPDATE` can't run on EF InMemory, so it was checked on
PostgreSQL 16: a bank edit moved the quiz's `UpdatedAt` and left a quiz without that question alone.
