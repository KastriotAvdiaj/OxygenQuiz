# Responsive & Mobile Conventions

How this app stays usable from ~360px phones up to ultra-wide desktops, why the
architecture is the way it is, and the rules every new page/component must
follow. Written during the July 2026 mobile overhaul of the player flow.

## The scrolling model (read this first)

**The window never scrolls.** `html`/`body` are pinned (`overflow: hidden` in
`src/global.css`) and every route under `HomeLayout` scrolls inside a single
container it renders (`src/layouts/layout.tsx`), styled by the
`.app-shell-viewport` class and identified by `APP_SCROLL_CONTAINER_ID`
(`src/lib/app-scroll.ts`).

> **Dashboard routes do not currently do this.** `DashboardLayout` is a second
> shell that predates this document and scrolls inside its own `<main>` without
> the id — so `scrollAppToTop()` is a no-op there. See "The shells" below; the
> fix is logged in [`deployment/known-issues.md`](deployment/known-issues.md).

Structure (simplified):

```
<Header />                            fixed, h-16, sets --header-height
<div .app-shell-viewport #app-scroll-container>   ← THE scroll container
  <effect canvas />                   absolute, first viewport only
  <div .flex .min-h-full .flex-col>   ← grows with content, never pins it
    <EmailVerificationBanner />
    {page}                            ← flex child; use flex-1 to fill screen
  </div>
</div>
```

Consequences:

- `window.scrollTo` / `window.scrollY` / `window` scroll listeners are **silent
  no-ops**. Use `scrollAppToTop()` / `getAppScrollContainer()` from
  `src/lib/app-scroll.ts` (see the pagination handler in `Quiz-Selection.tsx`
  and the header's hide-on-scroll in `common/Header.tsx` for reference usage).
- The container — not any inner wrapper — owns the scrollbar. Never give a page
  root a fixed height (`h-full`, `height: 100%`, `h-screen`): that is exactly
  the bug that made `/choose-quiz` unscrollable on phones. The old layout
  wrapper was `height: 100%` (one viewport, no more); pages taller than one
  screen overflowed a fixed box instead of growing the scroll area.

## The shells

Every rule in this document is addressed to page authors, and for a long time
nobody applied any of them to the two **layouts** those pages render inside.
That is how the AI wizard ended up with a dozen `short:` density steps sitting
in a shell with none — the form was optimised and the ~168px of chrome around
it was not. **The checklist at the end applies to layouts too.**

There are two, and they are not interchangeable:

| | `HomeLayout` (`layouts/layout.tsx`) | `DashboardLayout` (`layouts/dashboard-layout.tsx`) |
|---|---|---|
| Used by | public site, quiz play, auth | `/dashboard/*`, `/my-dashboard/*` |
| Scroll container | `.app-shell-viewport` + `APP_SCROLL_CONTAINER_ID` | its own `<main class="flex-1 overflow-y-auto">`, **no id** |
| Height | `100dvh` (with a `100vh` fallback) | `h-screen` ❌ |
| Safe areas | `env(safe-area-inset-*)` | none ❌ |
| Header control | `headerBehavior` (incl. `"hidden"`) | `fullWidthPaths` / `focusPaths` |
| `scrollAppToTop()` | works | **no-op** ❌ |

The ❌ rows are known defects, not design choices — they ship separately because
moving the dashboard onto `.app-shell-viewport` changes which element scrolls on
every dashboard page.

### Focus mode

`DashboardLayout` has two levels of stripping-back:

- **`fullWidthPaths`** — hide the nav rail. The quiz creator and editor.
- **`focusPaths`** — hide the nav rail *and* the header. The AI creation routes.

The header is 77px, and on a 730px laptop viewport those 77px were the
difference between the Generate button being on screen and being under the fold.

**A route may only enter focus mode if it has its own in-page way back.**
Removing the header removes Back, Home, the theme toggle and the account button
at once; a page with no escape of its own is left with the browser's Back button.
This is why the manual creator and the edit form are *not* in `focusPaths` even
though they share the full-width branch — neither has a Back control.
See [`adr/0002-quiz-creation-routes-hide-the-dashboard-header.md`](adr/0002-quiz-creation-routes-hide-the-dashboard-header.md).

### Chrome gets density steps too

`main`'s padding carries `short:p-4`. Before that it had width steps only
(`p-4 sm:p-6 lg:p-8`), so a wide-but-short laptop paid the full 64px vertical —
and no amount of `short:` work inside a page could reach it. **When a screen
doesn't fit, measure the chrome before you cut the content.** On this one the
chrome was more than half the deficit.

## Viewport units: dvh, never vh

On mobile, `100vh` is the *largest* possible viewport — it ignores the URL
bar/toolbars, so "full height" elements hang below the visible screen and
bottom CTAs become unreachable. `100dvh` (dynamic viewport height) tracks what
is actually visible.

- The app shell uses `height: 100dvh` with a `100vh` first-line fallback
  (`.app-shell-viewport` in `global.css`).
- In Tailwind, write the fallback pair:
  `max-h-[calc(100vh-7rem)] supports-[height:100dvh]:max-h-[calc(100dvh-7rem)]`
  (see `quiz-filter-panel.tsx`, `quiz-start-modal.tsx`).

## Short viewports: the `short:` variant

Every other breakpoint in this app is about **width**. `short:` is about **height**, and it
exists because the two failures are genuinely different: a phone is narrow *and* short, but a
laptop is wide and short. A 1440×800 screen passes every `md:`/`lg:` test — the two-column
layouts fit, nothing deforms — and the form still runs past the fold, because width breakpoints
have nothing to say about vertical space.

```js
// tailwind.config.js
screens: { short: { raw: '(max-height: 860px)' } }
```

Reach for it on a screen that is **meant** to be answerable in one view — a form, a wizard step,
a confirmation — where the alternative is the primary button sitting below the fold. Do not reach
for it on content-length pages: results, catalogues and anything whose height is a function of
how much data came back are supposed to scroll, and compressing them just makes a long page
denser.

Rules for using it:

- **Spacing and type only.** `short:py-3`, `short:space-y-3`, `short:text-lg`, a smaller
  `min-h-[…]` on a textarea. It is a density step, not a different layout.
- **Never hide content.** `short:hidden` moves the problem: the user now can't see a field
  instead of having to scroll to it, which is worse. If something genuinely doesn't belong on a
  short screen, it probably doesn't belong on a tall one either.
- **Never shrink a touch target below the floor.** 44px → 40px is fine (the doc asks 40–44px for
  primary controls); 44px → 32px is not.
- **It composes with the width variants, and it wins**, because the custom screen is appended
  after Tailwind's defaults — so `sm:mb-6 short:mb-3` gives 3 on a wide-but-short laptop. Write
  the width step first and let `short:` override it.
- **Check that the page still breathes at 1440×900 and taller.** The base sizes are the ones
  most people see; `short:` is the exception, not a licence to design tight everywhere.

Worked example: the AI quiz wizard (`ai-quiz-wizard-view.tsx` and its `components/`). One card
holding the topic box, a two-column details form and the Generate button — designed to be filled
in without scrolling, and about 120px too tall to manage it on an 800px laptop. Roughly a dozen
`short:` steps (page padding, header margins, card gaps, the three question-type rows, the
description textarea) close the gap without changing the layout at any width.

## Filling the screen: `flex-1`, not `h-screen`

Pages that want "at least one full screen" (hero/centered layouts: Home, mode
selection, quiz taking, loading/error screens) put **`flex-1` on their root**.
They are flex children of the layout's `min-h-full` column, so `flex-1` fills
the remaining visible viewport *minus the header padding* and can still grow
taller. `h-screen`/`min-h-screen` inside the shell is always wrong: it
over-measures on mobile **and** double-counts the fixed header.

Content-length pages (results, quiz catalogue) also use `flex-1` so their
background fills short screens, and simply grow past one viewport when needed.

## Rows of buttons: reflow them, don't let flex squeeze them

A `flex` row of fixed-padding controls does **not** shrink gracefully. `flex-shrink`
takes width out of the item's *content box* while its padding stays exactly where
it was, so a button that no longer fits doesn't get smaller — it squeezes its label
into a narrower box, which wraps mid-phrase. And because shrinking is proportional
to each item's base width, the longest label loses the most: three buttons in a row
end up three different widths with ragged text. It reads as a broken layout, which
is what it is.

Rule: **a row of controls whose combined width can exceed the container gets a
reflow, not a shrink.** In practice:

- **Use a grid, not a flex row**, when the items should look uniform:
  `grid grid-cols-1 gap-3 sm:grid-cols-3`. Equal columns give one width for every
  item, and stacking below the breakpoint is a layout change rather than a
  deformation.
- **Grid stretch sizes the item, not its inner face.** For a compound control like
  `LiftedButton` (an outer `<button>` with an absolutely-positioned edge/shadow and a
  `relative` front face), size the outer element *and* tell the face to fill it —
  `outerClassName="w-full"` plus `className="h-full w-full"`. Skip the `h-full` and a
  two-line label leaves one coloured face taller than its neighbours inside
  equal-height cells.
- **Shorten the text before shortening the box**: `text-sm` + `leading-tight` +
  `text-center` buys a surprising amount of room in a three-across layout.
- `flex-wrap` is fine when the items are *meant* to be different sizes (filter chips,
  tags) — the facet type chips in the AI wizard wrap and should.

The same failure with a different symptom: a dialog carrying `w-fit` around
full-width children. `w-fit` resolves to the children's max-content width, which for
`w-full` children is the shell's own `max-w-*` — so it silently does nothing except
override the phone gutter `DialogContent` sets for every dialog. Set `sm:max-w-*`
instead (`Questions.tsx`, `MyQuestions.tsx`).

## Lists whose length is data, not design

The rules above bound a component against the *viewport*. They say nothing about
a component bounded by **how many rows the API returned** — and that is the other
way a layout drifts out of shape. A facet list, a tag picker, a member list, a
notification tray: each looks fine with the seed data and gets taller every time
someone adds a row to a table.

Rule: **any list rendered from a collection that can grow gets its own capped,
scrollable region.** Not the page's scroll, not the panel's — its own.

- **Cap with `max-height`, not `height`.** A fixed height makes a three-option
  facet reserve six rows of dead space; a cap lets short lists hug their content
  and long ones scroll, while neither can change the parent's footprint.
- **Make the cap viewport-aware:** `min(rem, dvh)`, so it also shrinks on
  landscape phones and ~700px laptops where a rem-only value still overflows.
  Write the fallback pair — a `dvh` unit inside `min()` invalidates the whole
  declaration on browsers that lack it, which silently *uncaps* the list:

  ```
  max-h-60 supports-[height:100dvh]:max-h-[min(15rem,38dvh)]
  ```

- **Define the cap once, as an exported constant, and use it in every variant.**
  `FACET_LIST_MAX_HEIGHT` / `FACET_LIST_MAX_HEIGHT_COMPACT` in
  `facet-section.tsx` are the reference. Per-call-site max-height strings are how
  one variant ends up uncapped — the sidebar used to pass `""` on the theory that
  the panel's outer scroll would handle it, so on that one screen the growth
  problem was merely moved from the page to a 25-item scroll column.
- **Nested scroll regions need `overscroll-contain`.** These lists sit inside a
  panel that scrolls, inside a drawer that scrolls, inside the app scroll
  container. Without containment, a flick past the last row chains outward and
  moves the page behind the panel — on touch devices that reads as the app losing
  the user's place.
- **An outer viewport cap stays as the second line of defence**, for when several
  capped regions are open at once. It should not be the primary mechanism: it
  yields one long scrollbar over unrelated groups instead of a stable panel.
- **Keep search/filter controls outside the scroll region.** The whole point of a
  search box on a long list is that it stays reachable while you scroll it.
- **Label the region** (`role="group"` + `aria-label`) so its checkboxes announce
  as one named set rather than a loose run of controls.

## Safe areas (notches, home indicators)

`index.html` sets `viewport-fit=cover`; `.app-shell-viewport` pads left/right
with `env(safe-area-inset-*)`. If you ever add a fixed bottom bar, pad it with
`env(safe-area-inset-bottom)`.

## Layout patterns

- **Breakpoints:** Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280,
  `2xl` 1536). Design mobile-first: base classes are the phone layout,
  `sm:`/`lg:` add space and columns (e.g. the quiz grid:
  `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`).
- **Sidebars → drawers:** desktop-only sidebars are `hidden lg:block`; on
  smaller screens the same panel renders inside a `Sheet` (see the quiz filter
  panel). Shared panel component, two shells — never two implementations.
- **Exception: a shared child that owns live state.** The `hidden lg:block` /
  `lg:hidden` trick renders *both* trees in the DOM (CSS just hides one), which
  is fine for stateless panels but silently double-mounts a child that owns a
  live subscription (SignalR, a real-time chat, an open network query) — each
  hidden copy still runs its effects. When the child itself needs a different
  wrapper per breakpoint (e.g. chat as an always-open `Card` on desktop vs. a
  collapsible `Accordion` on mobile), branch with a JS `matchMedia` check
  instead, so only one copy ever mounts.
  *Better still, avoid needing the branch.* The multiplayer lobby used to do
  exactly this (a `useIsCompactLayout` hook picking the chat wrapper); the
  panel-board redesign gave chat one wrapper at every breakpoint and the hook
  was deleted. A layout that doesn't change the live child's shell is simpler
  than any correct way of switching it — reach for `matchMedia` only once
  you've established the two shells really must differ.
  **And when they must differ, hoist the live state instead of branching.**
  The lobby now *does* need two shells (desktop chat panel vs. a mobile drawer),
  and the answer wasn't to bring `useIsCompactLayout` back: `useLobbyChat` moved
  up into `MultiplayerLobbyPage`, so the only thing rendered twice is a
  stateless view. Moving the subscription up beats detecting the breakpoint —
  it's less code, it can't desync from the CSS that actually decides which shell
  is visible, and it degrades to "a duplicate DOM node" rather than "a dead
  subscription" if someone later changes the layout. See the lobby chat section
  in [`quiz/multiplayer.md`](quiz/multiplayer.md).
- **Drawers/dialogs on phones:** `DialogContent` now carries the phone sizing
  itself — `w-[calc(100%-2rem)] sm:w-full` (a 1rem gutter each side),
  `rounded-lg` at every width, and the dvh height cap with `overflow-y-auto`.
  Individual dialogs no longer need to remember any of it; a dialog that wants
  its own inner scroll region (`quiz-start-modal.tsx`) still works, because the
  inner region scrolls first.
  It was previously `w-full max-w-lg` with `sm:rounded-lg`, so **every** dialog
  rendered as a full-bleed, square-cornered rectangle touching both edges of a
  phone — it read as a broken page rather than an overlay. Sheets/drawers still
  cap with `max-w-[85vw]`.
- **Fluid type:** scale display text down on phones
  (`text-3xl sm:text-4xl md:text-5xl lg:text-6xl` on the Home hero) and let
  headline rows `flex-wrap` rather than overflow.
- **Touch targets:** interactive controls ≥ 36px tall (`h-9`), prefer 40–44px
  for primary actions on mobile.
- **Inputs must be ≥16px on phones, and check where the size actually comes
  from.** Below 16px, iOS Safari zooms the whole page when the field takes
  focus, and it does not zoom back out — the page is left scrolled and
  oversized. The shared fields handle this now: `Input`'s base classes and the
  textarea use `text-base sm:text-sm`, `FIELD_MODERN` uses
  `text-base sm:text-[15px]`, and `.minimal-input` is `font-size: 1rem`.

  > **The trap:** this rule was already written here, and `InputField` already
  > passed `text-base` — but the login/signup fields zoomed anyway for months.
  > They use `variant="minimal"`, whose styling is the plain `.minimal-input`
  > rule in `global.css`. That rule sits **outside Tailwind's layers**, so its
  > `font-size: 0.875rem` beat the utility class silently, along with the
  > `py-*`/`max-h-none` the same call site passed. A utility class is not proof
  > of anything if a plain-CSS rule also targets the element — check the
  > computed style, and put the fix where the losing declaration lives.

  > **The second trap:** the sweep above fixed the *shared* fields — `Input`,
  > `Textarea`, `FIELD_MODERN`, `.minimal-input`. A raw `<input>` written
  > inline imports none of that, so it keeps whatever `text-*` its author
  > typed. The lobby chat composer was a bare `<input className="… text-sm">`
  > and went on zooming for another two days. Grep for `<input` as well as for
  > the component when auditing this.
- **A zoomed page looks like a layout bug.** Once iOS has zoomed in on a focused
  field, the visual viewport is narrower than the layout viewport, so controls
  at the right-hand end of a row sit off-screen and the page scrolls
  horizontally. The reported symptom is "the send button is cut off"; the cause
  is the font size on the input next to it. Check for the zoom before you go
  looking for a flex/overflow mistake.
- **Phone keyboards label their own action key** — via `enterKeyHint`
  (`send`, `go`, `search`, `done`, `next`). Default is "return", which on a
  single-line field reads as "make a new line" and hides the fact that Enter
  submits. It is a label only: it changes nothing about what the key does, so
  the `onKeyDown` handler still has to exist. Set it on any input whose Enter
  key has a meaning.
- **Dialogs and drawers steal focus on open.** Radix focuses the first
  focusable descendant of `DialogContent`. If that's a text field, opening the
  overlay raises the keyboard — which on a height-capped drawer covers most of
  what the user opened it to read. Prevent it with
  `onOpenAutoFocus={(e) => { e.preventDefault(); contentRef.current?.focus(); }}`.
  Focus the content element rather than dropping focus entirely: Radix's
  Content carries `tabIndex={-1}`, and keeping focus inside the layer is what
  keeps the focus trap, Escape and screen-reader announcement working.
  Overlays you open *in order to* type (a search sheet, say) should keep the
  default.
- **Background effects** (`Squares`, `Prism`) are absolutely positioned inside
  the scroll container with `h-full` — one visible viewport, sized by the shell.
  Never `h-screen` (over-measures on mobile).
- **Building a "fits the viewport" screen takes two things, and both fail
  silently.**

  **1. `h-full` needs a *definite* ancestor height, and `min-h-full` is not
  one.** A percentage height resolves against the nearest ancestor with a real
  height. `.app-shell-viewport` is a genuine `100dvh` — but the layout wraps its
  children in `min-h-full flex-col` (deliberately: pinning it to `height: 100%`
  is what broke scrolling on tall pages, see the table below). `min-height: 100%`
  leaves the height `auto`, so **every `h-full` below that point computes to
  `auto`** and grows with content. No warning, no visual clue until something
  long enough shows up.
  A page that must cap at one screen therefore needs its own explicit height:
  `lg:h-[calc(100dvh-var(--header-height,4rem))]` — matching the scroll
  container's own `padding-top` — plus `lg:flex-none`, since an explicit height
  and `flex-1` fight over the same axis.

  **2. Then `min-h-0` at every level below it.** Grid and flex items default to
  `min-height: auto`, which floors them at content height — so a
  `minmax(0,1fr)` row or a `flex-1` child still grows instead of shrinking, and
  the overflow lands on the *page* rather than the inner scroll region you
  wanted. One missing link breaks the whole chain.

  *Worked example:* the multiplayer lobby. Shell sets the dvh height; the board
  is `lg:h-full` with rows `[auto, minmax(0,1fr)]`; the chat panel and its
  message list are `min-h-0` / `flex-1 min-h-0` the whole way down. It used to
  pin the message list to a hard-coded `lg:h-[17rem]` precisely *because* the
  chain wasn't there — and that pushed the board past the fold on a laptop.
  Fix the chain rather than guessing a pixel height.

  Check at a short desktop viewport (≈768px tall). It's easy to build one of
  these on a large monitor and never see the overflow. Known gap: an
  `EmailVerificationBanner` above the content adds height the calc doesn't know
  about, so an unconfirmed user can still get a small scroll.

## What changed in the July 2026 overhaul (and why)

| Where | Change | Why |
| --- | --- | --- |
| `global.css`, `layout.tsx` | `.app-shell-viewport` (dvh + safe areas); layout wrapper `height: 100%` → `min-h-full flex-col` | Wrapper pinned every page to exactly one viewport — `/choose-quiz` couldn't scroll; 100vh hid bottom content behind mobile browser chrome |
| `index.html` | `viewport-fit=cover` | Enables safe-area insets on notched phones |
| `src/lib/app-scroll.ts` (new) | Scroll-container helpers | One documented way to scroll the page; window scrolling is a no-op here |
| `common/Header.tsx` | Hide-on-scroll rewired from `window` to the app scroll container | The window listener never fired (dead code); header now auto-hides while scrolling down — meaningful screen space on phones |
| `Quiz-Selection.tsx` | Root `min-h-full` → `flex-1`; pagination uses `scrollAppToTop()`; filter Sheet capped at `max-w-[85vw]` | Percentage heights vs. the pinned wrapper broke scrolling; `window.scrollTo` was a no-op; fixed `w-80` overflowed 320–360px phones |
| `Home.tsx` | `min-h-screen` → `flex-1`; fixed `text-6xl` hero → fluid scale + `flex-wrap` | Hero overflowed phone widths; CTA sat below the visible viewport |
| `Game-Mode-Selection.tsx` | `h-full flex-1` → `flex-1` + padding | Fixed height clipped short landscape screens |
| Quiz taking (`quiz-interface`, `quiz-page`, `guest-quiz-page`, route wrappers) | `min-h-screen`/`h-screen` → `flex-1` | Double-counted the header and mobile chrome; submit button could fall below the fold |
| `quiz-results.tsx`, guest results wrapper | `h-screen` → `flex-1` | Same over-measuring |
| `quiz-filter-panel.tsx`, `quiz-start-modal.tsx` | vh caps → dvh pairs; modal body scrolls | Panels/dialogs taller than the visible viewport on phones |
| `background-squares.tsx` | Canvas `h-screen` → `h-full` | Sized by the shell, correct on mobile |
| `common/Header.tsx`, `HeaderComponent.tsx`, `DrawerFilled.tsx` | Grid `grid-cols-5` → flex row with absolutely-centered wordmark (hidden < sm); `h-14 sm:h-16`; safe-area padding; SoundToggle removed (sound lives in user settings — don't re-add); logged-out "or" hidden < sm | Fifth-width side zones wrapped the nav and collided with the wordmark on phones |
| `layout.tsx`, `Router.tsx` | New `headerBehavior="hidden"` — `/quiz/:quizId/play` renders no header | Immersive play: on phones the header ate a full row and pushed Submit below the fold |
| Gameplay components (`quiz-timer` md size, `question-card`, `question-display`, `quiz-interface`, `multiple-choice`, `true-or-false`, `quiz-submit-button`) | Compact base (phone) sizes: smaller timer, tighter padding/spacing (`space-y-3`, `p-2.5`, `py-3`), True/False side-by-side; `sm:` sizes unchanged | Goal: timer + question + options + Submit fit a ~660px phone viewport with no scrolling |
| `Game-Mode-Selection.tsx`, `mode-card.tsx` | Phone column capped at `max-w-xs`; cards compact (`p-4`, smaller chip/title) | Edge-to-edge full-height cards read as page sections, not tappable choices |
| `Login.tsx`, `Signup.tsx` (+ forms, `InputField`, `O2Button`, `SocialButtons`) | Wrapped in `.app-shell-viewport` (they render standalone, outside HomeLayout, and previously had NO scroll container — unreachable content on phones); hero hidden < sm (form owns the phone screen, no scrolling); controls in a static top row < lg (the absolute overlay overlapped the heading); compact inputs/note/spacing, fluid type | Standalone routes must provide their own scroll container — add `.app-shell-viewport` to any new one. Auth/utility pages aim for zero scrolling on phones |
| `Provider.tsx` loaders, `UtilityPages/*` (AccessDenied, NotFound, MainErrorFallback) | `h-screen`/`min-h-screen` → `.app-shell-viewport` centered card | Same standalone-route rule; loaders/error cards center in the real visible viewport |
| Shared components' size maps (`loading-wave` sizes, `Go-Back-Button` width, `ModeToggle`/auth buttons in header, Home hero stack) | Every fixed size gets a phone step (e.g. LoadingWave xl `text-3xl sm:text-5xl md:text-6xl`; GoBack `w-32 sm:w-48`; header `h-12 sm:h-16` with `h-8` controls); Home hero stacks `flex-col` below sm so the rotating word doesn't toggle between 1 and 2 lines | Rule: "responsive" means components genuinely shrink at phone widths — scrollability alone is not a fix. Size maps/variants must include base (phone) steps, not one fixed desktop size |

## What changed in the Aug 22 2026 pass

The AI generation wizard: a single card that is supposed to be answerable in one view, and
wasn't on a laptop. Reported as "I have to scroll on my laptop screen" — no width was involved,
which is what prompted the height variant.

| Where | Change | Why |
| --- | --- | --- |
| `tailwind.config.js` | New `short` screen: `{ raw: '(max-height: 860px)' }` | Width breakpoints can't express "wide but short". A 1440×800 laptop passed every `md:`/`lg:` check and still pushed Generate below the fold. See "Short viewports" above |
| `ai-quiz-wizard-view.tsx` | `short:` steps on page padding (`py-6`→`py-3`), header margins, `h1` size, and the card's `space-y`/`pt` | The chrome around the form was ~60px of the overflow on its own |
| `advanced-options.tsx` | `short:` steps on the section spacing, the `Details` heading, the grid `gap-y`, both column stacks, the Classification group, and the description textarea's `min-h` | The two-column form is the tallest element on the screen; its own gaps are where its height comes from |
| `question-type-options.tsx` | Rows `min-h-11`→`short:min-h-10`, `py-2.5`→`short:py-2`, tighter gaps | Three stacked 44px rows are the single biggest block in the right column. 40px stays inside the 40–44px band for primary controls — the floor is what matters, not the maximum |
| `question-count-stepper.tsx`, `generation-input.tsx` | `short:` padding step; lead question `text-xl`→`short:text-lg`; source textarea `min-h-[180px]`→`short:min-h-[132px]` | Small individually; the fix is cumulative by design — no single element was wrong |

Deliberately **not** done: hiding fields, collapsing the details form back behind a drawer, or
giving the card its own inner scroll. All three trade "scroll the page a little" for "can't see
the form at all", which is the trade the visible-form redesign was undoing in the first place.

## Backgrounded tabs & timers (mobile)

Mobile browsers freeze JS timers (`setInterval`/`setTimeout`) when the user
switches apps. Any gameplay countdown must therefore be **wall-clock based**:
anchor a deadline timestamp and derive the remaining time from `Date.now()` on
each tick and on `visibilitychange` — never decrement a counter per tick.
`QuizTimer` is the reference implementation. The server is the authority
either way: `SubmitAnswerService` grades from `CurrentQuestionStartTime`
regardless of what the client displayed, and `resolveAndResume` catches up
expired questions when a session is reopened after a full page reload.
`QuizTimer`'s full contract — anchoring rules, why its effect may only depend
on primitives, and the two bugs that established both — is in
[`quiz/quiz-timer.md`](quiz/quiz-timer.md). Read it before changing the
component; it has been broken twice by parent re-renders rather than by
anything in the timer itself.
Related design fact: the quiz does not advance while nobody's device is
polling — the next question's clock starts server-side when the question is
*served*, so returning after a break legitimately shows a fresh timer on a
freshly fetched question.

## What changed in the July 31 2026 pass

| Where | Change | Why |
| --- | --- | --- |
| `global.css` `.minimal-input` | `font-size` 0.875rem → **1rem**; `max-height` 2.25rem → 2.75rem | 14px made iOS Safari zoom on every login/signup field focus. The `text-base` on the call site was being silently overridden (see the trap note above); the height cap had to rise or the larger text clipped |
| `form/input.tsx`, `form/textarea.tsx`, `field-variants.ts` | `text-sm` → `text-base sm:text-sm`; `text-[15px]` → `text-base sm:text-[15px]` | Same zoom, every other field in the app. Phones get 16px, desktop keeps its denser size |
| `ui/dialog/dialog.tsx` | `w-full` → `w-[calc(100%-2rem)] sm:w-full`; `sm:rounded-lg` → `rounded-lg`; added dvh height cap + `overflow-y-auto` | Dialogs were full-bleed square rectangles on phones |
| `Login.tsx`, `Signup.tsx` | `px-5` → `px-6` on phones | Form ran almost edge to edge; now matches the dialog gutter |
| `UtilityPages/Error/*`, `NotFound-Content` | `max-w-xs sm:max-w-md`, reduced type/padding below `sm` | Rendered in the display font at desktop sizing, the error card filled a phone screen and read as a broken page |

## What changed in the Aug 2 2026 pass

All three were the same screen — the multiplayer lobby's mobile chat drawer —
and reported as three separate complaints.

| Where | Change | Why |
| --- | --- | --- |
| `lobby-chat-view.tsx` | Composer input `text-sm` → `text-base lg:text-sm` | A bare inline `<input>`, so the July 31 sweep over the shared field components never touched it. At 14px iOS zoomed on focus, and the zoom — not a flex bug — is what pushed the send button off the right edge. `lg:` rather than the usual `sm:` because this composer's mobile shell is the drawer, which is `lg:hidden` |
| `lobby-chat-view.tsx` | Added `enterKeyHint="send"`; send button `h-8 w-8` → `h-9 w-9 lg:h-8 lg:w-8` | The keyboard's return key read "return" on a single-line field, so the only discoverable way to send was a 32px icon — below the ≥36px touch-target rule |
| `mobile-chat-drawer.tsx` | `onOpenAutoFocus` prevented, focus moved to the drawer content | Radix focused the chat input on open, so opening chat raised the keyboard over a 70dvh drawer. Opening chat is "see what was said", not "type" |

## What changed in the Aug 5 2026 pass

Two threads. First, the `/choose-quiz` filter panel: the Category facet grows with
the categories table, so an expanded facet got taller with every seeded row. Then a
sweep of dashboard sizing inconsistencies — the shared search row, an over-wide
dialog, a hand-rolled spinner.

| Where | Change | Why |
| --- | --- | --- |
| `facet-section.tsx` | Exported `FACET_LIST_MAX_HEIGHT` / `…_COMPACT` (`max-h-60` + `min(15rem,38dvh)` pair) and made it the prop default | The cap was a per-call-site string, so each variant chose its own — and one chose none. A shared constant is the only version that can't drift |
| `quiz-filter-panel.tsx` | Sidebar/drawer/compact all pass the shared cap; the full-height sidebar no longer passes `""` | Uncapping the facets there just relocated the growth from the page into a single 25-row scroll column. Panel height is now a function of the layout, never of the row count |
| `facet-section.tsx`, `quiz-filter-panel.tsx` | Added `overscroll-contain` to both the facet lists and the sidebar's facet column | These scroll regions nest (list → panel → drawer → app container); a flick past the end chained outward and scrolled the page behind the panel |
| `facet-section.tsx` | Facet search input `text-sm` → `text-base sm:text-sm`; added `role="group"` + `aria-label` to each list | Another bare inline `<input>` the July 31 sweep missed — 14px, so iOS zoomed on focus (see "the second trap" above) |
| `lib/Search-Input.tsx` | Row is `flex w-full items-center gap-2`; field wrapper `relative min-w-0 flex-1`; button `shrink-0` | Two nested shrink-to-fit flex boxes meant the field sized to its content and left the panel row half empty — `.minimal-input`'s `width: 100%` was resolving against the shrink-wrapped parent, not the row. `min-w-0` is what lets a long placeholder shrink instead of pushing the button out |
| `global.css`, `lib/Search-Input.tsx` | New `.minimal-input--compact` / `--has-clear` modifiers (padding `0.75rem` → `0.5rem 0.625rem`; `font-size` 14px **only from `sm` up**) | The default minimal field is a ~44px control — right for a login form, oversized next to the filter panel's Select triggers. **The third instance of the layer trap:** a `py-2 text-sm` at the call site loses to plain-CSS `.minimal-input`, so the modifier lives next to the rule it overrides. Phones keep 16px (iOS zoom); both steps stay ≥36px |
| `lib/Search-Input.tsx` | `LiftedButton` → plain `Button size="icon"`; `onKeyPress` → `onKeyDown`; added `enterKeyHint="search"`, `aria-label` on both icon buttons; `className` finally forwarded | The lifted style's 4px edge reads as a primary page action and made the row look misaligned. `className` was in the props type but never destructured, so the `!my-0` five call sites passed had been doing nothing — the component's own `my-4` was the spacing all along |
| `Question/Questions.tsx`, `UserDashboard/MyQuestions.tsx` | Question-type dialog `w-fit` → `sm:max-w-sm` | `w-fit` fought the shared phone gutter and resolved back to `max-w-lg` anyway (the children are full-width), so a three-button chooser rendered 512px wide |
| `Create-Quiz-Form/create-quiz.tsx` | Question-type chooser `flex gap-4` → `grid grid-cols-1 gap-3 sm:grid-cols-3`; buttons get `outerClassName="w-full"` + `className="h-full w-full text-sm leading-tight"` | At ~500px the three buttons didn't scale down, they deformed: flex shrank their content boxes while the padding stayed, so labels wrapped mid-phrase at three different widths. Grid columns give one width for all three and stack below `sm`. See "Rows of buttons" above |
| `Create-Quiz-Form/create-quiz.tsx` | Hand-rolled `animate-spin rounded-full border-b-2` → shared `<Spinner size="lg" />` | A 64px circle with one 2px arc reads as a rendering glitch, and matched no other loader in the app |
| `ui/data-table.tsx` | Rows alternate `bg-primary/10` / `bg-muted` (was `bg-muted` / `bg-background/50`); header stays `bg-muted` | Borrows the Questions page's card tint so the quiz/user tables aren't pure greyscale. Tinting *every* row — two steps of the wash, the first attempt — was too much blue on pages whose only content is the table: spaced-out cards can carry a tint edge-to-edge rows can't |
| `ui/data-table.tsx` | Removed `position: relative` from header cells (was applied to every column except the first) | In a `border-collapse: collapse` table a positioned cell paints its own background **over** the row's collapsed border, so the header divider was crisp under column 1 and washed out under the rest. Nothing in a header cell is absolutely positioned — the class was vestigial. **General rule: don't put `relative` on a `th`/`td` whose row draws a border, unless a child actually needs it** |

## What changed in the Aug 23 2026 pass

The same screen as Aug 22, measured rather than estimated. On a 1525×730 viewport
`main.scrollHeight - main.clientHeight` was **174px**, and the Generate button was in
them. The Aug 22 pass had already spent its `short:` steps on the form; this one went
after the shell, which had never been looked at.

| Where | Change | Why |
| --- | --- | --- |
| `dashboard-layout.tsx` | New `focusPaths`: no nav rail **and** no header | The header is 77px of a 730px viewport and its content is a wordmark plus three buttons. Gated on the route having its own Back control — see "Focus mode" above |
| `dashboard-layout.tsx` | `main` padding `p-4 sm:p-6 lg:p-8` → `+ short:p-4` | Width steps only, so a wide-but-short laptop paid 64px vertical and nothing inside the page could reach it |
| `ai-quiz-wizard-view.tsx`, `own-ai-quiz-view.tsx` | Page padding `short:py-0`; the own-AI page got its first `short:` step at all | `main` already provides the gutter. The own-AI page had been missed entirely by the Aug 22 pass |
| `ai-quiz-wizard-view.tsx` | The `Separator` + own-AI link move into the Generate row; button gets `shrink-0`, the text cell `min-w-0` | ~40px to separate a footnote from the thing it footnotes. The `min-w-0`/`shrink-0` pair is the "Rows of buttons" rule — a long quota line was free to squeeze the button's label |
| `quota-note.tsx` | The model note ("Questions are written by …") removed | `quota.model` is a raw provider slug, and "which model made this quiz" is a question about a *saved quiz*, not about a form you are still filling in |
| `generation-input.tsx` | Topic field gets `enterKeyHint="go"` and an Enter handler | Enter did nothing and the phone keyboard said "return". Wired to the same guarded action as the button, so Enter can't skip validation. Deliberately **not** on the Source textarea, where Enter means "new line" |
| `ai-quiz-wizard-view.stories.tsx` | New `FitsTheFold` story: asserts ≥60px below Generate at 1525×730 | The fit is a number that can regress silently. Chromatic covers whether it looks right; this covers whether it is reachable |
| `.storybook/vitest.setup.ts` | Created | `vitest.workspace.ts` had referenced it since the test addon was added; the `storybook` project could never have run without it |
| `ai-quiz-wizard-view.tsx`, `advanced-options.tsx`, `own-ai-quiz-view.tsx` | A second round of `short:` steps: heading block margins, `h1` `text-xl`→`text-lg`, card `space-y`/`pt`, the `Details` heading `text-lg`→`text-base` | The shell work left Generate **30px** above the fold against a 60px requirement — measured by `FitsTheFold`, not estimated. The last 30 came from label furniture. The lead question was left at full size deliberately: it is the one required field and its weight is what says so |
| `own-ai-quiz-view.tsx`, `components/step-marker.tsx` | The three steps are numbered in place, starting at "Describe the quiz" | Not a responsive change, but it landed here: "Copy the prompt" was labelled `1.`, which made the first numbered thing on the page a button you can't usefully press yet. In-place markers rather than `common/Steps.tsx` — all three steps are on screen at once, and a top bar would have cost ~50px on a page with the same fold problem |

Deliberately **not** done, again: hiding fields or collapsing the details form. That is
now a recorded decision rather than a preference —
[`adr/0001-ai-generation-options-stay-visible.md`](adr/0001-ai-generation-options-stay-visible.md).

## Checklist for new pages/components

0. **This list applies to layouts, not just pages.** A shell that ignores it
   makes every page inside it wrong, and no amount of work inside the page can
   reach the chrome around it. See "The shells".
1. Page root: `flex-1` (fills screen, can grow). No `h-screen`, no `100vh`, no
   `height: 100%`. (`flex-1` does nothing under `DashboardLayout`, whose `main`
   is not a flex container — it is `HomeLayout` that needs it.)
2. Need to scroll programmatically? `src/lib/app-scroll.ts`.
3. Fixed-size overlays: `max-w-[85vw]` + dvh height cap + inner scroll.
   `Dialog` already handles its own phone gutter and height cap.
4. Mobile-first Tailwind; verify at 360px, 390px, 768px, and desktop.
5. Touch targets ≥ `h-9`; form inputs ≥ 16px font **on phones** — and confirm
   in devtools' computed styles, not by reading the class list. This applies to
   raw `<input>`/`<textarea>` elements too, not just the shared field
   components.
6. Any input whose Enter key submits: set `enterKeyHint`.
7. Any dialog/drawer that contains a text field: decide whether it should take
   focus on open, and pass `onOpenAutoFocus` if not.
8. Rendering a list from a table that will grow? Cap it and scroll it in place
   (`max-height` + `overflow-y-auto` + `overscroll-contain`), with the cap as a
   shared constant. Test with ~3 rows *and* ~50, not just today's seed data.
9. A row of two or more fixed-padding buttons? Give it a grid + a stacked
   breakpoint, not `flex` and hope. Check it at 360px *and* at an awkward
   in-between width like 500px — that's where flex shrink deforms rather than
   wraps. A text-plus-button row needs `min-w-0` on the text and `shrink-0` on
   the button for the same reason.
10. A screen that must fit one viewport? Assert it, don't eyeball it. `FitsTheFold`
   in `ai-quiz-wizard-view.stories.tsx` is the reference: a story pinned to the
   target viewport with a play function measuring the primary action's headroom.
   Height is the one property that regresses without producing an error.
