# The quiz overview

The quiz builder's reading view: the quiz as a list, with every edit in a dialog. Used for **AI
review on every screen**, and for **building and editing on a phone or tablet** (below `lg`). A
desktop building by hand keeps the three-column builder. Why: [ADR 0026](../adr/0026-the-quiz-overview.md).

Code: `src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/components/overview/`, mounted by
`create-quiz.tsx` when `aiImportMode || !isDesktop`.

## What's on it

0. **Back** (AI flow only) — the wizard's Back chip (`review-back-button.tsx`). The questions
   aren't saved yet, so it asks first — "Leave without publishing?" — with three small buttons,
   each as wide as its label, in one row from `sm` up (stacked full-width on a phone, where three
   labels don't fit side by side): **Save as draft & leave** (primary: sets the status to Draft and submits the
   builder's form, through `form={formId}` since the dialog is portalled outside it), **Discard &
   go back** (red: back to the brief) and **Keep reviewing** (outline). Its own dialog rather than
   `ConfirmationDialog`, which has room for one action and sized its Cancel differently from it.
   It replaced a fact-check line and a *Start over* that discarded on the spot (2026-10-17).
   Under it, any import notices (questions the parser dropped). A draft restored on arrival is
   announced once as a notification ("Picked up where you left off"), not a banner that stayed
   above the review (docs/quiz/quiz-draft-persistence.md).
1. **Summary card** — every value under a label, with the names the details form uses: *Title*,
   *Description*, then a grid of *Status* (`QuizStatusBadge`), *Category*, *Difficulty*,
   *Language*, *Instant feedback* and *Shuffle questions* (On/Off). It replaced a row of bare
   pills ("Hard", "Instant feedback") that said nothing about what each was a value *of*.
   **Edit details** — a small lifted button in the default colours — opens the quiz fields (`QuizDetailsFields`,
   the same component as the desktop sidebar) in a dialog. If a submit fails on one of those
   fields, the card turns red, lists the errors, and scrolls into view.
2. **Questions** — one card (`bg-card`, the dashboard card rule) holding every question in order,
   in full: the whole question text, its image, and every choice. Each question is framed in its
   type's colour with a quiet bar of it across the top (25% fill, so three types side by side
   don't shout; `overviewFrame`/`overviewBar` in `question-type-theme.ts`; red when the question
   failed the submit). The bar holds the grip, the number and type, and two lifted icon buttons:
   **Edit** (default blue) and **Remove** (red).
3. **The bar** — the bottom of that same card: *Add a question* (muted) and the primary action
   with an arrow, small and centred, sticky to the bottom of the page so it stays in reach while
   the list scrolls. A removal shows "Question N removed · **Undo**" in it for six seconds; Undo
   puts the question back in the same place with the same settings.

## Wide screens

Up to `xl` (1280px) the overview is one column, at most `max-w-3xl`. From `xl` that left most of
a wide screen empty down both sides, so it becomes two columns (2026-10-17), at most `92rem`
wide: Back and any import notices across the top, then the summary on the left (20rem, `sticky
top-0`, so the quiz stays in view while the questions scroll) and the questions card on the
right, both starting on the same line. The AI pages' own `max-w-3xl` wrapper lifts at `xl` too
(`xl:max-w-none`), or the two columns are squeezed into 768px.

**The questions are a masonry** (`use-masonry.ts`): columns at least 240px wide, as many as fit —
four on a 1900px screen — with each card directly under the one above it in its column. A grid
was the first version, and a tall card stretched every card in its row with empty space; in the
masonry a card that grows (an answer revealed) pushes down only its own column. Placement is
round-robin — card `i` in column `i % columns` — so 1, 2, 3, 4 run across the top whatever the
heights; "shortest column first" packs tighter but could move a card to another column when one
above it grew, changing the order on screen without a reorder. CSS can't do this (`columns`
fills top to bottom; `grid-template-rows: masonry` isn't shipped), so the list is `relative`
with the tallest column's height and each card is absolutely placed from measured heights —
re-measured after every render and by a ResizeObserver. A slot change is a re-render, so
framer's `layout` still slides the cards.

**Cards are compact at `xl`**: smaller header, icon buttons, padding and text (question
`text-sm`, options and Reveal `text-xs`), options one per line. The summary's details go from
three across to two, and a cut-off value (a long category) shows in full on hover (`title`).

**The bar** stops at the page's own bottom padding from `xl` (`bottom-0`) rather than at the
screen edge, so the card ends above the bottom like it starts below the top. It draws the card's
sides and bottom edge itself, and an `after:` strip in the page colour under it hides the
questions scrolling through that padding.

## Revealing answers

| Type | Before Reveal | After |
|---|---|---|
| Multiple choice | Every option, none marked | The correct one(s) ticked in `quiz-success`, the rest dimmed |
| True / False | *True* and *False*, neither marked | The correct one ticked |
| Type the answer | "The player types the answer" | The answer, other accepted spellings, case/partial flags |

The explanation, if any, opens with the answer. **Show answers** reveals every card at once and
removes the per-card button; turning it off hides everything again.

The switch starts **off in the AI flow** (the author may be making the quiz to take it) and **on
when building by hand** (they wrote the answers). Each viewer's choice is remembered in their
browser per flow (`oq:quiz-overview:show-answers:ai` / `:build`), with the default if storage is
unavailable.

`review-model.ts` turns either question shape — new (`NewAnyQuestion`) or picked from the bank
(`AnyQuestion`) — into what a card draws; True/False becomes two options so it renders like
multiple choice.

## Editing a question

**Edit** opens `QuestionEditorDialog`: nearly the whole screen, with the list visible round its
edge — a tap there closes it. It holds the same editors the desktop builder uses plus the
question's settings (points, time limit). Edits apply as they are typed, so there is no Save;
**Done** closes. **Previous / Next** step through the questions in order, sliding in the direction
of travel. **Remove** deletes the question (with the same Undo as the card's button) and moves to
the one that took its place. The question's points and time limit sit under it as "Points and
time", without repeating the question's text.

A question created from *Add a question → Create New* opens in the editor straight away.

## Reordering

Drag a card by its grip (the grip is `touch-none`, so a swipe anywhere else still scrolls the
page), or focus the grip and use the arrow keys. **Holding a card near the top or bottom edge
scrolls the page**, faster the closer it gets. Both are `use-drag-reorder.ts`; the desktop
builder's question list uses the same hook.

Not framer-motion's `Reorder`, which was the first version: its drag is a transform from where the
pointer went down, so when the dashboard's `<main>` scrolled under a held card the card scrolled
away with the content, and `Reorder` decided the new order from that stale offset. The hook places
the dragged card from the pointer and the list's live layout each frame, keeps it inside the list
(a card dragged past the end would grow the page and the edge loop would scroll into the room it
made), and takes a slot once the *pointer* passes a neighbour's middle. The other cards still
slide with framer's `layout`.

**The held card is out of `layout`.** The first version of the hook left it in, and a card jumped
by up to a card's height for one frame each time it took a new slot: React moved it in the DOM,
framer's layout animation started a FLIP from where it *had* been, and the hook's offset — set in
the pointer handler, before the reorder rendered — was measured against the old layout. Now the
offset is a motion value re-set in a `useLayoutEffect` after each reorder (so it is computed
against the new DOM before paint), and the held card renders with `layout={false}` until it has
settled back into its slot on release.

**In the masonry** the same hook reads the cards left to right, top to bottom. The held card
follows the pointer on both axes (`dragX`/`dragY`, clamped to the list), and a neighbour is passed
once the pointer is below it, or level with it and past its horizontal middle; in a single column,
its vertical middle as before. The arrow keys move a card one place: up or left earlier, down or
right later. The hook re-places the held card after *every* render, not only a reorder — the
masonry moves its slot in a second render. On release the card settles on both axes before layout
takes it back; handing it back when only `y` had settled snapped the `x` (a 260px jump, found by
sampling the card every frame).

Order is positional — `reorderQuestions` replaces the list, and `getQuestionsWithSettings`
derives `orderInQuiz` from the index.

## The primary action

Its label says what it will do: **Publish quiz** (status Public), *Save quiz* (Unlisted), *Save
draft* (Draft), *Save changes* (editing). A failed submit opens what needs fixing: the first
invalid question's editor, or the details dialog when the category or language is Unspecified.

## Motion

Everything that appears, opens or moves is animated (`docs/development/motion.md`): cards enter and
leave, the explanation and errors expand, the tick scales in, the typed answer crossfades, the
editor slides between questions. The whole overview sits in `MotionConfig reducedMotion="user"`,
so with reduced motion on, things fade in place instead of moving.

## Tests

- `overview/__tests__/review-model.test.ts` — both question shapes become the same card model.
- `overview/quiz-overview.stories.tsx` — AI review hides answers and reveals one card; building
  shows them; Edit opens the dialog and Next moves on; Remove then Undo puts a question back in
  place; the grip's arrow keys move a question.
