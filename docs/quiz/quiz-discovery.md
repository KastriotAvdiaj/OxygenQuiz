# Quiz discovery: the "variety" ordering

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

- **Single player** — `/choose-quiz` (`src/pages/Quiz/Quiz-Selection.tsx`);
  the panel renders as a left sidebar on desktop and a slide-in drawer on mobile
- **Multiplayer** — the lobby's quiz picker dialog
  (`src/pages/Quiz/Multiplayer/components/lobby/quiz-selection-dialog.tsx`);
  the panel sits behind a "Filters" toggle in its compact variant

Both default to the `Mixed Categories` sort option (`DEFAULT_SORT = "variety"` in
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
- Category images/colors already differentiate the cards visually; if you want to go
  further, a "browse by category" strip above the grid would build on the same data.
