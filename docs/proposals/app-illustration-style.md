# Proposal: one illustration style across the app

**Status: open.** Nothing decided. Written 2026-10-10. Parked on purpose: the quiz home page's
drawn category art stays as it is until a direction is chosen.

## 1. What exists today

- **The landing page's line globe** (`src/pages/Home/hero/line-globe.tsx`, [`../home/landing-page.md`](../home/landing-page.md),
  "The globe"): grid and coastlines drawn in code with d3-geo, in the theme blue.
- **The quiz home page's four category drawings** (`src/pages/Quiz/Featured/art/`,
  [`../quiz/featured-quizzes.md`](../quiz/featured-quizzes.md), "The drawings"): hand-written SVG
  components in the globe's style, sharing the stroke rules in `art/strokes.ts` (`currentColor`
  at 70 / 45 / 18 %, amber `cta` accents, `non-scaling-stroke`). They replaced Unsplash photos on
  2026-10-08.
- **Per-quiz images** (`imageUrl` on the quiz card): whatever the author uploads. No style applies.

## 2. The problem

The line style works, but every new picture is a component written by hand: General Knowledge,
Science and History each took a long iteration in the app, and there is no outside source that
already draws this way. A fifth category, empty states or achievements would each need the same.
The question is whether to keep this style and make it cheaper to produce, or pick a style that
an existing library or generator already covers at scale.

What the current approach gets right, and any replacement should be weighed against:

- **Follows the category colour and dark mode for free**: the lines are `currentColor` on the
  panel's `--panel`, so an admin's palette change reaches the art with no new asset.
- **No downloads**: code, not image files; nothing to size, lazy-load or `srcset`.

## 3. Options

Consistency comes from drawing everything from one source, so the main test of each option is
whether it covers every subject a quiz category could need.

| Option | Sources | Follows theme / category colour | Coverage | Notes |
|---|---|---|---|---|
| **A. Keep the line style, feed it from icon sets** | Lucide, Tabler (MIT, real strokes, already `currentColor`); SVG Repo / Noun Project filtered to line style | Yes, as today | Very large, but object-level: scenes are composed from several icons | Needs a clean-up script: strip colours, apply `LINE`/`FILL`/`FAINT`, add `non-scaling-stroke`, SVGO. Many "outline" sets (Phosphor, Font Awesome) are filled shapes and won't take the stroke rules. |
| **B. 3D "clay" objects** | Microsoft Fluent Emoji 3D (MIT, ~1,500 objects), 3dicons.co (CC0) | No: fixed-colour PNGs | Emoji covers nearly any quiz topic | Playful, game-like; matches `LiftedButton`. Adds image files back. |
| **C. Flat, one accent colour** | unDraw (free, no attribution), Storyset (attribution on free tier) | Accent chosen at download; SVG, so could be wired to a token | Large, people-and-scene heavy | Common SaaS look. |
| **D. One artist's illustration set** | Blush, Streamline illustration sets | Partly (recolourable in their editors) | Large per set | Most distinctive; good sets are paid. |
| **E. A custom generated style** | Recraft (custom style from reference images, SVG output); Illustrator Text to Vector | SVG, so yes after clean-up | Any subject | The style is ours; consistency depends on prompt discipline. |

Two styles can coexist when each has its own job (for example the line globe as background
texture, 3D objects as the "things": category art, empty states, achievements). What breaks
consistency is two styles doing the same job.

Licences and free tiers change: check current terms before adopting any source.

## 4. Open questions

1. Keep the line style (A or E) or change direction (B, C or D)?
2. Does the chosen style also cover empty states, achievements and the landing page, or only
   category art?
3. Per-quiz images: show the category's drawing as the default cover when a quiz has no image?
