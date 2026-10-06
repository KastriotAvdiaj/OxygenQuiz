# The quiz card

What a quiz looks like in the catalogue, and the rules that keep it looking like itself.

Companion to [`quiz-discovery.md`](./quiz-discovery.md) (what order the cards arrive in) and
[`../entities/category-palettes.md`](../entities/category-palettes.md) (where their colours come
from).

---

## 1. Where it is

```
src/pages/Quiz/components/quiz-card/
├── quiz-card.tsx    layout — what is shown, in what order, in what colour
├── card-parts.tsx   the frame, the difficulty meter, the creator avatar
├── card-model.ts    derived data — palette, duration, difficulty rank
└── index.ts         public surface: `QuizCard`
```

Rendered by `Quiz-Selection.tsx` at `/choose-quiz`, in a grid with `auto-rows-fr` — every card
in a row is the height of the tallest. It is also rendered, with fake data, as the live preview
in `color-palette-input.tsx`, which is the only place a palette edit can be judged before it is
saved. **That preview is a real `QuizCard`, so it follows any change made here for free — and
breaks with any change that assumes real API data.**

## 2. The anatomy

```
┌──────────────────────────────┐
│ ● ● ● ●                 (KA) │   palette dots — or a board's ▦ (BoardGlyph) · ["BOARD"] creator
│                              │
│  Shkrimtarët                 │   title — font-quiz, display size
│  shqiptarë                   │
│  LITERATURE                  │   category — the accent, as text
│                              │   (the gap is deliberate, see §4)
│  13 questions · 5m 5s  ▮▮▯  →│   count · duration · difficulty · arrow
└──────────────────────────────┘
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀     the pushable edge, a darker shade of the accent
```

**Built like the mode cards** on `/choose-mode` (`mode-card.tsx`) since 2026-09-24, so the two
steps of choosing a game look like one app: a 2px border, `rounded-2xl`, a solid 4px edge under
the card that grows on hover (the card lifts) and shrinks on click (it presses), and a bare arrow
that travels. (The mode cards' icon chip was dropped from this card on 2026-10-06 — see below.) The mode cards have fixed accents; this card uses the
quiz's own (`--edge` is `color-mix(in srgb, var(--accent), black 25%)`, set on the frame).

Top to bottom, and each line is a decision:

- **The format is told by shape, not by an icon** (2026-10-06). Both formats used to open on an
  accent-filled chip — a list icon or a grid icon in the same coloured square — and in a grid of
  cards the two were indistinguishable. Now a Classic card opens on its palette dots, and a board
  opens on `BoardGlyph`: a miniature of the board, four columns of four tiles (a tint of the
  accent) with the Final as a solid bar under them. It tilts on hover, as the chip did.

- **The dots are the category's palette**, in order, dominant first. A palette is 2–5 colours,
  and all of them show: this is the only place in the app the whole palette is visible rather
  than just its dominant colour, so trimming it to a fixed four would make two different
  five-colour categories look the same. Palettes shorter than four are **padded up** with tints
  and shades of the accent (`useDots`), because two lonely dots read as a rendering fault rather
  than as a palette. Padding up, never trimming down.
- **The title is `font-quiz`** (DynaPuff by default, swappable per user via `--font-quiz`) — the
  same face the quiz is played in. The card previews the thing it opens. Everything else on the
  card is `font-app`, so the metadata reads as metadata.
- **The category label is the one place the accent appears as text.** It sits on the card
  surface, not on a fill, so it needs no black/white contrast flip. The trade-off is real and
  accepted: a very pale category goes faint here. `onAccent` (`readableTextColor`) is still
  exposed by the frame for anything that later sits *on* the accent.
- **The footer never wraps.** Count, duration and difficulty are short by construction; the play
  affordance is pinned right with `ml-auto`.
- **The count depends on the format.** A Classic quiz shows "13 questions"; an Associations quiz
  shows "Associations board" with no number, because a board has no questions and would otherwise
  read "0 questions". `quizSizeLabel` in `card-model.ts` decides it, and the frame's `aria-label`
  uses the same function so the spoken and the visible line never disagree
  ([`associations.md`](./associations.md) §1).
- **A board is marked at a glance**: `BoardGlyph` and a "Board" label (`BoardMark`) where a
  Classic card shows its palette dots — so boards stand out in a mixed grid before anyone reads
  the footer. Accent as an inline `color-mix`, like the dots, never a built class name.
- **The creator sits in the top-right corner**: `CreatorAvatar` — their photo
  (`userProfileImageUrl`) or initials (`initials` in `card-model.ts`) on a hairline ring, with the
  full name on hover. On a board the "Board" label sits just left of it. Dropped in the
  2026-09-24 redesign, back on 2026-10-06. The name pops up *below* the avatar because the frame
  is `overflow-hidden` and a popup above would be clipped.
  Hover only — on touch there is no name, but the start dialog shows it.
- **No description on the card.** It is read in the start dialog the card opens (which is sized
  for it, `sm:max-w-lg`); the card stays a poster (2026-09-24).

## 2a. Phones get a smaller card, not smaller text

Following [`../RESPONSIVE.md`](../RESPONSIVE.md) — width scales layout and display type, not the
text you read inside a control. Below `sm` (one card per row) the card steps down its **layout
and display type**: padding `p-4` (from `p-5`), the board glyph's tiles `6px` (from `7px`), the title `text-xl`
(from `1.6rem`), and the poster spacer `1.25rem` (from `3.25rem`) — a full-width poster-tall card
showed barely three quizzes per screen. The same steps the mode cards take (`mode-card.tsx`). The
category and footer text don't change: they're already at their smallest readable size.

## 3. The frame is a `<button>`

The whole card is one button, so it is keyboard-reachable and gets a real focus ring. Two
consequences that are easy to undo:

- **The arrow is decorative (an `aria-hidden` icon), never a nested `<button>`.** Nested buttons are invalid
  HTML and the inner one would steal both the click and the tab stop. It carries `aria-hidden`
  and exists only to say "this opens something".
- **The `aria-label` carries what the visuals encode** — title, category, difficulty, question
  count, creator ("…, by <name>") — because the dots, the colour, the meter and the avatar say
  none of it out loud. The avatar itself is `aria-hidden`.

## 4. Two numbers that are not theme tokens

The card deliberately opts out of the design system twice, and both need saying because a future
cleanup will read them as mistakes:

- **`rounded-2xl`, not the theme radius.** The theme's `--radius` is `0.3rem`, tuned for dense
  dashboard chrome. This card wants the mode cards' corner (it was a literal `18px` before it
  took their shape). Changing `--radius` to suit it would re-round every input and dialog in the
  app.
- **`min-h-[3.25rem]` on the spacer above the footer** (`1.25rem` below `sm`, see §2a). Without a floor, the footer rides up
  under a one-line title and the card loses its proportions; the grid's `auto-rows-fr` only
  equalises heights *within a row*, so a row of short titles would otherwise collapse together.
  `mt-auto` on the footer takes over whenever a taller sibling stretches the row.

## 5. Colour is runtime, so colour is not a class

A quiz's accent is a hex string from the database. It can never be a Tailwind class — the JIT
only generates classes it can read verbatim in source, so `` `text-${accent}` `` produces nothing
at all. The card therefore paints every quiz-coloured thing with inline `style`, and
`QuizCardFrame` publishes the accent as `--accent` for the classes that *can* use it
(`focus-visible:ring-[var(--accent)]`, `hover:border-[var(--accent)]`).

The "Board" label's border and the pushable edge use `color-mix(…)` rather than an opacity
modifier for the same reason: Tailwind's `/40` syntax cannot apply alpha to a runtime custom
property.

See `CLAUDE.md` § Styling and `../entities/category-palettes.md` § 1 for the general rule.

## 6. What the card does not show

- **No description, no image, no `gradient`.** `QuizSummaryDTO` carries all three; the description
  is shown in the start dialog instead.
  `gradient` is [stored but never rendered anywhere in the app](../deployment/known-issues.md).
- **No status.** The catalogue only lists what the viewer may play, so there is nothing to badge.

## 7. Testing

`__tests__/card-model.test.ts` covers `quizSizeLabel` (Classic count, singular, and a board never
reading "0 questions"). There are no stories and no other tests for this card — the only visual check today is the admin
preview in `color-palette-input.tsx`. If you add a story, the cases worth having are the ones the
grid will not show you on demand: a **two-colour palette** (the padding path), a **five-colour
palette** (the cap), a **near-white accent** (the faint-category trade-off in §2), a
**one-line title** (the spacer floor in §4), and an **unrecognised difficulty**, which falls back
to the raw label instead of an empty meter. `quiz-selection-dialog-view.stories.tsx` is the
nearest pattern.
