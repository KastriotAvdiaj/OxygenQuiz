# 41. The app font defaults to DynaPuff, and Noto Sans is gone

Date: 2026-11-07
Status: Accepted

## Context

The app has two font zones, each a CSS variable set from the user's settings: `--font-app` for
everything (body, buttons, dialogs, forms) and `--font-quiz` for quiz content. Until this change
the app zone defaulted to **Noto Sans**, chosen on purpose as a plain face: display faces set wider
and taller, and the dashboard's forms had been fitted to a 730 px viewport in the default font
(ADR 0002).

But a default is what everyone who hasn't chosen sees — every visitor who isn't signed in among
them. On the public pages that meant dialogs and buttons in Noto Sans next to a logo, quiz cards
and headings in DynaPuff: the community-quizzes notice on the catalogue looked like it came from
another site. The owner's judgement was that Noto Sans buttons look bad, and that DynaPuff is the
app's voice.

## Decision

- **`DEFAULT_APP_FONT` is DynaPuff**, with `:root` in `global.css`, the Tailwind fallback and the
  backend's settings defaults to match.
- **Noto Sans is removed from the options** and no longer loaded. A user who had saved it falls
  back to the default (`normalizeFont`), the same as any unknown value.
- **A component inherits the app font and never names one** — the rule in `docs/TYPOGRAPHY.md`
  and `CLAUDE.md`. Only `font-quiz` (quiz content) and `font-mono` (codes and keys) are added on
  purpose.

## Consequences

- Everyone who hasn't chosen now sees the wide, tall case, so layouts are fitted in DynaPuff
  first. ADR 0002's measurement ("in the default app font") now means DynaPuff, and the
  dashboard's tightest screens should be re-measured in it.
- Small secondary text in a display face is harder to read; the deferred proposal for a readable
  face on hints and helper lines (known-issues, "Typography") is now what every visitor would
  benefit from, not only those who picked a display face.
- Users can still pick a plain face (Inter, Poppins, Nunito, system) in Settings.
- Components that predate the rule and hardcode a face (`font-header`, Titillium Web, on the
  Select trigger, the builder's question cards and the lobby's panel titles) don't follow the
  user's font yet.
