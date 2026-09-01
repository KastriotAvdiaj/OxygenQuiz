# 4. A broken AI configuration disables the feature, not the app

Date: 2026-08-31
Status: Accepted

## Context

The AI settings were validated at startup by throwing. `Ai:Enabled` with a blank `Ai:ApiKey`,
`Ai:Provider = "Fake"` in Production, or a typo in `Ai:Provider` each ended in an
`InvalidOperationException` before the host was built. The reasoning was explicit and borrowed
from the `Jwt:Key` guard directly above it: a half-configured deploy that boots and returns 502s
looks like an outage, so refuse to start and make the mistake unmissable.

That reasoning is right for `Jwt:Key`. An API that cannot sign a token cannot do its job; there is
no degraded mode to fall back to, and every request would fail anyway. It is wrong for AI. Quiz
generation and the category-palette proposer are one optional feature. Playing, authoring, grading,
accounts, imports, reports, multiplayer — none of it touches the `Ai` section. Refusing to boot
trades a small outage for a total one.

The trade is worse than it looks, because of *when* it happens. A bad AI value is most likely to
arrive during a production config edit — adding a key, swapping a vendor, correcting a model id —
which is exactly the moment the blast radius should be smallest. The change that prompted this ADR
made that concrete: moving the vendor from a flat block to a selected `Ai:Vendors` entry adds one
more name that can be mistyped, at the one moment somebody is typing it.

There was also a quieter version of the same problem. Not every misconfiguration threw. Wrong
cost-per-million rates were accepted silently, priced every row in `AiGenerationUsages` wrong, and
loosened both budget caps by the factor of the error — the caps are enforced against that estimate.
So the old design refused to start over a blank key, and shrugged at a value that could quietly
multiply the bill. Whatever the right severity is, it was not being applied consistently.

## Decision

**An AI configuration that cannot produce a working call switches the AI features off, loudly, and
the application starts.**

`AiConfigurationResolver.Apply` runs once at startup. It resolves the selected vendor onto the flat
`AiOptions` properties, validates the result, and when the configuration is unusable it sets
**`AiOptions.Enabled = false`** and returns the reason.

Forcing that one flag is the whole mechanism, and it was chosen over adding an availability check
to each consumer. `Ai:Enabled` was already the gate in `AiGenerationService.GenerateAsync`, in
`AiGenerationService.IsAvailableAsync` (which `GET /api/quiz/ai-quota` answers with, and which the
wizard already uses to disable its Generate button), and in `CategoryPaletteService.ProposeAsync`.
Two of those carry a comment asking the next reader to mirror any new condition into the other. A
third condition would have been a third thing to keep in step. Closing the existing gate instead
means every surface that already respected the kill switch respects a broken config for free.

Validation is stricter than what it replaces, in the direction the old design was weakest:

- Both cost-per-million rates must be greater than zero. Zero is not "free", it is "unpriced".
- `BaseUrl` must be an absolute URL and `Model` non-blank — no defaults, so an environment that
  selects nothing gets nothing rather than a vendor it never chose.
- `Ai:Vendor` must name an entry in `Ai:Vendors`, and a catalogue that nothing selects is refused.

Two things keep their old severity, for reasons that survive the change:

- `Ai:Provider = "Fake"` in Production is still refused — canned questions served as real ones are
  worse than no feature — but by switching AI off rather than by refusing to boot.
- A missing key in **Development** still falls back to the stub rather than disabling anything.
  `appsettings.Development.json` is committed, so its `Ai:Enabled = true` is inherited by every
  fresh clone, none of which has user-secrets.

**Degrading is only honest if it reaches the user.** An off switch nobody can see is a worse
failure than a crash, because it looks like a bug in the feature. So the reason travels:
`AiAvailability` is registered as a singleton carrying a user-facing message; `GET /api/quiz/ai-quota`
already reports `enabled` and the wizard already disables Generate on it; and
`GET /api/questioncategories/ai-palette/availability` was added so the "Suggest colours" button can
be disabled with its reason in the tooltip instead of failing on click.

Alternatives considered and rejected:

- **Keep throwing.** Rejected above. It optimises for the developer noticing over the site staying
  up, and the two are not close in value here.
- **Throw in Production, degrade elsewhere.** Rejected: it makes the environment where uptime
  matters most the one where a typo is fatal, which is backwards.
- **A health-check endpoint reporting AI as degraded.** Not rejected so much as insufficient on its
  own — it tells an operator, not the admin looking at a greyed-out button. Worth adding later.

## Consequences

- **A misconfigured production deploy now serves a working site with the AI buttons off.** That is
  the point, and it is also the risk: a silent degrade is easy to not notice. Mitigated by logging
  the reason at `Error` on every boot, and by the reason being visible in the UI. If AI generation
  matters enough to page someone, it needs a health check — this ADR does not provide one.
- **`Ai:Enabled` no longer means only "somebody turned it on".** It means "on and usable". Anything
  reading raw configuration rather than `IOptions<AiOptions>` will disagree with the rest of the
  app, so don't.
- **`AiOptions.BaseUrl`, `Model`, `ReasoningEffort` and both cost rates became outputs.** They are
  resolved from the `Ai:Vendors` entry before anything reads them. Setting them directly still
  works, with a deprecation warning, so an already-deployed compose file does not lose its AI on
  the next pull.
- **The DeepSeek defaults are gone.** They were a vendor that any unconfigured environment fell
  back to without choosing it — and one we cannot obtain a key for. DeepSeek remains in the
  catalogue as a worked second example, where it costs nothing until selected.
- **`UnavailableQuizAiProvider` exists as a backstop.** If a gate is ever missed, the failure is an
  `AiProviderException` the pipeline knows how to render, not a `UriFormatException` from inside
  the HTTP client factory.
- **The pattern generalises, and should.** Optional features fail closed and visibly; only things
  the API cannot function without — `Jwt:Key`, the database connection — are allowed to stop the
  boot. `Signup`, `Authentication:*` and the email sender are the next candidates to reconsider on
  these grounds; each needs its own decision, not an assumption that this one applies.
