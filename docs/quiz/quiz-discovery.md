# Quiz discovery: the "variety" ordering

> This file is about the **order** quizzes arrive in. What each one looks like once it gets
> there is [`quiz-card.md`](./quiz-card.md).

The quiz catalogue's first page is a new user's first impression of the app. Sorted by
`createdAt` (the old default), it showed whatever happened to be published last — often a
wall of one category — hiding the app's actual breadth. The **variety ordering** fixes
that: the default first page now interleaves categories, showing the newest quiz of
*each* category before the second of any.

## Where it applies

Both quiz pickers, which share `QuizToolbar` (search + sort), the faceted
filter panel (`src/pages/Quiz/components/quiz-filters/` — multi-select
category/difficulty/language checkboxes serialized as `in` rules), and the
same defaults:

- **Single player** — `/choose-quiz/all` (`src/pages/Quiz/Quiz-Selection.tsx`);
  the panel renders as a left sidebar on desktop and a slide-in drawer on mobile. Until
  2026-10-07 this lived at `/choose-quiz`, which is now the quiz home page of featured quizzes
  ([`featured-quizzes.md`](./featured-quizzes.md)); its **Browse all** and **Explore more
  quizzes** lead here, and this page's Back chip leads back there
- **Multiplayer** — the lobby's quiz picker dialog
  (`src/pages/Quiz/Multiplayer/components/lobby/quiz-selection-dialog.tsx`);
  the panel sits behind a "Filters" toggle in its compact variant

### Getting to the pickers

- The header's **Play** link (`/choose-mode`, added 2026-09-20) — one item, from anywhere, for
  both singleplayer and multiplayer. Not "choose mode" + "select quiz": those are two steps of
  one flow, and the header runs out of room at 360px, which is this app's narrowest supported
  width (`RESPONSIVE.md`).
- The landing page's **Play** button also goes to `/choose-mode` (since 2026-10-06; it used to
  skip straight to `/choose-quiz`) — see [`../home/landing-page.md`](../home/landing-page.md).
- Single player on `/choose-mode` opens the quiz home page (`/choose-quiz`), and the catalogue is
  one step further, behind **Browse all** / **Explore more quizzes**.

### Opening the list on one category: `?category=<name>`

`/choose-quiz/all?category=Geography` opens the list with that category already selected
(`/choose-quiz?category=…` still works — the featured page's loader passes it on). It is
matched by **name** (case- and spacing-insensitive, otherwise exact — "Film and TV" does not
match "Film & TV"), because ids differ between dev and live. Nothing in the app links with it
today — it was built for the landing page's old sample question, which is gone
([`../home/landing-page.md`](../home/landing-page.md)) — but it is tested and ready for any link
that wants a category-filtered list; build those with `categoryListPath()` from
`quiz-filters/category-param.ts`.

- The loader prefetches the categories whenever the param is present, so the page can resolve
  the name on its first render and start with the filter already applied.
- **No category by that name**, or **the category has no public quizzes** → the list shows
  every quiz with a note ("No Mythology & Folklore quizzes yet — here's everything else.")
  instead of an empty page. The empty case is detected from the filtered result and cleared
  during render, so the empty grid never paints. The note goes away once the visitor filters
  or searches themselves.
- If the categories can't be loaded, the param is ignored rather than claiming the category
  doesn't exist.
- The param is read once, on arrival; after that the filters are the visitor's.

The same toolbar and panel also power the play history's filters
(`/my-dashboard/history`, see [user-stats-history.md](user-stats-history.md)). Two
extension points exist for that and are safe to reuse: `QuizToolbar` takes a
`sortOptions` map (value → label) in place of the catalogue's options, and
`QuizFilterPanel` renders `children` after its three facets. In the sidebar and drawer
the facets behave as an accordion — opening one closes the other — so two long lists
never stack into a scrolling panel; the compact multiplayer variant keeps them
independent because it lays them side by side.

Both pickers default to the `Mixed Categories` sort option (`DEFAULT_SORT = "variety"` in
`quiz-header.tsx`). Users can still switch to Newest/Oldest/A–Z; the variety option is
just the landing default. Because the two pickers send identical default queries, they
share the same React-Query cache entry.

## How it works

`variety` is a **pseudo sort field** — it is *not* in the `QuizFilterFields` whitelist,
because `FilterEngine` can only translate a sort into `ORDER BY column`, and variety
needs a *per-category rank*. The flow:

1. The client sends `sort=variety:desc` like any other sort (same wire format,
   see docs/quiz/filtering.md).
2. `FilterEngine` ignores the unknown field (its normal behaviour) and applies the
   default sort.
3. `QuizService.SearchQuizzesAsync` detects the pseudo field via
   `QuizVarietyOrdering.IsRequested(query.Sort)` and re-orders the already-filtered
   queryable with `QuizVarietyOrdering.Apply`.

`Apply` orders by each quiz's **recency rank within its category**, computed as a
correlated `COUNT` over the same filtered source (translates to SQL — no client-side
evaluation), then by recency overall, with `Id` as the tie-breaker:

```
rank(x) = COUNT(y in same category AND (y newer than x, ties broken by Id))
ORDER BY rank ASC, CreatedAt DESC, Id ASC
```

So the result reads: round 1 = newest quiz of every category (recency-ordered), round
2 = second-newest of every category, and so on. A page of 12 shows up to 12 different
categories. The tie-breaker keeps the ordering fully deterministic, which server-side
pagination requires — page 2 continues exactly where page 1 stopped.

Because the rank is computed over the **filtered** source, variety composes with
search and the category/difficulty/language facets (the facets are multi-select,
so an `in` filter over several categories still interleaves *those* categories;
narrowing to a single one simply degrades to newest-first, as the single-category
test asserts).

## Files

| File | Role |
|---|---|
| `OxygenBackend/QuizAPI/Controllers/Quizzes/QuizVarietyOrdering.cs` | `IsRequested` + the ordering itself. Pure LINQ, EF-translatable. |
| `OxygenBackend/QuizAPI/Controllers/Quizzes/Services/QuizServices/QuizService.cs` | Special-cases the pseudo field in `SearchQuizzesAsync`. |
| `src/pages/Quiz/components/quiz-header.tsx` | `SortOption "variety"`, `DEFAULT_SORT`, the "Mixed Categories" label. |
| `OxygenBackend/QuizAPI.Tests/Discovery/QuizVarietyOrderingTests.cs` | Interleave, single-category fallback, determinism, `IsRequested` parsing. |

## Trade-offs & future ideas

- The correlated COUNT is O(n) subquery per row; fine at catalogue scale. If the
  catalogue grows large, replace with a raw `ROW_NUMBER() OVER (PARTITION BY
  "CategoryId" ORDER BY "CreatedAt" DESC)` query — same semantics, one window scan.
- Ordering is deterministic (deliberately, for pagination), so the first page is the
  same for everyone until new quizzes are published. If you later want rotation, add a
  seeded shuffle *within* each rank round rather than randomizing globally.
- Category colours already differentiate the cards visually — each card shows its category's
  full palette ([`quiz-card.md`](./quiz-card.md)) — so a "browse by category" strip above the
  grid would build on data the page already has.
