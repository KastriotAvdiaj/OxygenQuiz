# Search visibility — how oxygenquiz.com shows up in Google, and what is still to do

Written 2026-11-07, after finding that a search for **"oxygen quiz"** (two words) does not show
the site in the first five pages, while **"oxygenquiz"** finds it. The likely reason is the phrase,
not the site: "oxygen quiz" is also what people type for quizzes about the element, so Google fills
the page with chemistry quizzes. Nothing below is a quick fix; it is what moves a brand query over
weeks.

## What is in place

| | Where | Since |
|---|---|---|
| Title *Oxygen Quiz — Challenge yourself, or a friend*, and the description under it | `index.html` | 2026-11-07 |
| `WebSite` JSON-LD naming the site "Oxygen Quiz" (Google's site name) | `index.html` | 2026-11-07 |
| Favicon: white O₂ on a blue badge, survives Google's circular crop | [`../development/favicon.md`](../development/favicon.md) | 2026-11-07 |
| Real HTML for public quiz listings (`/q/…`) and `/sitemap.xml` | the Worker — [`frontend-worker.md`](./frontend-worker.md) | before 2026-11-07 |
| `robots.txt` keeping dashboards, settings and play screens out | `public/robots.txt` | before 2026-11-07 |
| Search Console: a **Domain** property for `oxygenquiz.com`, verified by a `google-site-verification` TXT record on `@` in Cloudflare DNS — **keep that record**, or verification lapses | Search Console, Cloudflare DNS | 2026-11-07 |
| Sitemap submitted (15 URLs: home, catalogue, 13 public quizzes). It showed *Couldn't fetch* straight after submitting, while the file served fine — Google hadn't read it yet; recheck, and resubmit if it persists | Search Console → Sitemaps | 2026-11-07 |

## Still to do

The home page was already indexed when Search Console was set up (2026-11-07), so "oxygen quiz"
not finding it is ranking, not a missing page.

1. **Search Console, after each deploy that touches the home page.** Inspect
   `https://oxygenquiz.com/` and press *Request indexing*. Under *Sitemaps*, check that
   `https://oxygenquiz.com/sitemap.xml` is submitted, read without errors, and that its pages are
   indexed. A changed title, description or icon appears only when Google recrawls — days to weeks.
2. **Name it the same way everywhere, and link to it.** "Oxygen Quiz", two words, linking to
   `https://oxygenquiz.com/` — from the GitHub README and profile, LinkedIn, the CV and portfolio.
   Links from sites Google already trusts count for more than anything in the page itself.
3. **Give the home page real text in its HTML.** Today `/` is `index.html` with an empty
   `<div id="root">`: a crawler sees the title and description, and the page's words only after it
   runs the JavaScript — which Google does later and less reliably than reading HTML. The Worker
   already writes real HTML into `#root` for quiz listings (`<h1>`, description, a Play link) that
   React then replaces; the home page could get the same: an `<h1>Oxygen Quiz</h1>`, a sentence of
   what it is, and links to the catalogue and a few public quizzes. Not built.
