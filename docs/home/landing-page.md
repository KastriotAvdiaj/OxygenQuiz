# Landing page (`/`)

**Breathe in questions. Breathe out answers.** A big two-line headline across the middle of the
screen, over a blue wave — and where the text crosses onto the wave, it turns white. Reworked
into this form on 2026-09-21 (see "How it got here").

## What's on it

- **The headline**, two lines, **each kept on one line** (`whitespace-nowrap`) — the second
  ("Breathe out answers.") a step smaller, at `0.72em`. Below `lg` it is sized so the longer
  line (~10.6× the font size) fits the viewport minus its padding; from `lg`, sized off the viewport (`clamp`, capped for ultra-wide screens)
  so it runs most of the width and crosses the wave's edge. "answers." is the theme blue on the
  page background and **amber** on the wave. The line plays on the name — Oxygen, breathing.
  It replaced the rotating "Sharpen your ___": a single, fixed line reads bolder at this size,
  and a changing word would make the two copies (below) harder to keep in step.
- **The subtitle**, in a muted diagonal gradient clipped to the text (white on the wave).
  `bg-clip-text` paints only over the element's background box, which ends at the line box, so the
  descenders of g/y/q were sliced off; bottom padding extends the box over them and an equal
  negative margin keeps the layout where it was.
- **Actions** (`hero/hero-actions.tsx`): three **flat pills** built on the shared `Button` — not
  `LiftedButton`, see below. **Play** is the big one (▶ icon, → `/choose-quiz`), and it is **always
  the inverse of the other two**: navy `foreground` with a white label in the light theme, white
  with a blue label in the dark one, where the secondaries are white and near-black respectively.
  That inversion is what makes it the primary action without a colour of its own. It steps up a
  size at `lg` and again at `xl`. The label stays **"Play"** (not "Play a quiz"): the ▶ and the
  header's "Play" already say what it does. Then an **"or"** divider, then two smaller outlined
  pills:
  - **Host a lobby** → `/multiplayer-menu`. Multiplayer needs an account — guests get one
    singleplayer quiz and no multiplayer ([`../auth/guest-play.md`](../auth/guest-play.md)).
  - **Create a quiz** opens the same manual-or-AI chooser as the user dashboard
    (`CreateQuizMethodDialog`, user-dashboard routes; logged-out visitors are sent to login and
    back). A small **"AI"** tag (primary pill, ringed in the page colour so it
    cuts out from the page or the wave) is pinned to its top-right corner, **on the button itself**, so the AI option is visible before the
    chooser opens. It replaced a rotated, bobbing "With AI" speech bubble that read as a
    notification floating above the button rather than part of it.
  All three share one pill shape, a colour change on hover, a small press (`active:scale-[0.98]`)
  and a `foreground` focus ring — the shared `Button`'s own `--ring` is close to the wave's blue
  and disappeared on it.

### Why they are flat

They were `LiftedButton`s (the 3D "pushable" button used across the app) until 2026-09-22. That
button draws its edge and shadow by *darkening its own colour*, which works for the theme blue and
not for a near-black or white face: every attempt at a visible edge here was either invisible in
the light theme or an ornament in its own right (a bright blue ledge, a translucent shadow). Flat
pills on a flat wave — shape, size and contrast carry the hierarchy instead. `LiftedButton` is
unchanged and still used everywhere else.

### Why Play isn't amber any more

It was amber (`cta`) with a white label until 2026-09-22 — white on that yellow is ~1.7:1, held
together by a text shadow. Four treatments were rendered side by side in both themes: amber with
the headline's navy ink (legible, but the owner's read was that the warm accent didn't sit with the
rest of the page), navy in both themes (in the dark theme it is nearly the secondaries' colour),
white in both themes (in the light theme, likewise), and the inversion that shipped. The `cta`
token stays — "answers." still turns amber on the wave — but nothing else uses it now.

## The wave

A filled SVG path in the theme's primary colour, stretched to the page with
`preserveAspectRatio="none"`. Inline SVG rather than CSS: a `clip-path` polygon can't draw the
curve, and a CSS `path()` is in absolute pixels, so it wouldn't stretch with the page. Two
shapes (`hero/wave-shapes.ts`): the desktop swoosh from the owner's sketch (`lg` up), and a
portrait version below `lg` that swoops down **through the middle of the screen**, so it crosses
the headline and the colour change shows on phones too (a flat band along the bottom never
reached the text). The page root is `overflow-hidden` so the wave never adds a
scrollbar.

## Text that changes colour on the wave

The pitch is rendered **twice**, in identical layout:

1. The **base copy**, normal colours, in flow. It is the real one — links and buttons live here.
2. An **inverse copy** on top — **white in the light theme, near-black in the dark theme** (the
   dark page background colour, so it reads as a cut-out) — masked to the wave with CSS `mask-image`. The mask is the
   wave's own path as an SVG data URL, stretched by `mask-size: 100% 100%` exactly as the drawn
   wave is stretched by `preserveAspectRatio="none"` — so it shows only on the wave, and there it
   covers the base copy. Both the drawn wave and the mask read the path from one constant
   (`WAVE_DESKTOP` / `WAVE_MOBILE`), so they can't drift apart.

The inverse copy is decorative: `aria-hidden`, no pointer events, and its buttons are invisible
placeholders, so the real buttons (which read on both backgrounds) show through. **The one rule
when editing `Pitch`:** every layout class must stay the same in both variants — only colours may
differ — or the white copy stops lining up with the real one.

## Entrance

On **every** visit to `/`: the wave fades in, then the pitch rises in line by line. The wave **fades**
rather than slides: moving it would drag it out from under its own mask. Constant speed (`linear`).
Timings live in `INTRO` in `use-landing-intro.ts`. Off under `prefers-reduced-motion` (on
Windows, turning off "Animation effects" sets it). Until 2026-09-21 a `sessionStorage` flag
limited it to the first visit per browser tab — so in production a reload or a click on Home
showed the page at rest and the entrance looked broken. At under a second it isn't worth hiding.

**Why a loading screen shows before this static page:** the page itself makes no requests, but
the app shell does. `AuthLoader` (`src/Provider.tsx`) holds the whole app — every route, this one
included — on `GET /Authentication/me`; for a signed-out visitor that 401s and the API client then
tries `POST /Authentication/refresh` before giving up, so two API round trips come first. Only
after that do the lazy `layout` and `Home` chunks start downloading. `PageLoading` stays hidden
for the first 140ms, so a fast answer shows nothing; a slow API shows "Signing you in".

## Files

| File | What |
|---|---|
| `src/pages/Home/Home.tsx` | Composition: the wave, the page copy, the masked wave copy |
| `src/pages/Home/hero/pitch.tsx` | Headline, subtitle, actions — one component, two tones |
| `src/pages/Home/hero/hero-actions.tsx` | Play / or / Host a lobby / Create a quiz + "AI" tag |
| `src/pages/Home/hero/tone.ts` | `HeroTone` (`"page"` / `"wave"`) and the on-wave text colour |
| `src/pages/Home/hero/wave-shapes.ts` | The two wave paths and the masks built from them |
| `src/pages/Home/hero/wave.tsx` | The drawn wave |
| `src/pages/Home/use-landing-intro.ts` | `INTRO` timings, `riseIn` / `fadeIn`, reduced-motion check |

## How it got here

Three versions came first. Recorded so they aren't re-proposed from scratch.

1. **The astronaut hero** (2026-09-19). A dark-only scene: a flat vector astronaut on an SVG
   planet horizon. Reverted — the astronaut was decoration unrelated to the product, and the
   hand-drawn planets read as clip-art beside it.
2. **The Kumo wheel** (2026-09-19/20). A real sample question in the centre, answered in one tap,
   with eight categories on a spinning ring around it. Replaced — too much to take in at once.
3. **The two-column demo** (2026-09-20). The pitch on the left, the sample question in a card on
   the right, category chips under it. Replaced (2026-09-21) — the owner's judgment was that a
   playable question isn't the format that fits what the landing page is for.

Things the sample question left behind in the shared gameplay components, still in use by real
quizzes: `submitOnSelect` (unused now, harmless), `textSizeClassName` on `QuestionCard`, the
snappier option hover, and the true/false restyle (smaller, same surface as multiple choice, no
check/cross icons). And `/choose-quiz?category=<name>` — see
[`../quiz/quiz-discovery.md`](../quiz/quiz-discovery.md).
