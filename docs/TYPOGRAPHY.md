# Typography & density

`RESPONSIVE.md` is about **breakage**: what will overflow, be unreachable, or trigger iOS zoom.
This is about the other failure — the screen is technically fine and reads as shouty, or as a
settings page when it should read as one question.

Written Aug 2026, from the AI wizard density pass, and deliberately short: every rule below came
from a fix that shipped. Add to it the same way, not from first principles.

---

## The app font is a user setting, and it can be a display face

`--font-app` is chosen by the user in Settings from `src/lib/fonts.ts`. The default is
**Noto Sans**, but the ten options include DynaPuff, Baloo 2, Fredoka and Barriecito — display
faces that set noticeably wider and taller at the same `px`.

Consequences for anything you size:

- **Tune the scale against the default.** Noto Sans is what most people see. A ramp tuned to make
  a display face fit will look thin and undersized to everyone else.
- **Check it in the heaviest option before shipping.** It may be taller there; it must not
  *break* there — no clipping, no overlap, no control shrinking below its floor.
- **Never assume a font's metrics.** `--font-app` resolves at runtime; a magic pixel height that
  happens to work in Noto Sans is a bug waiting for someone to pick Barriecito.
- The `:root` fallback in `global.css` and `DEFAULT_APP_FONT` in `fonts.ts` **must agree** —
  `src/lib/__tests__/font-defaults.test.ts` fails the build if they drift. They disagreed for
  months, and the Settings page silently offered to change a font the user wasn't using.

## One thing on a screen carries weight

The rule that fixed the AI wizard: **the one required thing is the only element with weight, and
everything optional recedes.**

Before, that screen had nine bold labels — the page title, the lead question, the details
heading, and six field labels — all at `font-medium` or heavier. Every one of them was competing,
so none of them read as the answer to "what do I have to do here". It looked like a settings
page because it was typeset like one.

In practice:

- The lead question keeps its size and weight. It is cut **last**, after every other lever.
- Section headings step down before it does.
- Field labels sit at `text-sm font-medium` and are not part of the hierarchy contest.
- The page `h1` is a label on the form, not part of it — the first place to take space from.

## Required / Optional eyebrows

An 11px uppercase tracking-wider muted line above a group, marking it `REQUIRED` or `OPTIONAL`,
with one statement of optionality per group rather than "(optional)" on every label.

- Both eyebrows are typeset **identically**. The contrast between the two halves of a form only
  reads if they are marked the same way.
- Muted, never `destructive`. A red mark on an untouched field is a validation style, not a hint.
- An eyebrow, not a chip. A chip on the baseline of a heading reads as a badge attached to the
  words; an eyebrow reads as the label for the group underneath.

## Type steps on short viewports

`short:` (`max-height: 860px`) is spacing **and type** — see `RESPONSIVE.md` for the variant's
rules. What shipped, as a starting ramp:

| Element | Base | `short:` |
|---|---|---|
| Page `h1` | `text-2xl` | `text-lg` |
| Section heading | `text-xl` | `text-base` |
| Lead question | `text-xl` | `text-lg` |
| Field label | `text-sm` | unchanged |
| Helper / eyebrow | `text-xs` / `text-[11px]` | unchanged |

Labels and helper text do not step. They are already at the floor for readability, and shrinking
them buys a few pixels in exchange for the thing the screen is for.

**Never below 16px on a phone input** regardless of any of this — iOS zooms, and the zoom is what
makes the page look broken. That rule lives in `RESPONSIVE.md` and outranks everything here.

## Measure before you cut

The wizard's overflow was 174px, and **more than half of it was chrome** — a 77px header and a
`main` padding with no height step — not the form's type. Cutting type first would have made a
readable form less readable and still not fit.

Check the container before the content. And once a screen is meant to fit, assert it: `FitsTheFold`
in `ai-quiz-wizard-view.stories.tsx` is the reference. Height regresses without producing an error.
