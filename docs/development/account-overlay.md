# Account & Settings Overlay

The Discord-style panel that holds a user's account details, play stats and app
settings. It opens on top of whatever page you're on instead of navigating you into the
dashboard.

## Why it exists

"My Profile" used to route to `/my-dashboard/profile`, which yanked you out of whatever
you were doing and into a different section of the app to read your own username. The
dashboard is a *workspace* — your quizzes, your questions, your reports. Account details
and preferences aren't workspace tasks; they're things you check in passing and dismiss.
An overlay matches that: it appears over your current context and returns you to it.

## How it opens: a query param, not a path

The overlay is driven by `?settings=<section>` — e.g. `/choose-quiz?settings=appearance`.

This is deliberate, and it's the one place the implementation deviates from what you'd
expect ("surely it should be `/settings/appearance`"):

The app uses a **data router** (`createBrowserRouter`). There, the matched route owns the
whole screen, so a path-based modal route would unmount the page you opened it from —
leaving nothing behind the scrim, which defeats the point. React Router's standard modal
trick (`location.state.backgroundLocation`, rendering two route trees) needs
`<Routes>`-style rendering that a data router doesn't do. A search param changes the URL
*without* changing the match, so the page underneath stays mounted and visible.

Everything a path route would have bought us still holds:

| Property | How |
|---|---|
| Shareable / deep-linkable | The param is in the URL |
| Back button closes it | Opening pushes a history entry |
| Unsaved-changes guard works | Open and close are navigations, so `useBlocker` still fires |
| Pretty URLs | `/settings` and `/settings/:section` exist as redirects |

Section switches use `replace: true` — Back should leave the overlay, not walk you
backwards through every section you clicked.

State lives in `use-account-overlay.ts`; nothing else reads the param directly.

## Where it's mounted

The overlay renders from the **shells**, not from a route:

- `src/layouts/layout.tsx` (`HomeLayout`) — the public/player shell
- `src/pages/AppRoot.tsx` — the dashboard shell

Both, because they're separate layouts and the overlay has to be reachable from either.
It returns `null` unless the param is set, so the cost of mounting it twice is nil.

## Responsive behaviour

Follows [RESPONSIVE.md](../RESPONSIVE.md). Two shells, one set of panels — the same rule
that doc sets for sidebars becoming drawers:

- **≥ md** — two panes: sidebar always visible, panel on the right.
- **< md** — a **drill-down**. `?settings=menu` shows the section list full-screen;
  picking one swaps to that panel with a back arrow. A 220px sidebar plus a content pane
  on a 360px screen leaves neither usable, so we don't try.

Specifics worth keeping:

- **`dvh`, never `vh`** — `h-[100vh] supports-[height:100dvh]:h-[100dvh]`, the fallback
  pair the doc requires. With `vh` the save bar sits under the mobile browser chrome.
- **Inner scroll** — the content pane owns `overflow-y-auto`; the dialog itself never
  grows. Long panels scroll instead of pushing the save bar off-screen.
- **Safe areas** — the sidebar and the save bar pad with
  `max(0.75rem, env(safe-area-inset-bottom))` so the home indicator doesn't cover them.
- **Touch targets** — nav rows are `min-h-11` (44px).
- **Full-bleed on phones, centred on desktop** — edge-to-edge and square-cornered under
  `sm`, then `sm:max-w-5xl sm:rounded-xl` with a `4rem` viewport inset.
- The save bar is **sticky inside the pane**, not `fixed` to the viewport, so it can't
  escape the dialog.

## Sections

`overlay-sections.ts` is the single source of truth — the sidebar, the mobile list, the
panel switch and URL validation all read it, so adding a section is a one-line change.
An unrecognised `?settings=` value falls back to the menu rather than 404-ing.

| Group | Sections |
|---|---|
| User | My Account, Quiz Stats |
| App Settings | Appearance, Typography, Audio, Quiz, Notifications |

Icons come from the same lucide outline family as `DashboardNav` and the account drawer.

## Settings state

`useSettingsForm.ts` (extracted from the old standalone page) owns the draft, dirty
tracking, save and discard. The **overlay** calls it once and passes the API down to each
settings panel.

That's the important bit: one draft for the whole overlay. If each panel owned its own
copy, "unsaved changes" would only ever mean "unsaved changes in the section you happen
to be looking at", and switching sections would silently drop edits.

The guard has two layers, both inherited from the old page:

- `useBlocker(isDirty)` — catches in-app navigation *including closing the overlay*, and
  offers save / discard / stay.
- `beforeunload` — the browser's own prompt for tab close and refresh.

Logging out calls `discard()` first, so signing out mid-edit doesn't trip the guard.

## What this replaced

| Old | Now |
|---|---|
| `/my-dashboard/profile` | redirects → `/my-dashboard/quizzes?settings=account` |
| `/my-dashboard/settings` | redirects → `/my-dashboard/quizzes?settings=appearance` |
| `/my-profile` | redirects → `/?settings=account` |
| — | `/settings`, `/settings/:section` as pretty entry points |

Redirects target a *concrete* page, never `/my-dashboard` itself: that path has an index
redirect which would drop the query string and close the overlay the instant it opened.

The dashboard's own nav lost its Profile and Settings entries — it keeps only genuine
workspace pages (My Quizzes, My Questions, Reports) — and the index route now lands on
`/my-dashboard/quizzes` instead of the retired profile page.

These files are dead and can be deleted (left as stubs only because the tooling that made
the change couldn't remove files):

```
src/pages/UserRelated/SettingsPage/Settings.tsx
src/pages/UserRelated/Profile/ProfileWrapper.tsx
src/pages/UserRelated/Profile/MyProfile.tsx
src/pages/UserDashboard/MyProfile.tsx
```

`ProfileView.tsx` is **not** dead — `UserProfile.tsx` still renders it for the public
profile at `/users/:userId`.

## Key files

| Concern | File |
|---|---|
| Shell, panes, save bar, guards | `src/pages/UserRelated/AccountOverlay/AccountOverlay.tsx` |
| URL state | `.../AccountOverlay/use-account-overlay.ts` |
| Section registry | `.../AccountOverlay/overlay-sections.ts` |
| Legacy/pretty URL redirects | `.../AccountOverlay/SettingsRedirect.tsx` |
| Panels | `.../AccountOverlay/panels/*` |
| Settings draft state | `src/pages/UserRelated/SettingsPage/useSettingsForm.ts` |
| Settings section UIs (unchanged) | `src/pages/UserRelated/SettingsPage/components/*` |
| Mount points | `src/layouts/layout.tsx`, `src/pages/AppRoot.tsx` |
| Entry point | `src/common/Custom-Drawer/drawer.links.tsx` |

Stats and history inside the overlay reuse the hooks and components documented in
[user-stats-history.md](../quiz/user-stats-history.md).
