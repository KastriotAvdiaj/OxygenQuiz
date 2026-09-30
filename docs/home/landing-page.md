# Landing page (`/`)

**Breathe in questions. Breathe out answers.** A big two-line headline across the middle of the
screen, a subtitle and the actions, on the plain page background. Reworked into this form on
2026-09-21; the blue wave behind it was removed on 2026-09-28 and Play went back to the old
"Explore" button (see "How it got here").

## What's on it

**The whole page is DynaPuff**, regardless of the font a user picked in their settings
(`src/lib/fonts.ts`): `Home.tsx` pins `--font-app` and `--font-quiz` to DynaPuff on its root and
sets `font-quiz` there. The header, and dialogs opened from the page (they portal out of it), keep
the user's own fonts.

- **The headline**, two lines, **each kept on one line** (`whitespace-nowrap`) — the second
  ("Breathe out answers.") a step smaller, at `0.72em`. Below `lg` it is sized so the longer
  line (~10.6× the font size) fits the viewport minus its padding; from `lg`, sized off the viewport (`clamp`, capped for ultra-wide screens)
  so it runs most of the width. "answers." is the theme blue. The line plays on the name —
  Oxygen, breathing. It replaced the rotating "Sharpen your ___": a single, fixed line reads
  bolder at this size.
- **The subtitle**, in a muted diagonal gradient clipped to the text.
  `bg-clip-text` paints only over the element's background box, which ends at the line box, so the
  descenders of g/y/q were sliced off; bottom padding extends the box over them and an equal
  negative margin keeps the layout where it was.
- **Actions** (`hero/hero-actions.tsx`) — all three are **the old landing page's "Explore"
  button**: a `LiftedButton` with a square face (`rounded-none`) inside a frame of its edge
  (`p-2` on the outer button), restored on 2026-09-28. The original was
  `components/choose-quiz-dialog.tsx`, deleted on 2026-09-21:
  `git show c7ef0452^:src/pages/Home/components/choose-quiz-dialog.tsx`.
  - **Play** (→ `/choose-quiz`), big and in the theme blue, with a filled ▶. Fluid size, `text-xl`
    on a phone up to `text-5xl` at `lg` (a fixed `text-5xl` dwarfed phones — docs/RESPONSIVE.md),
    and wider than Explore was (`px-8` → `lg:px-16`). Like Explore, it greys out while the quiz
    list is loading.
  - An **"or"** divider, then the same button **a size down** (`SecondaryButton`: `p-1` frame,
    `text-sm`/`sm:text-base`), each with an icon:
    - **Host a lobby** → `/multiplayer-menu`, in **muted greys** (`bg-muted` face,
      `muted-foreground` edge). Multiplayer needs an account — guests get one singleplayer quiz
      and no multiplayer ([`../auth/guest-play.md`](../auth/guest-play.md)).
    - **Create a quiz**, in **green** (`quiz-success` face and edge), opens the same
      manual-or-AI chooser as the user dashboard (`CreateQuizMethodDialog`, user-dashboard
      routes; logged-out visitors are sent to login and back). A **"With AI" speech bubble** (primary,
      with a tail pointing down at the button — a CSS border triangle) sits over its top-right
      corner, inside the button's face so it lifts and presses with it; the AI option is visible
      before the chooser opens. It replaced a flat "AI" tag pinned to the corner, and before that
      a rotated, bobbing "With AI" bubble that read as a notification floating above the button
      — same words, but this one is still and anchored to the button by its tail.
  Size and colour carry the hierarchy: one big blue button, two small ones in quieter colours.

- **The globe** (`hero/line-globe.tsx`), a background rising behind the secondary buttons — see below.

### Why Play was flat for a week (2026-09-22 → 09-28)

With the wave behind the page, Play had to read on blue as well as on the page, so it became a
flat pill that was always the inverse of the secondaries (navy/white in light, white/blue in dark):
`LiftedButton` draws its edge by darkening its own colour, which works for the theme blue but not
for a near-black or white face. Before that it was amber (`cta`) with a white label (~1.7:1,
held up by a text shadow). With the wave gone, a blue `LiftedButton` reads fine, so the owner
asked for the old Explore look back, and the secondaries followed it. The `cta` token is
unused now.

## The globe

A line drawing of the Earth behind the bottom of the page: its outline, a faint 10° grid, and the
land filled with the primary colour at 45% (`LAND_FILL_OPACITY`) with a slightly stronger coastline.
It is a **background**: out of flow (`absolute`, `z-0`, the pitch sits in a `z-10` wrapper), so it
never moves anything, and the page root's `overflow-hidden` clips what falls below the fold.
Decoration only: `aria-hidden`, no pointer events, unselectable.

- **Placement** (`Home.tsx`): the top of its circle meets the middle of the secondary buttons'
  row (`data-globe-anchor` in `hero-actions.tsx`, measured from layout offsets so the pitch's
  rise-in transform doesn't skew it). Its diameter is the larger of 2.3× the room below that row
  and 60% of the page's width, within 360–1100px — so on a phone roughly half of it shows, and on
  a wide, short screen it is a broad dome. Re-measured on resize. Strokes are
  `non-scaling-stroke`, so they stay a pixel or so thick at any size.
- **Motion**: it waits until the pitch has finished rising in (`PITCH_SETTLED_SECONDS`, ~1.05s)
  — while the buttons fade in they are see-through, and a globe popping in behind them looked as
  if it were on top of them. Then it pops in (60% → full size over 0.6s) with a half-turn spin
  that decays into a slow, endless drift of 6°/second. The view is centred at 15°S so the visible
  top band is the land-heavy northern mid-latitudes. Under reduced motion it is drawn once and
  never moves.
- **Drawn with d3-geo** (`geoOrthographic`) from Natural Earth's 1:110m land outlines
  (`world-atlas/land-110m.json`, ~55KB TopoJSON, turned into GeoJSON by `topojson-client`).
  Each frame writes the two paths' `d` straight onto the DOM — no React state per frame.
- **Loaded after the pitch.** `pitch.tsx` imports the component with `React.lazy`, and the map
  data is a dynamic import of its own, so the headline and buttons never wait on them. A
  same-sized placeholder holds its space while it loads, and the outline circle draws before the
  coastlines arrive.
- **Why this one** (2026-09-29): three were prototyped side by side — a book that opened and
  turned three pages, a flat blue-and-green desk globe on a stand, and this line globe. The book
  didn't read well; the owner picked the line globe as the most minimal. Lottie files were
  considered and passed over: a player library plus an illustrated style that can't follow the
  theme or dark mode.
- `world-atlas.d.ts` declares the JSON import, since the app's tsconfig has no
  `resolveJsonModule`.

## Entrance

On **every** visit to `/`: the pitch rises in line by line (headline, subtitle, actions).
Constant speed (`linear`).
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
| `src/pages/Home/Home.tsx` | Composition: the pitch on the page background |
| `src/pages/Home/hero/pitch.tsx` | Headline, subtitle, actions |
| `src/pages/Home/hero/hero-actions.tsx` | Play / or / Host a lobby / Create a quiz + "With AI" bubble |
| `src/pages/Home/hero/line-globe.tsx` | The line globe (d3-geo, lazy) and `world-atlas.d.ts` for its data |
| `src/pages/Home/use-landing-intro.ts` | `INTRO` timings, `riseIn`, reduced-motion check |

## How it got here

Three versions came before this one, and the page then lost its wave. Recorded so they aren't
re-proposed from scratch.

1. **The astronaut hero** (2026-09-19). A dark-only scene: a flat vector astronaut on an SVG
   planet horizon. Reverted — the astronaut was decoration unrelated to the product, and the
   hand-drawn planets read as clip-art beside it.
2. **The Kumo wheel** (2026-09-19/20). A real sample question in the centre, answered in one tap,
   with eight categories on a spinning ring around it. Replaced — too much to take in at once.
3. **The two-column demo** (2026-09-20). The pitch on the left, the sample question in a card on
   the right, category chips under it. Replaced (2026-09-21) — the owner's judgment was that a
   playable question isn't the format that fits what the landing page is for.
4. **The wave** (2026-09-21 → 09-28). A filled primary-colour SVG swoosh behind the pitch
   (`preserveAspectRatio="none"`, a portrait shape below `lg` so it crossed the headline on
   phones), with the pitch drawn **twice**: the real copy, and a recoloured copy masked to the
   wave's exact path (CSS `mask-image`, the same path as a data URL) so the text turned white —
   near-black in the dark theme — where it crossed onto the blue, and "answers." turned amber.
   The wave copy was decorative (`aria-hidden`, its buttons invisible placeholders), and every
   layout class had to match between the copies or the white text stopped lining up. Removed at
   the owner's request; `wave.tsx`, `wave-shapes.ts` and `tone.ts` are in `_to_delete/wave/`.

Things the sample question left behind in the shared gameplay components, still in use by real
quizzes: `submitOnSelect` (unused now, harmless), `textSizeClassName` on `QuestionCard`, the
snappier option hover, and the true/false restyle (smaller, same surface as multiple choice, no
check/cross icons). And `/choose-quiz?category=<name>` — see
[`../quiz/quiz-discovery.md`](../quiz/quiz-discovery.md).
