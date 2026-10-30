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
the first paint of a page — don't hold content back on load to animate it in.

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

## Lists

A list counts its *whole* entrance against the ~300ms budget — the stagger included. 12 cards
at 50ms apart with a 300ms fade take 850ms to settle, which is how `/choose-quiz` felt slow
with every request behind it done in ~250ms (fixed 2026-10-30). So:

- **No entrance on the page's first paint.** The data is already there (the loader prefetched
  it; `loading-states.md` §6), and fading it in is holding it back. Pass `initial={false}` to the
  first render's list.
- **When the results change** (another page, a filter), the new set enters: ≤ 200ms per item and
  ≤ ~20ms between items, so the last one has settled by ~350ms. Reduced motion: fade only.
- **Key the list on what it shows** (its item ids), not on the query that asked for it — see
  `loading-states.md` §6.2. framer-motion variants only run when the container mounts; new
  children under an already-`visible` container stay at `hidden` forever.

`Quiz-Selection.tsx` is the reference.

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
