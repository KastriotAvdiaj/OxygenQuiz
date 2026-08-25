# 2. Quiz creation routes render without the dashboard header

Date: 2026-08-23
Status: Accepted

## Context

The AI quiz wizard overflows a laptop viewport. Measured on a 1525×730 CSS-pixel
window (a 15" 1920×1080 laptop at 125% scaling):

```
viewport            730
DashboardHeader      77
main clientHeight   653
main scrollHeight   827   →  174px of overflow
```

The Generate button is in those 174px. The primary action of the screen is below the
fold on an ordinary laptop.

The wizard's own markup is not the cause. It received about a dozen `short:` density
steps in the Aug 22 2026 pass (`docs/RESPONSIVE.md`). The shell around it received
none: `layouts/dashboard-layout.tsx` predates the July 2026 responsive overhaul and
follows none of it. Of the ~168px of chrome above and below the form, essentially all
of it is fixed-size — a `text-5xl` wordmark in a 77px header, and `main`'s `lg:p-8`.

What is available, against the 174px needed:

| lever | px |
|---|---|
| hide the header on these routes | 77 |
| `main` padding gets a `short:` step (64 → 32 vertical) | 32 |
| wizard root `short:py-3` → `short:py-0` (`main` already gutters) | 24 |
| move the `Separator` + own-AI link out of the card foot | ~40 |

**No single lever is sufficient.** Shrinking the header rather than hiding it yields 21,
not 77. Hiding it and doing nothing else yields 77 of the 174. And a plan that lands at
exactly 174 still fails for an unverified user (`EmailVerificationBanner`), for anyone
showing `GenerateErrorPanel`, and for anyone who has picked a display font in Settings —
so the target carries a margin (see §Decision).

Hiding fields is not available: ADR 0001 forbids it.

There is precedent on both sides of this. `HomeLayout` already has
`headerBehavior="hidden"` for `/quiz/:quizId/play`, on the reasoning that an immersive
route should own every pixel. And `DashboardLayout` already treats
`/dashboard/quizzes/create-quiz*` and `/my-dashboard/quizzes/create*` as special —
`fullWidthPaths` hides the nav rail for exactly these routes.

## Decision

The **AI** quiz creation routes render with no dashboard header, via a new `focusPaths`
list on `DashboardLayout` — a stricter case of `fullWidthPaths` (no nav rail *and* no
header), with `main` picking up a `short:p-4` step at the same time.

**A route may only enter focus mode if it has its own in-page way back.** Removing the
header removes Back, Home, the theme toggle and the account button in one go. This
document first said "the `fullWidthPaths` branch becomes focus mode", which was wrong:
that branch also covers the manual creator and the edit form, and **neither has a Back
control of its own** — `create-quiz.tsx` only navigates programmatically after a save or
cancel, and `edit-quiz.tsx` has nothing at all. Applying focus mode there would have left
those two pages with the browser's Back button and nothing else.

So `focusPaths` lists the two AI paths only:

```
/dashboard/quizzes/create-quiz/ai
/my-dashboard/quizzes/create/ai
```

Both AI views carry their own `ArrowLeft` Back control, which is what qualifies them.
The manual creator and the edit form keep the header until they grow one — at which
point adding their path to `focusPaths` is the whole change.

The acceptance target for these routes is: **the Generate button's bottom edge is visible
at a 730px viewport with at least 60px to spare**, measured in the default app font with
no verification banner. The margin is the point — it is what absorbs the banner, an error
panel, and a user-selected display font.

## Consequences

- **Home, the theme toggle and the account button are unavailable** for the duration of a
  creation flow. Browser Back, the in-page Back button and `?settings=` (the
  `AccountOverlay` is shell-mounted, so it opens from any URL) remain.
- **The wizard's in-page Back button is now load-bearing and may not be deleted.** It was
  a duplicate of the header's Back; with the header gone it is the only in-page escape.
  Anything that removes it must restore a header first.
- **The dashboard now looks different between manual and AI creation** — one has a header,
  the other doesn't. That inconsistency is accepted for now and is the visible form of the
  precondition above; it resolves by giving the manual and edit forms their own Back
  control, not by taking the AI routes' focus mode away.
- **The own-AI page's Back goes to the wizard, not to the quiz list**, so leaving that page
  entirely is two hops. That is deliberate (its Back means "back to generating"), but it is
  worth re-checking if focus mode ever makes that page a common entry point.
- Header removal buys 77 of the 174px. The rest comes from spacing and from moving the
  own-AI link — **not** from hiding fields (ADR 0001) and not from a deep type cut.
- The 60px margin is a number, so it is testable and can regress silently. It gets a
  Storybook play-function assertion at 1525×730 rather than a reviewer's judgement.
- This does not fix `DashboardLayout`'s deeper problems — `h-screen`, no
  `.app-shell-viewport`, and a dead `APP_SCROLL_CONTAINER_ID` that no-ops
  `scrollAppToTop()` on every dashboard route. Those are logged in
  `docs/deployment/known-issues.md` and ship separately, because they change which
  element scrolls on every dashboard page.
