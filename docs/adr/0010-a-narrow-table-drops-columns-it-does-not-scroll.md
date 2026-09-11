# 10. A narrow table drops columns, it does not scroll

Date: 2026-09-11
Status: Accepted

## Context

`quizColumns` has nine columns: Quiz Info, Date Created, Author, Category, Difficulty,
Language, Status, Questions, Actions. The users table and the invite-code table are of the
same order. None of them fit on a phone, and — the part that surprised us — none of them fit
on a tablet either, or even on a 1024px laptop: the quiz and question pages put a 76px nav
rail on one side of the table and a 350px filter sidebar on the other, so the table's own box
at `lg` is about 550px, not 1024.

The obvious answer was already in the code, twice, and did not work.

`DataTable` wrapped its table in `<div className="overflow-x-auto">`, and shadcn's `Table`
wraps *itself* in `<div className="relative w-full overflow-auto">`. Nested scrollers: the
inner one clips first, so the outer never sees overflow and never scrolls. But the deeper
problem is that the inner one, working exactly as intended, is still not usable:

- **Its scrollbar is at the bottom edge of a box ten rows tall.** To reach the control that
  scrolls the table sideways you scroll the page past the whole table — at which point the
  header row, the only thing that says what a column contains, is off screen above you. The
  bug as reported was "it needs scrolling but there's no scrollbar", which is precisely what
  a scrollbar below the fold looks like.
- **Nine columns is two to three screen-widths of dragging per row**, with nothing pinned. By
  the time Status is in view, the title that says which quiz owns that Status is gone.
- **Overlay scrollbars make it undiscoverable.** On macOS and in Electron shells the bar is
  not painted until something scrolls, so a table that *can* scroll looks identical to one
  that is simply cut off.

Horizontal scroll is a reasonable answer for a table that is slightly too wide. It is not an
answer for one that is three times too wide.

The other candidate was the **row-as-card** treatment: below some breakpoint, stop rendering
a table and render each row as a stacked card of label/value pairs. It gives the best phone
result of the three and it was rejected on cost and consistency: it is a second render path
for every table in the dashboard, it has to be written and then kept in step with the column
definitions forever, and it throws away the column alignment that is the entire reason a
table is the right shape at desk width.

## Decision

**Columns carry a priority, and a container too narrow to hold them hides the low ones rather
than scrolling.** The hidden values move into a per-row detail panel behind a chevron.

`meta: { priority: 1 | 2 | 3 }` on a column definition:

- **1** — identity, and the thing you came to check. Never hidden.
- **2** — earns a column as soon as there is room.
- **3** — detail; fine behind a tap.

**A column with no `priority` is treated as 1.** Opting in is explicit and opting out is the
default, so every table that has not been given priorities renders exactly as it did before
this existed. There is no flag day.

Two consequences of that shape are deliberate:

**The measurement is of the table's container, not the viewport.** `DataTable` uses a
`ResizeObserver`, not `matchMedia`. A viewport rule would call the 550px box described above
"desktop" and hand it nine columns — the exact crushing this is here to prevent — and it
would be wrong again for a table inside a dialog, or in any future layout that puts two
things side by side. The thresholds (620px for tier 2, 960px for tier 3) are widths of the
box the table actually occupies.

**Hidden does not mean gone.** Every value still renders, as a `<dt>/<dd>` pair in a detail
row under its own row, using the same cell renderer the column would have used. This is what
makes the decision defensible: nothing is lost on a small screen, it is one tap away. A
design that *dropped* the data would be a different and much worse decision wearing the same
clothes.

Alternatives considered and rejected:

- **Horizontal scroll, fixed up.** Un-nest the scrollers, add `min-w` so columns stop being
  crushed, pin the first column, add an edge fade. This is real work, it improves a gesture
  that is still awkward on touch, and it ends with the user dragging sideways through nine
  columns. Kept only as the backstop: `Table`'s own `overflow-auto` remains for a container
  narrower than even the priority-1 columns.
- **Row-as-card below `md`.** Above. Best phone result, highest cost, second render path per
  table.
- **A user-facing column picker.** Every dense admin table eventually grows one, and it is a
  fine feature — but it answers "I want different columns", not "these columns do not fit".
  It would leave the default state on a phone exactly as broken as it is now.

## Consequences

- **`DataTable` gained state.** It was a pure render of whatever it was handed; it now holds
  a fitting-priority and a set of expanded row ids. Both are view state derived from the box
  it is in, not from the data, and neither is worth lifting to the caller — a page has no
  opinion about how wide its own table is.
- **Unmeasurable means "show everything".** The hook starts at priority 3 and ignores a width
  of 0, so jsdom (which has no layout), a `display: none` ancestor, or a browser with no
  `ResizeObserver` all degrade to the full table rather than to a single column. A test that
  asserts on a hidden column keeps passing.
- **The expander is a column.** When anything is hidden, a 40px cell appears at the start of
  every row, and the header and empty-state `colSpan` account for it. At full width it does
  not exist at all, so wide layouts are byte-for-byte what they were.
- **Priorities are a content decision, not a layout one.** They belong with the column
  definitions and want a sentence of reasoning each, because "which two columns matter" is a
  claim about what an admin came to the page to do. `columns.tsx` carries that reasoning for
  the quiz table; the users and invite-code tables have not been given priorities yet and are
  unchanged until they are.
- **This does not settle the phone question forever.** Three columns of a table is a usable
  list, not a good one. If the admin surfaces ever become something people genuinely work in
  from a phone, the row-as-card path is still the better answer and this decision is the
  thing to revisit — with the priorities already written, since a card would show them in the
  same order.
