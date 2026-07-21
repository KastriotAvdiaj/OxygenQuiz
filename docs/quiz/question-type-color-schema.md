# Question-type color schema

How the quiz builder colors questions by type, and the one rule that keeps it feeling
premium: **color encodes _type_ quietly; _state_ (selection, error) is what gets loud.**

## Why it's built this way

Color is the strongest signal on a card, so it has to be attached to the most useful thing.
Type is *metadata* — it should be a calm, constant tag you can scan, never a wash that fights
the question text. Selection and error are *states the user acts on* — those should be
unmistakable. An earlier version had this backwards (one type flooded its whole card with a
gradient while selection was a faint tint), which read as noisy and low-contrast.

So every card follows the same recipe:

- **Type** → a 3px left accent bar + a colored icon and label. Quiet and constant.
- **Selection** → a solid border + `ring-1` + a faint tint (~6%). Identical for every type.
- **Error** → the whole type palette is swapped for red (new, unsaved questions only).

## The palette

One hue per type, evenly saturated so three stacked cards feel cohesive rather than clashing:

| Type            | Hue              | Accent / icon         |
|-----------------|------------------|-----------------------|
| Multiple Choice | `primary` (blue) | `text-primary`        |
| True/False      | teal             | `text-teal-600`       |
| Type Answer     | amber            | `text-amber-600`      |
| _error state_   | red              | `text-red-600`        |

Multiple Choice reuses the app's theme `primary` so the most common type sits in the
product's own accent color; True/False and Type Answer take teal and amber to stay distinct
without introducing a second "action" blue.

## Single source of truth

All of this lives in one file:

    src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/question-type-theme.ts

`questionTypeTheme` maps each `QuestionType` to a `QuestionTypeTheme` of complete Tailwind
class strings (`accentText`, `cardBorder`, `cardSelected`, `selectedTint`, `surface`,
`previewBorder`, plus `label` and `Icon`). `questionErrorTheme` is the red override.

Two accessors read from it:

- `getQuestionTypeTheme(type)` — the full theme, used by the small panel cards
  (`SmallBaseQuestionCard`, `SmallQuestionHeader`).
- `getQuestionTypeStyles(type)` — a `{ borderColor, backgroundColor, previewBorderColor }`
  shape for the large editor cards. It's re-exported from
  `display-muiltiple-choice-question-card.tsx` so existing imports keep working.

Because both the small cards and the big editor card derive from this one map, they can't drift
apart — changing a hue is a one-line edit here and every card updates together.

> Class strings must stay **complete literals** (e.g. `"border-teal-500/30"`), never built by
> concatenation — Tailwind's JIT only generates classes it can see verbatim in source.

## States, precisely

| State            | Frame                                             | Fill                 |
|------------------|---------------------------------------------------|----------------------|
| Resting          | `cardBorder` (hairline + solid left accent)       | none (small) / `surface` tint (big) |
| Hover (small)    | + `hover:bg-muted/40`, `hover:shadow-md`          | —                    |
| Selected (small) | `cardSelected` (solid border + `ring-1`)          | `selectedTint` (~6%) |
| Error            | red `cardBorder`/`cardSelected` + corner indicator| red tint             |

The card element supplies the widths (`border border-l-[3px]`); the theme supplies only
colors. Error on a new question also shows the existing floating `ErrorIndicator` badge.

## Adding a new question type

1. Add the value to the `QuestionType` enum (`src/types/question-types.ts`).
2. Add one `QuestionTypeTheme` entry in `question-type-theme.ts` (pick an unused hue, keep the
   same saturation pattern as the others) and register it in `QUESTION_TYPE_THEME`.
3. That's it for color — every small and large card picks it up. Build the card body
   components as usual.
