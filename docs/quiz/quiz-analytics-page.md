# The single-quiz page

How `/dashboard/quiz/:quizId` behaves **today**. It is one continuous page — hero, stat strip,
attempts panel, then every question with its own numbers — replacing the Overview / Questions /
Analytics tabs. The reasoning for that shape, and the list of things deliberately not built, is in
[`../proposals/quiz-view-redesign.md`](../proposals/quiz-view-redesign.md); this file describes
what the code does.

> **Every number here counts signed-in plays only.** Guest sessions and their answers are deleted
> the moment the guest views their results, and the abandonment sweep deletes rather than marks
> them ([`../auth/guest-play.md`](../auth/guest-play.md)). An owner who shares a quiz widely and
> sees a low attempt count is otherwise being quietly misled, so every surface that shows a count
> says so — the shared wording is `SIGNED_IN_ONLY_NOTE` in `quiz-view/thresholds.ts`.

## Where the data comes from

| Panel | Query | Endpoint |
|---|---|---|
| Hero, footer | `useQuizData` | `GET /quiz/{id}` |
| Question list (content) | `useQuizQuestionsData` | `GET /quiz/{id}/questions` |
| Stat strip, attempts, per-question numbers | `useQuizAnalytics` | `GET /reports/quiz/{id}/analytics` |

Analytics is the only one that may legitimately be absent — it is owner-scoped with an admin
bypass, and the query can still fail. Every consumer treats absence as "not available" and renders
without it. **A quiz with no plays is the normal case, not an edge case**, and "analytics failed to
load" and "nobody has played this" are shown as different things: zeroing the second into the first
would be a lie.

The join between content and analytics is on **`questionId`** (the Question's id, not the
`QuizQuestion` row id). Analytics carries only the quiz's current questions (`RemovedInVersion ==
null`, see [`quiz-editing.md`](./quiz-editing.md)), so a row can have content with no stats — a
question added after the last play — but never the reverse.

## Low-data rules

Most quizzes sit on a handful of attempts forever. These thresholds live in
`quiz-view/thresholds.ts` and are deliberately low: they mark where a figure stops being a coin
flip, not where it becomes reliable.

### `MIN_ANSWERS_FOR_RATE` (5) — correct rate

A question's correct rate is withheld until it has **5 graded answers**. "100%" off one answer
looks identical to "100%" off two hundred, and a column that can't tell those apart defeats its own
purpose.

Withheld does not mean blank. `rateState()` returns one of four states and the cell says which:

| State | Cell reads | When |
|---|---|---|
| `rated` | the bar and the percentage | 5+ graded answers |
| `no-answers` | *Not answered yet* | nobody has reached the question |
| `too-few` | *N of 5 answers* | some answers, not enough |
| `awaiting-grading` | *Awaiting grading* | answers exist but none are graded |

A bare em dash is reserved for a genuinely empty numeric cell. It used to be the whole treatment,
with the reason available only on hover — and on a low-data quiz that is *every* row, which read as
a broken feature rather than a deliberate one.

**`rateState` is the single source of truth** for "does this question have a rate". The cell, the
"Needs a look" flag and the "Hardest first" sort all consult it. They previously each re-derived it
from `timesAnswered >= MIN_ANSWERS_FOR_RATE`, which is how the sort came to silently fall back to
quiz order while its tab still looked live.

### Where "Needs a look" appears

`needsALook` is `rated && correctRate < 50` — a prompt to look, not a verdict: a genuinely hard
question and a badly worded one are indistinguishable from here. It shows as an amber badge
**beside the question text**, plus an amber left border on the row.

**Not in the Type column.** The badge used to *replace* the type label, so a flagged row read
"Needs a look" under a heading that said TYPE — two unrelated facts sharing one cell, and on a
quiz where every question is flagged (entirely possible: a hard quiz genuinely can have all
fifteen under 50%) the Type column told you nothing about any question's type. The type is now
always the type.

### Sort availability

`Hardest first` ranks on correct rate, so it is **disabled, with the reason on hover**, when no
question has a showable rate — otherwise every comparison falls through to `orderInQuiz` and the
result is identical to `Quiz order`. `Slowest first` has no floor (`averageTimeSeconds` is real
from the first answer) and is disabled only when nothing has been answered at all.

The selected key is kept in state but the *effective* key is derived during render, so a refetch
that removes the supporting data falls back to quiz order without an Effect, and the tab
re-selects itself when the data returns.

### `MIN_ATTEMPTS_FOR_TREND` (10) — the attempts panel

Below 10 attempts there is **no chart**: the panel is headed *Recent attempts* and lists the days
that had plays, newest first, as text. A 240px chart frame around three points costs more to decode
than it carries, and a filled line through three days claims a direction three days cannot support.

At 10+ the panel is headed *Attempts over time* and draws the area chart (attempts and completed).

No caption explains any of this, deliberately. The previous low-data view drew a scatter plot and
then apologised for it in a footnote; once nothing on screen claims to be a trend there is nothing
to disclaim.

## Correct rate is over *graded* answers

`QuizQuestionAnalyticsRow` carries three counts, and the distinction matters:

- `timesAnswered` — every submission.
- `gradedCount` — submissions with a settled outcome: `Correct`, `Incorrect` or `TimedOut`.
  **This is the denominator of `correctRate`.**
- `ungradedCount` — the remainder, i.e. `Pending`.

A quiz with `ShowFeedbackImmediately = false` persists answers as `Pending` and grades them in a
Hangfire job. **Nothing grades them at the end of the quiz.** Neither `CompleteSessionAsync` nor
the auto-complete in `SubmitAnswerService.CheckAndCompleteQuizAsync` touches grading — they set
`EndTime` and `IsCompleted` and stop. `GET /QuizSessions/{id}/results` *waits*: it polls
`AreAllAnswersGradedAsync` every 500ms for up to 30s, then logs a warning and returns whatever is
there. The client polls `/grading-status` the same way. Both observe; neither grades.

In practice the job lands within seconds — the Hangfire server is registered in every
environment and `[AutomaticRetry]` gives three attempts at 5s/30s/60s — so `awaiting-grading`
should be a state nobody ever sees. It exists because the paths that strand an answer are real:
a throwing enqueue (caught and logged by `TryEnqueueBackgroundGrading`), a job that exhausts its
retries, or a session abandoned mid-quiz. Counting those in the denominator made a perfectly
good question read as **0% correct**, which is a lie of a different order from "not yet graded".

A timeout *does* count as graded: the player was shown the question and did not answer it
correctly in time, which is exactly what the rate measures.

The expanded row surfaces `ungradedCount` as an *Awaiting grading* line, and only when it is
non-zero — on an instant-feedback quiz it always is zero, and a permanent "Awaiting grading 0"
would be noise on every row.

## Score has a denominator

`QuizAnalyticsDto.MaxPossibleScore` is what a flawless, instant run of the quiz's current questions
would earn. It is summed from `QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, …)` per question,
so it **cannot drift from what the grader actually awards** — the base is 1,000 points with up to a
+50% speed bonus and a per-question `PointSystem` multiplier, which makes the ceiling a property of
the quiz rather than a round number anyone could guess.

The stat strip prints it as the hint under Avg. score and Best run ("of 4,500 possible"). A
percentage was the alternative and is worse: it hides the scale, and a player's own results screen
shows points, so an owner comparing the two would be converting in their head.

**When `attempts == 1`, Avg. score and Best run collapse into a single *Score* tile.** With one play
they are the same number by definition, and printing it twice under two labels implies a spread
that doesn't exist.

One tile carries `emphasis` (Attempts). Five equally-weighted boxes rank nothing and make the
reader take all of them in to find the one that answers their question.

## Days are bucketed in the viewer's time zone

The client sends its clock with the analytics request and the server buckets against it:

```
Intl.DateTimeFormat().resolvedOptions().timeZone   ──▶  ReportCriteria.TimeZone
-new Date().getTimezoneOffset()                    ──▶  ReportCriteria.OffsetMinutes
                                                          │
                                        ResolveViewerZone ─┤ IANA name, else offset, else UTC
                                                          ▼
              TimeZoneInfo.ConvertTimeFromUtc(StartTime, zone).Date   ──▶  the bucket
```

**This used to group on the raw UTC date.** Storage was never the problem — `StartTime` is
written from `DateTime.UtcNow` into a `timestamp with time zone` column and read back as
`Kind=Utc`, so the instant of every attempt is exact. Truncating that instant in UTC was the bug:
a play at 01:00 in UTC+2 was counted on the previous day, so an owner in Prishtina saw their
evening plays land on yesterday.

**The bucket key is serialized without a `Z`** — `2026-09-11T00:00:00`, from a
`DateTimeKind.Unspecified` value. That is deliberate and load-bearing. It is a wall-clock date,
not an instant, and JavaScript parses an offset-less date-time as *local*, so `new Date(key)`
lands on the same calendar day the server counted. Stamping it `Utc` (which is what produced the
old `T00:00:00Z`) makes every client west of Greenwich render the label a day early. For the same
reason the chart formats it with no `timeZone` override — forcing UTC there would undo the fix.

Date-range boundaries (`from`/`to`) resolve in the same zone, so "the 1st to the 7th" means the
caller's 1st and 7th. With no zone supplied the zone resolves to UTC and every report behaves
exactly as it did — which is the case for the two other reports, neither of which sends one.

**The offset is a fallback, not a second opinion.** `FindSystemTimeZoneById` needs tzdata in the
runtime image; whether it is there is a deployment property this code cannot assert, so an
unresolvable name degrades to the reported offset rather than all the way back to UTC. A fixed
offset is wrong for attempts on the other side of a DST boundary — wrong by an hour instead of
wrong by a day. If the log ever shows *"Unknown time zone … is tzdata present in the image?"*,
that is the fallback firing and the image needs `tzdata`.

Zones that spring forward *at* midnight (Santiago, Beirut) have no 00:00 on that date at all.
`StartOfDayUtc` walks forward to the first valid minute rather than letting
`ConvertTimeToUtc` throw and fail the whole report.

### What this does not answer

"When do attempts arrive, in my time" — yes. **"What time of day do players play" — no.** That
needs each player's own zone captured at session creation, which is a new nullable column on
`QuizSession` and a separate piece of work
([`../proposals/quiz-view-redesign.md`](../proposals/quiz-view-redesign.md) §8, step 2). Any
time-of-day view built before that column exists would be reporting the viewer's evening, not the
player's.

## Files

**Frontend** (`src/pages/Dashboard/Pages/Quiz/`)
- `Quiz.tsx` — the page: action row, hero, stat strip, attempts panel, question list, footer.
- `components/quiz-view/thresholds.ts` — the low-data rules and `rateState`.
- `components/quiz-view/format-duration.ts` — `8m 10s`, shared by the hero, the stat strip and
  the question rows (there were three drifting copies).
- `components/quiz-view/quiz-stat-strip.tsx`, `stat-tile.tsx` — the headline numbers.
- `components/quiz-view/attempts-chart.tsx` — the list-or-chart panel.
- `components/quiz-view/question-performance-table.tsx`, `question-performance-row.tsx` — the
  row is a Radix `Collapsible`, controlled from the table (which owns `openIds`, because several
  rows stay open at once). Not an `Accordion`: an accordion closes one row when you open
  another, and the task this page exists for is comparing two weak questions.
- `question-performance-table.stories.tsx` — the low-data states are pinned here, because they
  are the ones most likely to regress and the ones that matter most.

**Backend**
- `Services/Reports/ReportService.GetQuizAnalyticsAsync` — every number on the page;
  `BuildAttemptsOverTime` / `ResolveViewerZone` / `StartOfDayUtc` are the day-bucketing above.
  The per-day `Completed` counts genuine completions only, matching the headline figure —
  sessions the abandonment sweep flagged `IsCompleted` are excluded from both.
- `DTOs/Reports/ReportDtos.cs` — `QuizAnalyticsDto`, `QuizQuestionAnalyticsRow`.
- `Controllers/Reports/ReportsController.QuizAnalytics` — owner-scoped, admin bypass.

## Actions

**Every action lives in one ⋯ menu, on the title row.** `QuizActionsMenu` holds Edit quiz,
Share, Publish/Unpublish and Delete; the trigger is a 32px icon button right-aligned against
the `<h1>`.

It is deliberately the **same pattern as the quiz rows in the data table** — same
`h-8 w-8 p-0 rounded` trigger, same `Actions` label, same red destructive item last — so
someone who has used the list already knows this page.

What it replaced: a four-control toolbar in a full-width strip above the page's own heading
(Share, Publish/Unpublish and Edit Quiz as buttons, plus a ⋯ menu for Delete), with the first
three written a **second** time inside that menu as `md:hidden` items so the narrow layout
could reach them. A menu is the same menu at every width, so that duplication is gone.

Two details worth keeping:

- **Share is not offered on a Draft.** The backend mints a token its own resolver 404s, so it
  could only produce a link that fails at the recipient's end. (The share URL is broken for a
  separate reason; see [`quiz-visibility.md`](./quiz-visibility.md).)
- **Delete opens on the next animation frame.** The confirm dialog is owned by the page and
  rendered outside the menu — opening it while Radix is still closing the menu leaves two modal
  layers overlapping and `pointer-events: none` stuck on `<body>`. The data-table row does the
  same thing for the same reason.

Publish/Unpublish carries its consequence as a sub-line in the item rather than a tooltip: a
tooltip inside an open Radix menu fights the menu for the same hover.

`LoadingWave` is the loader in all three loading states (page, analytics, questions) — not
`Spinner`, which this page was written against before the wave existed.

## Layout

`ContentLayout` takes an opt-in `className` applied to the **card**; this page passes
`mx-auto max-w-5xl`, so the card hugs its content instead of spanning the viewport. Constraining
only the inner content box — the first attempt — left the card at full width with a wide empty
band down each side, which looks worse than not constraining anything: the frame says "this is
how much room there is" while the content sits in the middle ignoring it.

The page has **two shapes**, and the card's measure follows:

| Viewport | Card | Body |
|---|---|---|
| below `xl` | `max-w-5xl` | one column: hero, then analytics (tiles beside chart from `lg`), then questions |
| `xl` and up | `max-w-7xl` | two columns: a fixed **22rem** of quiz detail, and the questions in everything left over |

Stacked, a 15-question quiz pushes the entire left-hand story — title, description, the five
numbers, the chart — off the top of the screen the moment you start reading questions, so the
two halves of the job can never be held together. Side by side the context stays put.

The left column is a fixed `22rem` rather than a fraction: it holds a stat-tile pair and a
chart, both of which have a natural size, and letting it grow with the viewport would only
stretch them. Width goes to the question rows, which are the part that wants it. Inside that
column the analytics block reverts to `xl:grid-cols-1` — it is already in a narrow column, and
two columns inside one narrow column is how you get a 150px-wide chart.

The separator between analytics and questions is `xl:hidden`: from `xl` the column gap does the
dividing, and a horizontal rule across one column of two reads as a mistake.

### Motion

Expanding a row animates its height via Radix `Collapsible` and the `collapsible-down` /
`collapsible-up` keyframes in `tailwind.config.js`. Those are a near-duplicate of the
`accordion-*` pair on purpose — Radix publishes the measured height under a **different** CSS
variable per primitive (`--radix-collapsible-content-height`), so a Collapsible animated with
`accordion-down` reads an unset var and jumps to full height with no transition at all.

The old `{isOpen && <panel/>}` mounted and unmounted instantly, so a row snapped open and every
row below it jumped. `motion-reduce:animate-none` honours the OS setting, the same way the
loading wave does in `global.css` — the panel still opens, it just arrives rather than travels.

## Badge colour

Two badges appear on this page and they mean different kinds of thing, so they are coloured by
different rules — the same rule the builder follows
([`question-type-color-schema.md`](./question-type-color-schema.md)): **colour encodes _type_
quietly; _state_ is what gets loud.**

**Status (Draft / Unlisted / Public) is a type** — one scale, so one hue in three shades. The
ramp is *reach*: nobody → anyone with the link → everybody (see
[`quiz-visibility.md`](./quiz-visibility.md)), and the fill tracks it.

| Status | Classes | Contrast light / dark |
|---|---|---|
| Draft | `border-primary/30 bg-primary/5 text-foreground` | 18.66 / 13.26 |
| Unlisted | `border-primary/70 bg-primary/15 text-foreground` | 16.20 / 11.65 |
| Public | `border-primary bg-primary text-primary-foreground` | 4.94 / 4.85 |

It replaced a hard-coded `bg-green-500` for Public and the grey `secondary` variant for Draft —
two states from apparently unrelated systems rather than two ends of one axis. Green also
claimed "success", which Public is not: it is a visibility setting, not an achievement.

**The ramp is carried by fill and border, not by text colour.** The obvious version —
`text-primary` on a `bg-primary/N` tint — fails AA in dark mode at *every* tint strength,
because the accent is `#3b82f6` and its luminance against a near-black surface tops out around
**3.7:1**. `bg-primary/50` is worse: 2.4:1 light, 2.2:1 dark, with any foreground. Those numbers
are measured, and they are why the label sits on a foreground token instead.

**"Needs a look" is a state, so it stays amber.** It is the one thing on the page asking to be
acted on, and folding it into the primary family would both mute it and put two blue badges
with unrelated meanings side by side on the same row.

### One fix this needed

`Badge` appended its dark-mode `border-foreground/40` *after* `className`, so tailwind-merge
resolved it as the winner and **every caller's border colour was silently discarded in dark
mode** — including the amber edge on "Needs a look". The default now goes before `className`,
which is what the rest of the components here do and what every caller assumes.

## No database ids

Neither the quiz id nor the question ids appear anywhere on this page. A primary key identifies
a row to a query; it tells the person deciding whether a question needs rewriting nothing at all.
The card header used to read "Quiz #37" directly above an `<h1>` carrying the quiz's actual name
— an id *and* a duplicate heading — so `ContentLayout`'s title is now optional and this page
omits it. `Version` stays in the footer: it is a fact about the quiz's own history (every edit
retires rows and bumps it, see [`quiz-editing.md`](./quiz-editing.md)) and it explains why an
in-flight session can be playing different questions from the ones listed.
