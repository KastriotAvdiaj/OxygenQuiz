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
- **Drawers/dialogs on phones:** cap width with `max-w-[85vw]` and height with
  the dvh pair + inner `overflow-y-auto`, so content scrolls instead of pushing
  actions off-screen (`quiz-start-modal.tsx`).
- **Fluid type:** scale display text down on phones
  (`text-3xl sm:text-4xl md:text-5xl lg:text-6xl` on the Home hero) and let
  headline rows `flex-wrap` rather than overflow.
- **Touch targets:** interactive controls ≥ 36px tall (`h-9`), prefer 40–44px
  for primary actions on mobile. Inputs use ≥16px font (`text-base`/`text-lg`)
  so iOS doesn't zoom on focus.
- **Background effects** (`Squares`, `Prism`) are absolutely positioned inside
  the scroll container with `h-full` — one visible viewport, sized by the shell.
  Never `h-screen` (over-measures on mobile).

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

## Checklist for new pages/components

1. Page root: `flex-1` (fills screen, can grow). No `h-screen`, no `100vh`, no
   `height: 100%`.
2. Need to scroll programmatically? `src/lib/app-scroll.ts`.
3. Fixed-size overlays: `max-w-[85vw]` + dvh height cap + inner scroll.
4. Mobile-first Tailwind; verify at 360px, 390px, 768px, and desktop.
5. Touch targets ≥ `h-9`; form inputs ≥ 16px font.
