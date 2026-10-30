# Motion

**Every change in the UI that moves, adds or removes something on screen is animated — it never
snaps.** Stated 2026-10-17 as a standing rule for the whole app. A snap makes the user re-find
their place: the content they were reading jumps, and nothing tells them what changed or where it
came from. A short animation is that explanation.

## What counts as a shift

Animate it if any of these happens:

- **Something appears or disappears** — an error line, a notice, a panel, a toast, an empty state
  replaced by content, a button that only shows in one state.
- **Something opens or closes** — an accordion, a disclosure, a drawer, a dialog, a sheet, a menu.
- **A list changes** — an item added, removed or reordered.
- **The view changes inside a flow** — a step to the next step, a list to its detail screen and
  back, one tab's panel to another's.
- **Content below moves** because something above it changed size. Animate the thing that changed,
  so what follows slides instead of jumping.

Not a shift: hover/focus colour changes (`transition-colors` is enough), typing into a field, and
the first paint of a page. A page *may* have an entrance (see "Page entrances") — it is never
required, and it must never hold content back.

## How

Use what is already installed, cheapest first:

| Case | Tool |
|---|---|
| Radix primitive opening/closing (Dialog, Sheet, Popover, Select, Accordion, Collapsible) | Its `data-[state=open]` / `data-[state=closed]` classes with `tailwindcss-animate` — `dialog.tsx` is the reference. A Collapsible uses the `collapsible-down`/`-up` keyframes, not `accordion-*` (they read different height variables; see `docs/quiz/quiz-analytics-page.md`, "Motion"). |
| Something entering | `animate-in fade-in-0 slide-in-from-top-1 duration-200` (`tailwindcss-animate`). |
| Something leaving, a height change that pushes content, list add/remove/reorder, screen-to-screen | `framer-motion`: `AnimatePresence` for exit, `layout` for the content that moves, `motion.div` for the rest. CSS alone can't animate an element that has already unmounted. |

**Timing.** 150–200ms for small things (an error line, a badge, a chip); 200–300ms for panels and
screen changes. Ease-out entering, ease-in leaving. Longer than ~300ms and it starts to feel like
waiting.

**Direction means something.** Going deeper (list → detail, step 1 → step 2) enters from the right
or bottom; going back reverses it. Don't pick a direction per screen by taste.

## Page entrances

A browse page — a grid or list the user arrives at to pick something — can arrive with an
entrance instead of appearing all at once. Stated 2026-10-30 for the quiz catalogue: the cards
settling in is part of how the page should feel. The rules that keep an entrance from reading
as lag:

- **It starts on the first frame.** The data is already cached when the page mounts (the route
  loader prefetched it — `loading-states.md` §6), so the entrance is the page arriving, not a
  curtain over a load. Never delay it to wait for something.
- **The first item settles by ~350ms, the last by ~550ms**, wherever the grid wraps. The
  catalogue used to take ~850ms (a whole-grid fade, then cards 50ms apart in DOM order) — the
  same motion, too slow, is exactly what felt laggy.
- **Stagger by diagonal, not by index.** A card's delay is its row plus its column, so each
  diagonal lands together and the wave runs top-left to bottom-right, the way the page is read.
  A 4-column page of 12 is 6 steps instead of 12. Cap the steps (6) so a one-column phone list
  doesn't make its last card wait.
- **Beats overlap**: the controls lead (fade and an 8px drop, ~280ms), the sidebar slides in from
  the edge it is anchored to, and the cards follow 40ms behind. Ease out hard (easeOutQuint,
  `[0.22, 1, 0.36, 1]`) — the item is fast off the mark and lands softly.
- **Rise, grow slightly, fade**: 18px up, from 96% scale. More than that reads as bouncy.
- **Reduced motion**: a 150ms fade, everything at once.
- **Read reduced motion synchronously** (`useMediaQuery("(prefers-reduced-motion: reduce)")`).
  `usePrefersReducedMotion` corrects itself after the first frame, which starts the full
  entrance and then changes its target mid-flight.

`pages/Quiz/components/catalogue-motion.ts` is the reference implementation; copy its shape for
the next browse page rather than inventing timings.

## Lists

- **When the results change** (another page, a filter), the new set enters with the same
  entrance as the page's arrival — the catalogue replays its wave.
- **Key the list on what it shows** (its item ids), not on the query that asked for it — see
  `loading-states.md` §6.2. With `keepPreviousData` the query changes first and the items a
  moment later; the entrance belongs to the new items.
- **Per-item `initial`/`animate`, not parent `variants`** for a list whose items change.
  framer-motion propagates variants only when the container mounts, so new children under an
  already-`visible` container stay at `hidden` forever.

## What not to animate

- **`backdrop-filter`.** A blurred backdrop faded in makes the browser re-blur the page every
  frame, and it reads as the screen flickering — the add-question menu's backdrop did exactly that
  (removed 2026-10-17). A dim with no blur can fade; a blur appears with its dialog (Radix's
  overlay) or not at all. A popover menu needs no backdrop.
- **Something to make it "count" as animated.** The rule is that a change shouldn't snap, not that
  every change needs a backdrop, a bounce or a delay. If the element already arrives with an
  animation, don't add a second layer to it.

## Page changes

A route change inside a dashboard fades the new page in over 200ms — `PageEnter` in
`src/layouts/dashboard-layout.tsx`, round whatever `main` renders. Enter only: an exit would need
the old page kept mounted after the router swapped it, which holds two pages (and their queries) at
once and fights pages with their own exits. Opacity only, run through the Web Animations API on
`pathname` — not a `key` remount, which would throw away a page's state on a param change, and not
`animate-in`, whose `transform` makes the wrapper the containing block for every `fixed` layer
inside for the length of the animation. A step *within* a page (the AI brief → review) is the
page's own entrance, not this.

## Reduced motion

Every animation honours `prefers-reduced-motion`. The change still happens — the element arrives
instead of travelling: drop the slide/scale and keep at most a short fade.

- Tailwind: `motion-reduce:animate-none` / `motion-reduce:transition-none`.
- framer-motion / JS: `usePrefersReducedMotion` (`src/hooks/use-prefers-reduced-motion.ts`).
- Plain CSS: an `@media (prefers-reduced-motion: reduce)` block, as the board animations in
  `global.css` do.

## Existing screens

Much of the app predates this rule and still snaps (error lines in forms among them). Fix one when
you touch it; new UI is built to the rule from the start.
