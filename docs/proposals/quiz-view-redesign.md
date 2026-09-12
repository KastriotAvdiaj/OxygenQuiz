# Proposal: restructure the single-quiz dashboard page

**Status: partly implemented. Kept for the sections still open — and because §2, §5 and §8 are
cited by section number from source comments.** Written 2026-09-06; decisions recorded 2026-09-08;
status brought up to date 2026-09-11.

**What has shipped** is described in [`../quiz/quiz-analytics-page.md`](../quiz/quiz-analytics-page.md),
which is now the place to look for how the page behaves. In short: the tabs and the
`QuizProperties` grid are gone, the merged question table exists, Publish/Unpublish is wired, the
analytics endpoint has its admin bypass, and Share is hidden on Drafts (§1 and §4's cheap wins,
and step 4 of §6). Since then: per-question correct rate is computed over *graded* answers rather
than all submissions, the sorts that cannot rank anything say so instead of silently no-opping,
and `MaxPossibleScore` is on the DTO — which closes the second half of §2 item 8.

**What is still open**, and why this file stays:

- **§2 items 1, 2, 3, 7** — per-option answer counts, the typed strings players actually
  submitted, drop-off point, last-edited. All still backend work, all still the best ideas here.
- **§5, the range toggle** — `getQuizAnalytics` still takes no range from this page, so a
  client-side 7d/30d/All would re-scope the chart while every number around it stayed all-time.
- ~~**§8, the UTC day-bucketing bug**~~ — **step 1 is done** (2026-09-12): days are bucketed in
  the viewer's zone, sent as an IANA name with a UTC-offset fallback. **Step 2 is not** — the
  player's own zone at session creation is still not stored, so a time-of-day view remains
  unbuildable. See [`../quiz/quiz-analytics-page.md`](../quiz/quiz-analytics-page.md).
- **§9** — unchanged; it is about the matcher, not this page.

**Decided so far** (2026-09-08, in discussion). The first two have since shipped; the
other two have not.

- **§1 permissions** — the owner gets their own route under `/my-dashboard/quizzes/:quizId`
  (server-side ownership already gates every endpoint it needs), **and** the analytics
  endpoint gains an admin bypass. An admin who can already read and delete any quiz gains
  nothing by being blocked from its stats.
- **§4 share on Draft** — the Share control is hidden unless the quiz is Unlisted or Public.
  The backend mints a token its own resolver rejects, so offering it on a Draft can only
  produce a dead link.
- **Show what players typed.** `UserAnswer.SubmittedAnswer` has stored every submission all
  along and is on no DTO, so an author cannot currently see a single rejected answer. This is
  the real gap behind the brief's "Add alternatives" idea, and it needs no schema change.
- **Timezone** — the app is not assumed to be single-country, so the plan is the two-step in
  §8 rather than viewer-timezone alone.

An external design brief proposes replacing the three tabs on `/dashboard/quiz/:quizId`
(Overview / Questions / Analytics) with one continuous page: hero, stat strip, chart +
insights row, and a single merged questions-and-performance table with expandable rows.

The layout argument is sound and most of it is buildable. This document is the feasibility
pass the brief itself asked for, plus the two decisions that have to be made **before** any
of it is worth building.

---

## 1. The blocker: this page is admin-gated, its data is owner-only

The redesign makes analytics the spine of the page rather than one of three tabs. That turns
an existing, quietly-tolerated mismatch into the whole screen.

| | Who can reach it |
|---|---|
| The route `/dashboard/quiz/:quizId` | **Admins only** — `adminAuthLoader` on the `/dashboard/*` parent (`src/routes/Router.tsx:333`), non-admins get a 404 |
| `GET /reports/quiz/{id}/analytics` | **The quiz's owner only**, no admin bypass (`ReportService.cs:147-152`) |
| `PATCH /quiz/{id}/status`, `POST /quiz/{id}/share-link` | **Owner only**, no admin bypass |
| `DELETE /quiz/{id}` | Owner **or** admin |

So today: an admin who does not own the quiz sees the page and every button, and analytics,
share and publish all 404 for them. A non-admin owner — the person this redesign is
actually for, the one who wants to know which question is badly worded — **cannot open the
page at all.** `/my-dashboard/quizzes` has no link to a quiz detail page.

Building a richer analytics page behind an admin gate, served by an owner-only endpoint,
means the richer page is mostly empty for everyone who can open it.

**Decision needed:** does this page become owner-accessible (a `/my-dashboard/quizzes/:id`
route, or relaxing the dashboard gate for one's own quiz), or do the owner-only endpoints
gain an admin bypass? Everything below assumes one of these happens. Neither is a frontend
change.

---

## 2. Feasibility of each item the brief flagged

| # | Item | Verdict | Notes |
|---|---|---|---|
| 1 | Per-option answer counts | **derivable, backend work** | `UserAnswer.SelectedOptionId` for single-answer; multi-select is a **comma-separated option-id list in `SubmittedAnswer`** (`AnswerGradingService.cs:214-229`). No schema change, but not a naive `GROUP BY` — the CSV needs splitting, and `SubmittedAnswer` is overloaded across the three types. |
| 2 | Typed-answer strings | **exists** | `UserAnswer.SubmittedAnswer` holds the raw text for TypeTheAnswer. Near-miss detection is real and this is the strongest insight in the brief. |
| 3 | Drop-off point | **derivable, backend work** | `QuizSession.CurrentQuizQuestionId` + `AbandonedAt` + `AbandonmentReason`. |
| 4 | Difficulty score | **derivable** | Observed `correctRate` (already computed) vs the authored `Difficulty` label. Pure presentation once both are on the DTO. |
| 5 | Repeat attempts by the same player | **partial — misleading if shipped as-is** | `QuizSession.UserId` exists, but see §3. |
| 6 | Time-of-day activity | **partial — do not ship as stated** | `StartTime` is a bare `DateTime` (UTC). No player timezone is stored. "Play peaks 8–10pm" would be 8–10pm **UTC**, not in any player's evening. |
| 7 | Last edited | **needs backend** | `Quiz` has `CreatedAt` and `Version`, no `UpdatedAt`. "Edited N times" is free; *when* is a new column. |
| 8 | Best run / perfect count / avg time per question | **done** | `highestScore` and per-question `averageTimeSeconds` were already on the DTO. The max-possible-score now is too: `QuizAnalyticsDto.MaxPossibleScore`, summed from `QuizScoring.PointsForCorrectAnswer(TimeSpan.Zero, …)` so it cannot drift from the grader. The stat strip uses it as "of 4,500 possible". "Perfect · 2 players" is now a client-side comparison away. |
| 9 | Share / Host live / QR poster / Embed | **see §4** | One is broken, one is a much bigger feature, two do not exist at all. |

---

## 3. The data is thinner than the brief assumes

**Guest plays leave no trace.** A guest session and all its answers are **deleted outright**
the moment the guest views their results, and the abandonment sweep deletes rather than
marks them (`docs/auth/guest-play.md:48, 244`). Every guest play is invisible to analytics.
So "Attempts" is not attempts — it is *attempts by logged-in users*. Any page built around
these numbers should say so, or the owner of a widely-shared quiz will conclude nobody
played it.

That also settles item 5: guest sessions share one `GuestAccount.Id` and are deleted, so
"6 players came back for a second run" can only ever count registered users.

**The brief's two flagship insights are open proposals, not bugs.**

- Q7 ("most players picked UK + US but missed the Soviet Union, so a mostly-right answer
  scores zero → suggest partial credit") is exactly
  [`partial-credit.md`](./partial-credit.md), open since 2026-07-31. All-or-nothing grading
  is deliberate and current. A UI that tells the owner to "enable partial credit" would be
  advertising a feature the codebase has explicitly not decided on.
- Q10 ("11 players typed 'May Flower' … primary action `Add alternatives`") straddles
  [`typed-answer-typo-tolerance.md`](./typed-answer-typo-tolerance.md). *Showing* the
  rejected strings is honest and useful and needs nothing new. An `Add alternatives` button
  is only real if acceptable-answer editing is reachable from here.

**Most quizzes will have almost no data.** The brief's low-data section is the most valuable
part of it and should be treated as the default case, not the edge case.

---

## 4. Share row: three of four buttons would be dead

- **Copy link** — the UI exists (`Quiz.tsx:219`) but the URL it copies is **broken**:
  `buildShareUrl` produces `/play/shared/<token>`, and no such route exists in
  `Router.tsx`; it falls through to NotFound. The token is also never forwarded to session
  creation (`use-quiz-session.ts:347`). Known gap, recorded in
  `docs/quiz/quiz-visibility.md:146`. It is also offered on Draft quizzes, where the
  backend mints a token its own resolver rejects. **Fixing this is worth more than the
  entire redesign** — it is the one button on the page that currently lies.
- **Host live** — multiplayer exists, but a lobby is created with a random room code and
  *no quiz*; the quiz is chosen inside the lobby, and the picker only searches **public**
  quizzes. Hosting *this* quiz needs a create-lobby-with-quiz flow plus a "mine" scope. A
  feature, not a button.
- **QR poster** — no library, no component, no endpoint. Greenfield.
- **Embed** — nothing anywhere. Greenfield.

Recommendation: the share block ships with **Copy link only**, and only after the route is
fixed. Drop QR and Embed. Treat Host live as separate work.

Adjacent: **Publish/Unpublish is the cheapest real win on this page.** `PATCH /quiz/{id}/status`
is complete and tested backend-side; only the frontend mutation is missing, and the button
is currently rendered `disabled` with "Feature not implemented". Two dead buttons also ship
in the mobile dropdown today (`Quiz.tsx:158-174`, no handlers) and must be wired or removed.

---

## 5. What the brief gets right, and what it costs

**Removing the tabs is correct.** The same ten questions are genuinely listed twice today —
content under Questions, performance under Analytics — and the merged expandable table is
the biggest win in the document. `correctCount` / `incorrectCount` are already fetched and
unused, so an expanded row has real material immediately.

**Deleting the `QuizProperties` facts grid is correct** — every value in it appears
elsewhere in the proposed layout.

Two cautions:

- **The page becomes long and data-length.** `docs/RESPONSIVE.md` asks that data-length
  lists get their own capped scroll region rather than growing the page forever, and warns
  that `short:` is not the tool for content-length pages. The questions table needs that
  treatment.
- **The range toggle (7d/30d/All) has no backend.** `getQuizAnalytics` takes only `quizId`;
  the KPIs, score distribution and per-question rows are all-time aggregates. Only
  `attemptsOverTime` carries dates, so a client-side toggle would re-scope the chart while
  every number around it stayed all-time — which is worse than no toggle. Either extend the
  endpoint with the `ReportCriteria` range it already supports internally, or drop the toggle.

**On dropping score distribution:** agreed, and for the reason given — five buckets off a
handful of completed attempts is noise. It should go behind a disclosure rather than being
deleted, since it costs nothing to keep.

**On dropping the grid/list toggle:** agreed. The masonry grid view exists
(`quiz-questions.tsx:86`) but the expandable table replaces both.

---

## 6. Suggested order

Nothing here is one change.

1. **Resolve §1 (permissions).** Without it the rest serves an empty page.
2. **Fix the share link route.** Independent of the redesign, and it stops a button lying.
3. **Wire Publish/Unpublish; remove the two dead mobile buttons.** Backend already done.
4. **Merge the tabs into one page** using only existing data — hero, stat strip, existing
   chart, merged expandable question table. This is the bulk of the visible win and needs
   **no backend work at all**.
5. **Extend the analytics DTO** — per-option counts, typed-answer strings, drop-off
   question, max-possible-score. Then the insights column and the flagged rows become real.
6. **Only then** consider time-of-day (needs a timezone story), last-edited (needs a
   column), Host live, QR, Embed.

Steps 1–4 are worth doing on their own. Step 5 is where the brief's best ideas live, and it
is backend work in `ReportService`, not a UI task.

---

## 7. Components

Everything the layout needs already exists: `accordion`, `segmented-control` (unused except
in Settings — right for the range toggle *and* for replacing the hand-rolled list/grid pill),
`table`, `badge`, `card`, `progress`, `tooltip`. Charts are recharts, imported directly by
`quiz-analytics.tsx` with local colors — note `--chart-1..5` tokens exist in `global.css` and
are currently ignored in favour of `--primary` plus a hard-coded green.

There is **no shared stat-tile component**. The private `StatCard` in `quiz-analytics.tsx:61`
is already generic (`label` / `value` / `hint`) and is the one to extract. `stats-cards.tsx`
under `User/Components/` is hard-coded fake data with no call sites — it should be deleted,
not reused.

No new shared component is required by this redesign.

---

## 8. Timezone: what to store, and in whose clock

`QuizSession.StartTime` is `timestamp with time zone` set from `DateTime.UtcNow`, so the
**instant** of every attempt is exact and nothing has been lost. What was never captured is
the *player's* offset at the time of play.

~~**There is a live bug here, independent of the redesign.**~~ `AttemptsOverTime` grouped by
`s.StartTime.Date` — the **UTC** date — so an attempt at 01:00 in UTC+2 was charted on the
previous day. Confirmed end to end (`DateTime.UtcNow` → `timestamp with time zone` → `Kind=Utc`
→ `.Date` truncation → `System.Text.Json` writing `2026-09-11T00:00:00Z`) and **fixed on
2026-09-12** by step 1 below.

Two steps, and they answer different questions:

**Step 1 — render and bucket in the viewer's timezone. DONE (2026-09-12),** as specified here:
the client sends `Intl.DateTimeFormat().resolvedOptions().timeZone` and `ReportService` converts
with `TimeZoneInfo` before the in-memory `GroupBy`. Rather than choose between the IANA name and
the offset, it sends **both** — the tzdata question this section flagged is a deployment
property the code cannot assert, so `getTimezoneOffset()` minutes ride along as an automatic
fallback and a warning is logged if it ever fires. Implementation notes are in
[`../quiz/quiz-analytics-page.md`](../quiz/quiz-analytics-page.md).

**Step 2 — capture the player's zone at session creation.** Only this can answer "when is it
*evening for the player*", which is the brief's actual claim. It needs a new nullable column on
`QuizSession` (IANA zone name, or offset minutes) written from the client when the session
starts. Nullable because every existing row lacks it — so any time-of-day view must state that
it covers only sessions recorded since the column existed, and fall back to the viewer's zone
otherwise.

Step 1 is done. Step 2 is only worth it if the time-of-day insight is actually wanted, and it
earns nothing until enough post-migration sessions exist.

## 9. Typed answers: what is actually broken, and what is a toggle

The brief's two "May Flower" style examples are **not the same problem**, and only one of them
is a gap.

| Player typed | Expected `Mayflower` | Why |
|---|---|---|
| `the mayflower ship` | **already passes** — *if* the question has `AllowPartialMatch` on | Whole-word containment (`TypeTheAnswerMatcher.ContainsAsWords`). The toggle defaults to `false`, so most questions reject it. |
| `May Flower` | **fails, always** | Normalisation collapses whitespace but never joins words, so `may flower` ≠ `mayflower`. Partial match does not help: the expected token is absent. |

So the first is an **authoring default**, not a matcher defect. The second needs either an
`AcceptableAnswers` entry (capped at 4, already supported) or the open
[`typed-answer-typo-tolerance.md`](./typed-answer-typo-tolerance.md).

**Turning `AllowPartialMatch` on globally is not recommended.** `docs/quiz/typed-answer-matching.md`
records its known limits, and they are inherent rather than fixable: `not Paris` contains
`Paris` and always will, and a short answer like `cat` passes for anyone who types a sentence
containing the word. Making it always-on changes what counts as correct for every existing
question at once.

The cheaper, reversible options, in order:

1. **Show the rejected submissions** (already decided above). An author who can see "3 players
   typed *the mayflower ship*" can fix that question in one click, knowing why.
2. **Default `AllowPartialMatch` to `true` for newly authored questions only**, leaving stored
   questions alone. A change to the builder's default, not to grading.
3. Global always-on — only with the negation and short-answer consequences accepted in writing.
