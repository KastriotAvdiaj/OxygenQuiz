# Responsive & Mobile Conventions

How this app stays usable from ~360px phones up to ultra-wide desktops, why the
architecture is the way it is, and the rules every new page/component must
follow. Written during the July 2026 mobile overhaul of the player flow.

## The scrolling model (read this first)

**The window never scrolls.** `html`/`body` are pinned (`overflow: hidden` in
`src/global.css`) and every route scrolls inside a single container rendered by
the layout (`src/layouts/layout.tsx`), styled by the `.app-shell-viewport`
class and identified by `APP_SCROLL_CONTAINER_ID` (`src/lib/app-scroll.ts`).

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

## Filling the screen: `flex-1`, not `h-screen`

Pages that want "at least one full screen" (hero/centered layouts: Home, mode
selection, quiz taking, loading/error screens) put **`flex-1` on their root**.
They are flex children of the layout's `min-h-full` column, so `flex-1` fills
the remaining visible viewport *minus the header padding* and can still grow
taller. `h-screen`/`min-h-screen` inside the shell is always wrong: it
over-measures on mobile **and** double-counts the fixed header.

Content-length pages (results, quiz catalogue) also use `flex-1` so their
background fills short screens, and simply grow past one viewport when needed.

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

## Backgrounded tabs & timers (mobile)

Mobile browsers freeze JS timers (`setInterval`/`setTimeout`) when the user
switches apps. Any gameplay countdown must therefore be **wall-clock based**:
anchor a deadline timestamp and derive the remaining time from `Date.now()` on
each tick and on `visibilitychange` — never decrement a counter per tick.
`QuizTimer` is the reference implementation. The server is the authority
either way: `SubmitAnswerService` grades from `CurrentQuestionStartTime`
regardless of what the client displayed, and `resolveAndResume` catches up
expired questions when a session is reopened after a full page reload.
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

## Checklist for new pages/components

1. Page root: `flex-1` (fills screen, can grow). No `h-screen`, no `100vh`, no
   `height: 100%`.
2. Need to scroll programmatically? `src/lib/app-scroll.ts`.
3. Fixed-size overlays: `max-w-[85vw]` + dvh height cap + inner scroll.
   `Dialog` already handles its own phone gutter and height cap.
4. Mobile-first Tailwind; verify at 360px, 390px, 768px, and desktop.
5. Touch targets ≥ `h-9`; form inputs ≥ 16px font **on phones** — and confirm
   in devtools' computed styles, not by reading the class list.
