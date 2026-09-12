# 11. Attempts are bucketed in the viewer's timezone

Date: 2026-09-12
Status: Accepted

## Context

`ReportService.GetQuizAnalyticsAsync` built the attempts-over-time series by grouping on
`s.StartTime.Date` — the **UTC** calendar date. An attempt at 01:00 in UTC+2 was therefore
counted on the previous day. For an owner in Prishtina that is every evening play landing on
yesterday, in production, since the feature shipped.

**Nothing was wrong with storage, and that is the part worth stating.** `StartTime` is written
from `DateTime.UtcNow` into a `timestamp with time zone` column and read back as `Kind=Utc`
(Npgsql 6 semantics; no `EnableLegacyTimestampBehavior` switch). The *instant* of every attempt
is exact and always has been. The defect was one line of truncation: `.Date` has to pick a
clock, and it picked the server's.

It surfaced as a cosmetic complaint — the chart tooltip read `date : 2026-09-11T00:00:00Z` — and
that turned out to be two unrelated things stacked. The raw ISO string was Recharts: below the
trend threshold the panel rendered a `ScatterChart`, whose tooltip is item-scoped and never
consults `labelFormatter`. Behind it sat the real bug, and the `T00:00:00Z` was not a timeless
write but the bucket key itself, serialized from a `Kind=Utc` midnight.

**The server cannot answer this on its own.** It holds an instant. "Which day does this attempt
belong to" has no answer until somebody names a clock, and there are three candidates:

- **The server's (UTC).** Free, stable, and wrong for everyone not at Greenwich.
- **The viewer's.** Answers "when are plays arriving, *in my time*" — which is the question the
  panel is on the page to answer, asked by a quiz owner who has exactly one clock.
- **The player's.** Answers "when is it *evening for the player*", a different and more
  interesting question. Nothing records it: `QuizSession` has no timezone column, and every
  existing row would lack one.

A fourth force decided the shape of the fix rather than its direction: resolving an IANA zone
name needs `tzdata` present in the runtime image. The API runs on Debian-based
`mcr.microsoft.com/dotnet/aspnet:8.0`, which ships it — but that is a property of the
deployment, not something this code can assert, and a silent fallback to UTC would restore the
original bug in exactly the environment nobody was watching.

## Decision

**Day buckets are cut in the viewer's clock, which the client sends with the request.**

`ReportCriteria` gains two fields, and `ReportService.ResolveViewerZone` prefers them in order:

- **`TimeZone`** — the IANA name, from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **`OffsetMinutes`** — the raw UTC offset, east-positive, as the fallback.
- Neither resolvable ⇒ `TimeZoneInfo.Utc`, i.e. exactly the old behaviour.

Three consequences of that shape are deliberate.

**Both values are sent, not one.** The offset exists only for the case where the name does not
resolve, and it is strictly worse — a fixed offset mis-buckets attempts on the far side of a DST
boundary, so a chart spanning a spring-forward is wrong for half its span. It is still an hour
wrong instead of a day wrong, which is the whole argument for carrying it. The fallback logs a
warning naming the suspect (`is tzdata present in the image?`) so the degraded state is
greppable rather than invisible.

**The bucket key is serialized without a `Z`.** `AttemptsByDayPoint.Date` is stamped
`DateTimeKind.Unspecified`, so `System.Text.Json` writes `2026-09-11T00:00:00` and JavaScript —
which reads an offset-less date-time as *local* — lands on the same calendar day the server
counted. This is load-bearing and easy to undo by accident: stamping it `Utc` is what produced
the original `T00:00:00Z`, and would make every client west of Greenwich render the label a day
early. The key is a wall-clock date, not an instant, and the missing `Z` is what says so.

**Date-range boundaries resolve in the same zone.** "The 1st to the 7th" should mean the
caller's 1st and 7th, not Greenwich's. With no zone supplied the zone is UTC and the arithmetic
is byte-for-byte what it was — which is the case for both other reports, neither of which sends
one. `StartOfDayUtc` also walks forward past a midnight that does not exist: a handful of zones
(Santiago, Beirut) spring forward *at* 00:00, and `ConvertTimeToUtc` throws on an invalid local
time rather than failing gracefully.

Alternatives considered and rejected:

- **Leave it in UTC and document it.** Defensible for a log, not for a chart an owner reads to
  decide whether their quiz is being played. The panel exists to answer a question about the
  reader's own week.
- **Bucket on the client.** No API change, and the timezone question disappears because the
  browser already knows its own clock. Rejected on what it costs: the server currently reduces
  N sessions to a handful of day points, and moving the grouping means shipping every session
  to the client and re-implementing the aggregate there — including the
  completed-but-not-abandoned rule, which would then exist in two places and drift.
- **Capture the player's zone at session creation.** The only thing that can answer the
  time-of-day question, and the right eventual answer for it. A new nullable column that every
  historical row lacks, so any view built on it is partial until enough post-migration sessions
  exist. Deferred, not rejected — `docs/proposals/quiz-view-redesign.md` §8 step 2.
- **Send only `getTimezoneOffset()`.** Simpler, and no tzdata dependency at all. Rejected as the
  primary because DST is not an edge case over a multi-month chart; kept as the fallback, where
  its failure mode is bounded.

## Consequences

- **Bucket keys are no longer instants, and nothing may treat them as one.** Any consumer that
  reformats `point.date` with `timeZone: "UTC"` silently reintroduces the bug. The chart did
  exactly that while the buckets *were* UTC, and removing it was part of this change. The
  prohibition is stated on the DTO property, on the TypeScript type, and in
  `docs/quiz/quiz-analytics-page.md`, because it is the kind of line a future reader "tidies up".
- **The same quiz charts differently for two viewers in different zones, and that is correct.**
  Totals are unaffected — only where the day boundaries fall. It does mean a screenshot from one
  owner will not always line up with another's, which is worth knowing before someone reports it
  as a discrepancy.
- **A runtime dependency on tzdata now exists, with a soft landing.** If the image is ever built
  without it the feature degrades to the offset rather than breaking, and says so in the log. It
  is worth grepping for that line once after the first deploy; the container is not something
  this repo's code controls.
- **The other two reports changed behaviour by zero bytes.** `GetQuizPerformanceAsync` and
  `GetQuestionAnalyticsAsync` share `NormalizeRange`, which is now zone-aware — but neither sends
  a zone, so both resolve to UTC and compute what they always did. They inherit the fix for free
  on the day their screen starts sending one.
- **This does not answer "what time of day do players play".** It is the question the redesign
  brief actually asked, and it is still unbuildable. Anything built on today's data would be
  reporting the *viewer's* evening and calling it the player's — a plausible-looking number,
  which is the failure this page has spent its whole redesign avoiding.
- **Bucketing and the headline figures now agree on what "completed" means.** The per-day
  `Completed` count was a bare `IsCompleted`, which includes sessions the abandonment sweep
  flagged, while the headline excluded them — so the chart's green series could sit above the
  completion rate printed beside it. Fixed in the same method, because it was the same six lines.
