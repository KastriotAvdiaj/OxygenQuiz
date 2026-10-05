# Associations — the format played on a board

**Associations** is OxygenQuiz's second quiz format, modelled on the final of the TV show *Oxygen*:
a Board of four Columns, each of four hidden Tiles and a Column solution, and a Final solution that
links the four Columns. This doc describes what exists **today**. What is still to be built — guest
play and board analytics — is in
[`associations-plan.md`](./associations-plan.md), and moves here as it lands. The words are defined
in [`glossary.md`](./glossary.md); why a format is its own system rather than a question type is
[ADR 0018](../adr/0018-quiz-formats-are-separate-verticals.md).

> **Status: partly implemented (2026-09-25).** Built: the `Format` of a quiz, the Classic entry
> points that refuse other formats, the rules engine with its scoring and settings, **authoring**
> — the Board tables, the create / edit API and the board builder (§8) — **Solo play** (§9):
> start, play, leave and resume, the board clock, results and review — and the **Duel** in a lobby
> (§10). Not yet: guest play of a Board (at release, §9.8) and board analytics (Phase 6).

---

## 0. Admins and Teachers only, for now

**Associations is in preview: only admins (Admin / SuperAdmin) and Teachers can see or use it.**
Decided 2026-09-23, so the format can be tested on the live site without players meeting a
half-built feature; Teachers added 2026-10-01, since hosting a board for a class is what they are
for ([`../auth/teacher-role.md`](../auth/teacher-role.md) §3). In code the flag is
`ICurrentUserService.CanSeePreviewFormats` (`RoleRules.PreviewFormatRoles`), not `IsAdmin`.

- **Server (the rule).** `QuizFormatAccess.PreviewFormats` lists the formats in preview. For a
  non-admin, `QuizService` leaves those quizzes out of every read — catalogue, search, "my
  quizzes", by id, questions, share link — and `AssociationQuizzesController` and
  `AssociationSessionsController` answer **404** from every endpoint, the same way the admin
  dashboard answers non-admins. So a Public board is
  invisible to players even in the catalogue, and a crafted request gets nothing.
- **Frontend (the affordance).** `PREVIEW_FORMATS` in `format-access.ts` decides what to offer: a
  player's create dialog shows only the two Classic cards, and the create-board route sends them
  back to their quiz list.
- **One exception: a Duel's review.** An admin may invite anyone to a Duel (§10.1), so the other
  player may be a player. `GET /api/associations/sessions/{id}` lets a non-admin read **their own
  Duel session** (`GetOwnDuelAsync`) and nothing else — they have seen the whole Board already.
- **Releasing it** is removing `Associations` from both arrays — one line each. Every read follows.

Pinned by `QuizAPI.Tests/Formats/PreviewFormatAccessTests.cs` (each read separately, plus the
authoring and play endpoints with a strict mock proving a player never reaches the service). Removing Associations
from the array makes six of them fail — checked.

## 1. A quiz has a format

`Quiz.Format` (`QuizFormat`: `Classic = 0`, `Associations = 1`) says which kind of game a quiz is.
It is set when a quiz is created and **never changes** — no update DTO carries it — because each
format keeps its content in its own tables and a quiz can't move between them. The migration
`AddQuizFormat` added the column with default 0, so every existing quiz backfilled to `Classic`,
which is the truth about them (the same trick as `QuizSessionMode`).

It reaches the client as a string on `QuizDTO` and `QuizSummaryDTO` (`"Classic"` /
`"Associations"`). The projections map it with a ternary over `QuizMappers.FormatNames`, not
`Format.ToString()` (CLAUDE.md: projections must translate to SQL). A new format adds a name there
and a branch to both ternaries.

**The quiz card** shows "Associations board" where a Classic quiz shows "13 questions" — a board
has no questions, and "0 questions" would be a lie ([`quiz-card.md`](./quiz-card.md)).

## 2. Classic entry points refuse other formats

A board has **zero** `QuizQuestion` rows, and a lot of Classic code reads zero as a state rather
than as a mistake: a session with nothing to serve completes at once; a completion check compares an
answer count against 0; the Classic update recomputes a quiz's time as the sum of its questions and
would silently set a board's time to 0. So every Classic entry point refuses a non-Classic quiz up
front, through one helper, `QuizFormatGuard` (`Common/QuizFormatGuard.cs`), with one message.

**The refusal always comes after the access check**, so someone who may not see a quiz learns
nothing about its format — they get the ordinary "not found or not available".

| Entry point | What it would do to a board without the guard | Refusal |
|---|---|---|
| `QuizSessionService.CreateSessionAsync` | Create a session with nothing to play | 400, validation failure |
| `QuizSessionService.CreateGuestSessionAsync` | The same, for guests | 400 |
| `QuizSessionService.AbandonAndCreateNewSessionAsync` | Start Fresh into a Classic session | 400, and the old session is left alone |
| `QuizSessionService.GetNextQuestionAsync` | Serve nothing, or complete the session | 400, no question clock stamped |
| `QuizSessionService.ResolveAndResumeAsync` | Run the Classic catch-up walk over no questions | 400 |
| `SubmitAnswerService.SubmitAnswerAsync` | Record a `UserAnswer` against no question | 400, nothing written |
| `QuizService.UpdateQuizAsync` (`PUT /api/quiz`) | **Zero the board time** and rewrite the board's quiz as Classic-shaped | `AppValidationException` → 400; the stored quiz is untouched |
| `QuizHub.StartMatch` | Run the Classic match loop over a board's zero questions | Not a refusal but a **dispatch** (2026-09-25): a Board goes to the Duel (§10). `SelectQuiz` stamps the pick's format from the quiz, so the dispatch can't be steered by the client; `MatchOrchestrator.StartMatchAsync`'s "This quiz has no questions" stays as the backstop. |
| `DataTransferController` quiz import | Create an empty Classic quiz from a board row | The row is skipped with a message; board content isn't importable yet. Export writes a `Format` column. |

Session creation for a guest and for a real account, next-question, resume, submit and update each
have a test in `QuizAPI.Tests/Formats/ClassicEntryPointGuardTests.cs` — one per entry point,
because each fails differently without its guard. **A new Classic entry point that serves or edits
a quiz belongs in this table and in that test file.**

Not guarded, on purpose: reads that are harmless for a board (the quiz detail, the catalogue, the
questions list — which is simply empty). Where Classic machinery has to *handle* a Board session
rather than refuse it — the abandonment clock, deleting a session, profile stats and reports — is
§9.6–§9.7.

## 3. The game

### 3.1 The Board

Four Columns, A–D. Each has four Tiles (A1–A4 …), hidden until opened, and a Column solution that
links them. The four Column solutions link to the Final solution.

- **Solving a Column opens all of its Tiles.** They aren't hidden any more, so they can't be opened
  later.
- **Solving the Final ends the game**, and collects every Column still unsolved (§4).
- **A Guess always names its target** — Column A–D or the Final — and is checked only against that
  target. A Guess for C that happens to be D's solution is wrong. That keeps grading unambiguous
  without requiring every solution on a Board to differ.
- Tiles keep their authored order; they are **not shuffled**. Unlike answer options
  ([ADR 0006](../adr/0006-answer-order-is-shuffled-at-serve-time.md)) the order is the author's
  design — the fourth Tile is often the giveaway.

### 3.2 Solo

One player against a board timer, with the Duel's rhythm but nobody to hand the turn to (D18,
2026-09-24 — it replaced D13's "open and guess freely, wrong Guesses unlimited"):

- **A Tile earns one Guess.** The game starts with no Guess: open a Tile first. Then Guess any
  unsolved Column or the Final.
- **A correct Guess earns another Guess** — at any unsolved target, the Final included — but not a
  Tile's worth of anything else. A **wrong** Guess spends it: the next Guess needs another Tile.
- **Opening another Tile instead of guessing is allowed.** The earned Guess isn't banked: you still
  have one, not two.
- **When every Tile is open**, a wrong Guess starts the same countdown as the Duel endgame:
  `EndgameTurnsPerSeat` (2) more wrong Guesses are allowed, the next one ends the game
  (`EndgameOver`). A correct Guess doesn't use a try.
- Wrong Guesses cost no **points**. The game ends when the Final is solved, the endgame runs out,
  the timer runs out, or the player gives up; the points already scored are kept.

The engine enforces this (`MustOpenATileFirst` for a Guess that hasn't been earned), and the view
says it plainly so the screen never re-derives a rule: `canOpen`, `canGuess`, `inEndgame`,
`endgameTriesLeft` (§9.3).

### 3.3 Duel — the show's final

Two players, one shared Board, taking turns. **The server picks who opens first at random, and a
rematch alternates.** A turn:

1. **Open exactly one closed Tile.** A turn can't start with a Guess or a Pass.
2. **Then, optionally, Guess** any unsolved Column or the Final — not just the Column of the Tile
   you opened.
   - **Correct** → score it and keep the turn: you may Guess again, but **not** open another Tile.
     The turn clock restarts.
   - **Wrong** → the turn passes.
3. **Pass**, or the turn clock running out (**30s** by default), passes the turn too. When the clock
   runs out nothing is opened on the player's behalf.

The opponent sees everything that is opened, and **the text of every Guess, right or wrong**.

**The endgame.** Once every Tile is open and nobody has the Final, each player gets **2 more
turns** of guessing only, alternating, and then the game ends. The endgame starts with the first
turn that **begins** with no closed Tile — the turn that opened the last Tile doesn't count. A
correct Guess in the endgame still lets that player keep guessing within the turn, but **does not
earn extra turns**: the endgame has a fixed length, so a Duel always ends. Unsolved Columns and the
Final then score for nobody.

Worked example (pinned by `DuelRulesTests.TheEndgame_WorkedExample`): P1 opens the 16th Tile and
misses → endgame. P2 misses (P2: 1 of 2), P1 misses (1 of 2), P2 solves C then misses the Final
(2 of 2), P1 misses (2 of 2) → game over.

**A player who leaves forfeits** — the game ends and the player still there wins, whatever the
score. "Leaves" means the lobby removed them: they clicked Leave, or their connection was gone
longer than the 5-second grace (§10.4,
[ADR 0021](../adr/0021-a-duel-is-forfeited-when-the-lobby-drops-the-player.md)).

**Turn order is `(seat + 1) % seatCount`**, never "the other player". That is what lets a future
1v1v1 be three Seats on the same engine, and a future 2v2 be two Seats with two players each — the
engine never sees a user, only a Seat.

## 4. Scoring

```
columnValue(c) = ColumnBase + PerClosedTile × (Tiles of c still closed when it is solved)
solve Column c  → columnValue(c), to whoever solved it
solve the Final → FinalBase + Σ columnValue(c) over every Column still unsolved, to whoever solved it
wrong Guess, Pass, running out of time → 0
```

With the default settings (5, 1, 10): a Column is worth 5–9, and the Final 10–45.

| At the moment the Final is solved | The Final scores |
|---|---|
| One Tile opened (in A), nothing solved: A = 5+3, B = C = D = 5+4 | 10 + 8 + 27 = **45** (the maximum) |
| A and B solved; C has one Tile open, D none | 10 + (5+3) + (5+4) = **27** |
| All four Columns already solved | **10** |

**Why this shape.** Solving the Final early is worth more because every Column you didn't need goes
to you at its full value, and a Column is worth more the fewer of its Tiles were opened. So the Final
with two Columns unsolved beats the Final with all four solved, and a Column solution is worth more
than any Tile. There is **no time factor** — unlike Classic, speed is not what this format rewards.

**The Final's points include the Columns it collected.** Each collected Column is recorded as solved
by the Final's solver (`ColumnSolve.ViaFinal`), with its value, for the breakdown — but that value
is inside the Final's points and is not added a second time.

In a Duel each Column's points go to whoever solved it, so Columns can split between the players.

**Associations scores and Classic scores are on different scales** — a board tops out at a few
dozen, one Classic question is worth 1000–1500. Nothing may average or rank them together (plan
§11).

`AssociationScoring` (`Services/Associations/AssociationScoring.cs`) is the formula;
`AssociationScoringTests` plays each row of the table above through the engine, under the default
settings and under changed ones.

## 5. Every number is a setting, and a game keeps its own

No number in §3–§4 is written in the engine or the scoring code. They are all fields of one record,
**`AssociationRules`** (`Services/Associations/AssociationRules.cs`):

| Setting | Default | Meaning |
|---|---|---|
| `ColumnBase` | 5 | points for a Column solution |
| `PerClosedTile` | 1 | extra points per Tile of that Column still closed |
| `FinalBase` | 10 | points for the Final, before the Columns it collects |
| `DuelTurnSeconds` | 30 | a Duel turn; restarts after each correct Guess |
| `EndgameTurnsPerSeat` | 2 | guess-only turns each player gets once every Tile is open |
| `SoloDefaultBoardSeconds` | 240 | the board time the builder proposes |
| `SoloMinBoardSeconds` / `SoloMaxBoardSeconds` | 60 / 600 | the range an author may choose |

- **Configured in `Associations:Rules`** (`appsettings.json`; every key optional — a missing one
  takes its default). The values are validated at startup (`AssociationRules.Validate`, wired with
  `ValidateOnStart` in `Program.cs`): a negative score, a turn under 5s or an endgame of 0 turns
  **fails the boot**, not the first game.
- **Where a game gets its rules is one service**, `IAssociationRulesProvider.GetRulesFor(quizId)`.
  Today (`ConfiguredAssociationRulesProvider`) it returns the configured values for every quiz. It is
  the seam for letting an author change the numbers per quiz later: an override is layered on
  there, and nothing that computes a score or runs a turn changes.
- **A game stores the rules it is played with** (`AssociationGame.RulesJson`, written by
  `AssociationRules.ToJson` when the game starts and never updated — [ADR 0020](../adr/0020-an-associations-game-is-its-move-log.md)). This is not optional.
  Scores are recomputed by replaying the moves (§6), so without a snapshot, changing `FinalBase`
  from 10 to 12 would silently rewrite every past game's score. `ReplayAndRulesTests` shows the same
  log scoring 35 under the snapshot and 37 under the changed setting. A snapshot written before a
  setting existed replays with that setting's default.

## 6. The engine

`AssociationEngine` (`Services/Associations/AssociationEngine.cs`) is where the rules live, and the
only place.

- **Pure.** No EF, no SignalR, no HTTP, no clock. It takes the board (`BoardKey`: which Tile is in
  which Column, and the solutions — never the Tile text, which it doesn't need), the game's
  `AssociationRules`, and each move with the server's timestamp. So it is tested without a database
  (`QuizAPI.Tests/Associations/`), and replaying the same moves always gives the same game.
- **`Apply(state, board, rules, move)`** returns the new state and what happened — Tiles opened,
  right or wrong, points, Columns solved, turn passed, endgame started, game over — or a
  **`MoveRejection`**. A rejected move is an error, never a move: the state is returned unchanged
  and nothing is to be recorded. Solo play, the Duel loop, resume and the results review will all go
  through it, so none of them can disagree about what was legal or what it scored.
- **Time is checked, not kept.** Solo refuses any move at or after the board deadline
  (`BoardTimeUp`); the caller then ends the game. A Duel refuses a player's move after the turn
  clock (`TurnTimeUp`); the server records `TurnExpired`, which is accepted only once the clock has
  actually run out (`TurnNotOver` otherwise), so the log can't claim an expiry that didn't happen.
- **Endings no move expresses** — the board timer, a forfeit, abandonment — go through
  `AssociationEngine.End(state, reason)`. They are stored on the game, and `Replay` reapplies them.
- **`Replay(start, board, rules, moves, endReason?)`** rebuilds a game from its log. A move the
  engine refuses **throws** rather than being skipped: a log with an illegal move in it is corrupt,
  and replaying around it would invent a game nobody played.

## 7. Checking a Guess

`AssociationGuessMatcher` is **not** a second matcher. It calls the core of
`TypeTheAnswerMatcher` — `IsMatch(correct, acceptable, caseSensitive, partial, submitted)`, extracted
from `IsCorrect` so it could be called with plain values ([`typed-answer-matching.md`](./typed-answer-matching.md)) —
with two switches fixed:

- **Case-insensitive.**
- **No partial match.** It would accept "the city of Rome" for "Rome", and a board's whole point is
  the one exact linking word.

So a Guess gets the same normalisation a typed answer does: spacing, punctuation, one leading
article, and diacritics — **"drite" matches "Dritë" and "caj" matches "Çaj"**. Each Column and the
Final can carry acceptable alternative spellings. Typo tolerance, if the open proposal is ever
accepted, reaches boards through the same core.

## 8. Authoring

### 8.1 The Board tables

| Table | Holds |
|---|---|
| `AssociationBoards` | `QuizId`, `FinalSolution`, `FinalAcceptableSolutions` (JSON), `CreatedInVersion`, `RemovedInVersion` |
| `AssociationColumns` | `BoardId`, `Position` 0–3 (A–D), `Solution`, `AcceptableSolutions` (JSON) |
| `AssociationTiles` | `ColumnId`, `Position` 0–3, `Text` |

Migration `AddAssociationBoards`. Texts are at most 100 characters (`AssociationBoardLimits`); the
acceptable-solution lists are JSON with a value comparer, exactly like
`TypeTheAnswerQuestion.AcceptableAnswers`. Columns and Tiles cascade from their Board; a Board is
`Restrict` to its quiz, like every FK to `Quiz` (a quiz is soft-deleted, never removed). Unique:
`(BoardId, Position)`, `(ColumnId, Position)`, and **one live Board per quiz** — a filtered unique
index on `QuizId WHERE RemovedInVersion IS NULL`, the same shape as `QuizQuestion`'s live rows.

### 8.2 A Board is versioned copy-on-write

The rule from [`quiz-editing.md`](./quiz-editing.md), applied to a Board: **a Board row is never
updated in place once created.**

- **Content changed** (any Tile, solution or other spelling, after trimming and cleaning) → the
  live Board is stamped `RemovedInVersion = newVersion` and a new Board is inserted at
  `CreatedInVersion = newVersion`. The old Board is untouched, so a game pinned to the old quiz
  version keeps — and is later reviewed against — exactly what its players saw.
- **Only metadata changed** (title, classification, status, board time) → `Quiz.Version` is
  bumped and the Board is left alone; it stays visible to both versions.
- **Whitespace the validator would trim is not a change.** Comparison is on the cleaned content
  (`AssociationBoardMapping.HasSameContent`).
- `AssociationBoard.IsVisibleToVersion(v)` and `IAssociationBoardRepository.GetForVersionAsync`
  are how play will find the Board a session pinned.

The retire-and-insert happens in one `SaveChanges`, with the filtered unique index in force. That
was checked against a real PostgreSQL 16 when this was built (four successive edits: three retired
Boards, one live, the right one found for each version) — InMemory, which the unit tests use,
doesn't enforce the index.

### 8.3 The API

Under `api/quiz`, next to the Classic endpoints (`AssociationQuizzesController`):

| Route | Does |
|---|---|
| `POST /api/quiz/associations` | Create the quiz (`Format = Associations`) **and** its Board in one `SaveChanges`. 201 with the `QuizDTO`. |
| `GET /api/quiz/{id}/board` | The full Board, solutions included, for the builder. **Owner or admin only** — it is the answer key. Anyone else gets **404**, the same as a missing quiz. |
| `PUT /api/quiz/associations` | Update quiz and Board (§8.2). `version` is the optimistic-concurrency token: stale → **409** with "reload and try again". Someone else's quiz → 404. A Classic quiz → 400 (it has its own update). |

Status, share link and delete use the Classic endpoints — they act on `Quiz` and don't care about
its format. Access is checked in `AssociationBoardService` itself, because `Quiz` has no visibility
query filter ([ADR 0019](../adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md)).

### 8.4 What a Board must be

The gate is `AssociationBoardValidator` (the builder's zod schema mirrors it for fast feedback):

- exactly **4 Columns of 4 Tiles**; every Tile, Column solution and the Final solution non-empty
  after trimming, at most 100 characters;
- other spellings: trimmed, blanks and duplicates (of each other or of the solution,
  case-insensitively — Guesses are matched that way) dropped, **at most 4** per solution;
- board time within `SoloMinBoardSeconds`–`SoloMaxBoardSeconds` (60–600 by default — the
  configured rules, §5). The refusal names the range **in minutes** ("between 1 and 10
  minutes"), because that is the unit the builder asks for (§8.5); the API itself takes seconds;
- and the quiz-level rules Classic already has, reused rather than restated: the category,
  language and difficulty must exist, and **Public needs a real classification**
  (`QuizService.EnsurePublishableAsync`, now on `IQuizService` so both formats call the same gate).

Every problem is reported at once, each naming its place ("Tile C4 is empty. Column D needs a
solution."), because the builder shows the message to the author.

**A Board is always complete when saved, even as a Draft.** Unlike the Classic builder, the board
builder has no local draft yet — see [`../deployment/known-issues.md`](../deployment/known-issues.md)
§ "Associations".

### 8.5 The board builder

`src/pages/Dashboard/Pages/Quiz/components/Association-Board-Form/`:

- **Reached from the create-quiz dialog**, whose first step for admins is "What kind of quiz?":
  Classic quiz or **Associations** (players, who can't pick Associations yet, skip that step —
  §0). Associations goes straight to the builder; Classic goes on to Manually / With AI
  ([`ai-quiz-two-paths.md`](ai-quiz-two-paths.md) §2a). Routes:
  `/dashboard/quizzes/create-quiz/associations` and `/my-dashboard/quizzes/create/associations`
  (both inside the existing full-width prefixes, so no layout change was needed).
- **The board first.** The four Columns side by side, as the board is played — each with its four
  Tiles, then its solution — the usual field with a green (`quiz-success`) border, a hint of green
  in the fill and a green underline, so the answer is marked as one and still reads as an input
  (`.board-solution-field` in `global.css`) — and other spellings under a dashed
  rule — and the Final solution below them all, its title and input centred. At `xl`, where the
  Columns sit in one row, four lines run from the bottom of each Column into the middle of the
  Final's card (`BoardConnector`): every Column solution leads to the Final. A short bright beam
  runs down all four into the meeting dot, which pulses as they land (`.board-beam`, off under
  reduced motion); lines and dot are unselectable decoration. The quiz's own fields (title,
  description, category, difficulty, language, status, board time) are the sidebar, sized to its
  own content (`self-start`) rather than stretched to the board's height. Under the title a hint
  says players see it before they start, so it must not give the Final away (2026-10-01): the
  title is in the catalogue and the start dialog, though the game screen no longer shows it (§9.9).
  The description's placeholder says the same. The
  Columns, the Final's card and the sidebar are all `bg-background`. Columns wrap two-and-two under
  `xl` (no lines) and stack on a phone.
- **Other spellings.** A Column's are one comma-separated line. The Final's are one input per
  spelling: the Final solution is the only input to start with, and a lifted **+** button in the
  card's top right corner (with the app's tooltip, which still shows once the button is disabled)
  adds a row, each with a remove ×, up to `BOARD_MAX_OTHER_SPELLINGS` (4) — `FinalSolutionEditor`.
  Both end up as the same comma-separated form value (`finalOtherSpellings` is joined from the
  rows), which `splitSpellings` turns into the list the API takes; blank rows are dropped and the
  server does the real cleaning.
- **Board time is typed in minutes** (1–10, in half-minute steps), not seconds (2026-09-30:
  "240" made the author do the arithmetic). Only the form speaks minutes: the form value is
  `boardTimeInMinutes`, `toAssociationQuizPayload` sends `boardTimeInSeconds` rounded to the
  second and `toAssociationQuizFormValues` divides a stored board's seconds back, so the wire,
  the rules (§5) and the clock (§9.4) stay in seconds. `BOARD_MINUTES` is derived from
  `BOARD_SECONDS`, the mirror of the rules' defaults.
- **The Public option is disabled** until the classification is real, as in the Classic builder;
  changing a lookup back to Unspecified while Public is selected falls back to Draft — in the
  change handler, not an Effect.
- **Saved whole**, one request. Server errors (a validation message, the 409) come through the
  shared axios interceptor; the form only reports success, then returns to whichever dashboard's
  quiz list it came from.
- **Editing**: `/dashboard/quizzes/edit-quiz/:quizId/board` and
  `/my-dashboard/quizzes/edit/:quizId/board`. **Every Edit link goes through `quizEditPath` /
  `useQuizEditPath`** (`quiz-paths.ts`), and the Classic edit route redirects a board to its own
  editor, so a board never opens the Classic form. Only the owner can save (the API decides). The
  edit form is keyed by quiz id + version, like the Classic one.

**Elsewhere in the dashboard:** the quiz table's Questions column says "Board"; the single-quiz
page shows the Board (read-only, solutions visible — the page is admin-only) where a Classic quiz
lists its questions, "Associations board · 4m board time" in the meta line, and "Analytics for
Associations quizzes aren't available yet" instead of numbers — not zeros
([`quiz-analytics-page.md`](./quiz-analytics-page.md)). Neither the questions nor the analytics
query is sent for a board.

### 8.6 A sample board in development

`DbSeeder` seeds one Public board, **"Italian cities"** (Rome, Venice, Milan, Naples → Italy), when
the environment is Development and no Associations quiz exists yet — so the format can be looked
at without authoring one first. It is seeded once: the check counts every Associations quiz,
soft-deleted ones included, so neither editing nor deleting it makes it come back.

## 9. Playing — Solo

A signed-in player (an admin, while §0 holds) plays a Board against the clock. The rules are §3.2;
this section is how the server and the screens carry them out.

### 9.1 The game tables

| Table | Holds |
|---|---|
| `AssociationGames` | One Board being played: `BoardId` (the exact Board version — Restrict), `PlayStyle` (`Solo` / `Duel`), `MatchId` (Duel only), `FirstSeat` (Duel only), `SeatCount` (1 / 2), `StartedAt`, `DeadlineUtc` (Solo), `EndedAt`, `EndReason`, `RulesJson`. |
| `AssociationGamePlayers` | `(GameId, SessionId)` → `Seat`. Ties a player's `QuizSession` to the game. A session plays exactly one game (unique `SessionId`). A Seat is who takes a turn, not who a person is — a future team duel puts two sessions on one Seat. |
| `AssociationGameMoves` | Every accepted move, in order: `Seq` (unique per game), `Seat`, `Kind`, `TileId` / `Target` / `GuessText`, `IsCorrect`, `Points`, `At` (server clock). A refused move is never a row. |

Migrations `20260923212621_AddAssociationGames` and `20260925071707_AddAssociationGameSeatCount`
(default 1 — every game before it was Solo). **`SeatCount` is stored, not counted from the players**:
deleting one Duel player's session removes their row and keeps the game, which is still the other
player's record, and replay needs to know there were two Seats. **The move log is the game** —
[ADR 0020](../adr/0020-an-associations-game-is-its-move-log.md): board state is never stored; every
request replays the moves through the engine (§6) under the game's own `RulesJson`, and
`GameEndReason`s the server decided (`TimeUp`, `Abandoned`, later `Forfeit`) are reapplied on top.
The one denormalised number is `QuizSession.TotalScore`, updated on **every** scoring move so that
a game ended by the clock or the sweep already has its score.

A Solo play is an ordinary `QuizSession` too (`Mode = SinglePlayer`, `QuizVersion` pinned), so it
appears in the player's history like any other play (§9.7).

### 9.2 The API

`AssociationSessionsController`, `api/associations/sessions`, `[Authorize]`. Every route answers
**404** to a non-admin while the format is in preview (§0). Every response is a **view** (§9.3),
never the Board.

| Route | Does |
|---|---|
| `POST /` `{ quizId, shareToken? }` | Starts a Solo game: **201** with the view. If this player already has an unfinished game of this quiz **inside its deadline**, returns that one instead — **200**, `resumed: true`. One whose deadline has passed is settled as `TimeUp` first, and a new game is started. |
| `GET /{id}` | The view. Settles the game as `TimeUp` first if its deadline has passed. Also what the results page reads. |
| `POST /{id}/open` `{ tileId }` | Opens a Tile → `{ game, isCorrect: null, points: 0, … }`. |
| `POST /{id}/guess` `{ target, text }` | `target` is `A`–`D` or `Final` (names only — `"4"` is refused). `text` is trimmed; empty or over 200 characters is refused. → `{ game, isCorrect, points, solvedColumns, finalSolved }`. |
| `POST /{id}/give-up` | Ends the game (`GaveUp`), reveals the Board; the points scored stand. |
| `POST /{id}/restart` `{ shareToken? }` | Abandons the game if it is still running (session `AbandonmentReason = UserInitiated`, game `Abandoned`) and starts a fresh one → **201**. A finished game is left exactly as it ended — restarting is how "Play again" works. The right to start the new game is checked **before** anything is ended, so a refused restart leaves the running game alone. |

- **Starting authorises like Classic**: `QuizPlayAccess.IsPlayAuthorized` — Public, owned, or
  Unlisted with the matching share token — the one rule both formats share (it was
  `QuizSessionService`'s private method). Missing and not-allowed both answer **404** "Quiz not
  found or not available."; only after that does a Classic quiz get the 400 format refusal, so a
  stranger learns nothing about a quiz's format.
- **A session belongs to its player.** Anyone else gets 404. An admin may **read** another
  player's game (as they may a Classic session) but never move in it. A Classic session id is 404
  here.
- **A refused move is a 400 with a sentence for the player** ("That tile is already open.") and
  records nothing. A move on a finished game is 400 "This game is already over."
- **A move that arrives at or after the deadline doesn't count.** The game is settled as `TimeUp`
  at the deadline and the answer is the finished view with `isCorrect: null` — 200, because the
  client's job is the same either way: show the finished Board.
- **Double submission.** Two requests that replay the same log both try to append the same `Seq`;
  the unique `(GameId, Seq)` index lets one in and the other gets **409** ("The board changed while
  you were playing it. Refresh…"). Not unit-tested — the InMemory provider doesn't enforce unique
  indexes.
- **Writes are one `SaveChanges`**: the move, the session's score and any ending land together or
  not at all.

### 9.3 What the client sees

The Board's value is in what is hidden, and anything that reaches the browser is not hidden.
`AssociationViews.Build` is the only place a view is made:

| Item | While hidden | Once revealed |
|---|---|---|
| Tile | `{ id, position, isOpen: false, text: null }` | `+ text`, `openedBySeat` (null when a solve revealed it) |
| Column | `{ letter, solved: false, solution: null }` | `+ solution`, `points`, `solvedBySeat`, `viaFinal` |
| Final | `{ solved: false, solution: null }` | `+ solution`, `points`, `solvedBySeat` |

- A **wrong** Guess's answer says only that it was wrong.
- **The whole Board is revealed only once the game is over** — every Tile's text and every
  solution, including the ones nobody reached.
- **Acceptable spellings are never sent**, not even then. The review shows the canonical solution.
- The view also carries `score`, `deadlineUtc`, `serverNow` (for clock correction), `boardSeconds`,
  `isOver`, `endReason`; what the player may do next — `canOpen`, `canGuess`, `inEndgame`,
  `endgameTriesLeft` (§3.2), taken from the engine's state so the screen never re-derives a rule;
  and `moves` — the player's own moves, which the timeline shows. A Guess's
  text is the player's own words; in a Duel the opponent sees it too (D15).
- The only full read of a Board is the authoring one (§8.3), owner or admin.

Pinned by `AssociationViewSecrecyTests`, which serialises real responses — a move answer, a read
and a resume — and searches **the whole JSON** for hidden Tile texts, unsolved solutions and the
Final's other spelling. A field added to a view DTO that leaks fails there without anyone having to
add an assertion. Checked by making every Tile's text always visible: the test fails.

### 9.4 The clock

**The server's, always.** `DeadlineUtc = StartedAt + board time` (the quiz's `TimeLimitInSeconds`,
which authoring keeps inside `SoloMin/MaxBoardSeconds`), stamped from the injected `TimeProvider`
— the app clock, never SQL `now()` (the lesson in [`quiz-grading.md`](./quiz-grading.md)) —
truncated to the millisecond so a deadline recomputed from the stored start lands exactly on the
stored one.

The client counts down to that deadline, corrected for clock offset (`serverNow` against the time
the view arrived — `useBoardClock`, `remainingMs`), with the rules of
[`quiz-timer.md`](./quiz-timer.md): an anchored deadline, primitive-only effect dependencies. At zero
it **asks** — it refetches the game — and the server settles it; the client never decides the game
is over. If the two clocks disagree by a second the answer is "still running", the offset updates,
and the countdown corrects itself.

### 9.5 Leaving and coming back

Nothing advances while the player is away ([`session-lifecycle.md`](./session-lifecycle.md) §1), and
there is no catch-up walk to do: the board clock doesn't stop, so on return the game is either still
inside its deadline — resume, with less time — or past it — it is settled as `TimeUp` with the
points already scored, and the player lands on the results. Settling happens on whatever touches the
game first: a read, a move, a new start, or the abandonment sweep.

**Starting again while a game is running returns that game** (`resumed: true`) rather than the
Classic "Session In Progress" screen: the clock is running anyway, so resuming is the useful default.
The game page says so — "You already had this board going" — and offers **Start over** (restart).
The note goes away at the player's first move.

### 9.6 The Classic session machinery, for a Board session

A Board session is a `QuizSession` with no questions, and some Classic code handles every session.

- **Abandonment** (`SessionAbandonmentService`). The Classic arithmetic sums question time limits,
  so for a Board it gave a total timeout of **zero** — the sweep would have abandoned a Board
  session the first time it saw it. `GetAbandonmentDeadlineAsync` now has a format branch: a Board
  session's abandonment deadline is **its game's `DeadlineUtc` + `ActivityBufferSeconds`**.
  [ADR 0008](../adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md)'s invariant holds by
  construction — past the deadline there is nothing left to resume. When the sweep marks sessions
  abandoned it also ends their games (`EndGamesOfSessionsAsync`: `TimeUp` at the deadline, which
  has always passed by then; `Abandoned` otherwise).
- **Deleting a session** — `DeleteSessionAsync`, the guest `/finish` discard and the sweep's guest
  deletion — clears the session's game first (`DeleteGamesOfSessionsAsync`): a **Solo** game is
  deleted whole (game, player, moves); a Duel game only loses that player's row, because it is the
  other player's record too. `AssociationGamePlayer` **restricts** a session's deletion, so a path
  that forgets this fails loudly instead of leaving a game behind.
- **The Classic results page** (`/quiz/results/:id`) sends a Board session to
  `/associations/results/:id` — `QuizSessionDto` carries `format`.

### 9.7 Stats, history, reports

- **Profile stats** (`UserStatsService`) count **Classic plays only** — an explicit
  `Format == Classic` (through `IgnoreQueryFilters`, so plays of a since-deleted quiz still count, as
  they always have). A Board's score is on another scale and would bend the average and the best
  score. Board stats are Phase 6.
- **History** (`QuizSessionSummaryDto.format`): a Board play is listed with a **Board** badge, its
  score and no question count, and links to its own results page.
- **Author reports** (`ReportService`): the per-quiz performance table lists Classic quizzes only,
  and the single-quiz analytics count Classic sessions only. The analytics page already says "not
  available" for a Board ([`quiz-analytics-page.md`](./quiz-analytics-page.md)); the filter means a
  report never relies on its caller for that.

### 9.8 Guests

**Not yet.** Guest play is Public-only and guests are never admins, so while the format is in
preview (§0) no guest can reach a Board, and a guest endpoint would be unreachable and untestable
end to end. It is built with the release (plan §8.5): a guest twin of the start / read / move
routes, the one-free-quiz cookie, and deletion after the results — the deletion half already exists
(§9.6) and is tested (`AssociationLifecycleTests`).

### 9.9 The screens

| Route | Screen |
|---|---|
| `/associations/:quizId/play` (`?shareToken=`) | `AssociationStartRoute`: starts the game (once — a ref guards StrictMode's double mount) and **replaces** itself with the game's URL, so refresh and Back land on the game instead of starting another. |
| `/associations/play/:sessionId` | `AssociationGamePage`: score, clock, the board with its guess slots, Give up (two clicks). When the game ends while you play it stays on the board: the clock, prompt and Give up give way to a finish banner (a won Final in large green letters with the total, or "Time's up" / "Here's the board"), the board plays its reveal, and a **See results** button fades in. Opening a game that was already over goes straight to the results. |
| `/associations/results/:sessionId` | `AssociationResultsPage`, vertically centred like the game page: the end reason, the score, the fully revealed board (each slot shows its points), Back to quizzes (an outlined `LiftedButton`, first) and Play again (primary `LiftedButton`, restarts). No score table or move list — the board already carries the points, and the moves matter only to a future history view (`scoreBreakdown`, `describeMove`, `elapsedLabel` stay in `board-model.ts`, tested, for that). A results link to a game still running goes to the game. |

All three are signed-in routes (`userAuthLoader`). **Play** in the catalogue's start dialog goes
through `quizPlayPath` (`src/pages/Quiz/quiz-play-path.ts`), which picks the play screen by format;
the dialog shows "Associations board" where a Classic quiz shows its question count.

**The game page** (2026-09-24, after the first playtest; reworked 2026-09-30 and 2026-10-01): the
board sits in the middle of the screen, under the clock, with the score to the clock's right and a wide gap between the clock and the board.
**Leave is pinned to the page's top-left corner** — outside the vertically centred block, so it
doesn't drift down the page with a short board.

- **The board's title is not shown while it is played** — Solo or Duel (2026-10-01). A title like
  "Italian cities" all but names the Final, and the show plays its boards cold. It stays in the
  catalogue, the start dialog and the results page; the builder warns authors that players see it
  first (§8.5).

- **The clock is the same ring a Classic question uses** — `BoardTimer` draws `CountdownRing`
  (`src/pages/Quiz/components/countdown-ring.tsx`), which `QuizTimer` draws too, so the two formats
  can't drift apart ([`quiz-timer.md`](./quiz-timer.md)). It reads "3:05 min" from a minute up and
  "42 sec" under one, turns to the warning colour under a quarter of the time, and red and pulsing in
  the last 30 seconds. (The first build had only a small chip in the corner, which read as no timer
  at all; the second a number and a bar.)
- **One line above the board says what to do next** ("Open a tile to earn a guess.", "Type a guess
  into any column or the final — or open another tile.", "Every tile is open — 2 wrong guesses
  left.").
- **A Guess is typed into the slot it is for.** Every unsolved solution slot — each Column's and the
  Final's — is its own input, sent with Enter or its arrow. This replaced "pick a slot, then type in
  the box under the board": that was two steps for one intent, and the separate box was the thing
  first-time players didn't find. The target is where the text is, so it can't be aimed wrong, and
  it still names its target exactly as §3.1 requires. The inputs are live only while a Guess is
  earned — then they read as text fields: a white field with a faint primary border (`primary/30`,
  full primary while typing in it), a pencil icon and a "Guess Column A…" placeholder, and a click
  anywhere on the slot focuses it. The send button is a grey icon until there's text, then a filled
  primary button, so it reads as the way to send for anyone who doesn't press Enter. Otherwise the
  slots are disabled and grey. Never dashed: five dashed slots made the board look busy
  (2026-10-03). The Final sits further below the
  Columns than the Columns' rows sit from each other: it answers all four. **Nothing is pre-focused**, for the
  reason the first build learned: a pre-aimed Column read as "you must guess this one". A wrong
  Guess shakes its slot; the line under the board says what happened.
- **A closed Tile is a solid primary button** with a pressed-down lift, so it can't be confused
  with the guess slots under it — the Tiles are what you press, the slots what you type into
  (2026-10-01; before, both were the same pale blue and a first-time player in the guess step
  couldn't tell them apart).
- **An opened Tile shows its word in capitals** on a faint primary shade (`bg-primary/20`), so
  the board still reads as one grid after the flip.
- **Opening a Tile turns it over** — a card flip from its name (B2) to its word
  (`.board-tile-card` in `global.css`). Solving a Column turns its remaining Tiles the same way,
  and in a Duel the Tiles nobody opened turn when it ends. It is a CSS transition on the view
  changing, so a Tile that arrives open (resume, results) is drawn face up; reduced motion drops it.
- **Give up is an outlined button**, and pressing it springs the two choices — Give up and Keep
  playing — out of where it stood (`GiveUpControl`, `solo/give-up-control.tsx`); Keep playing folds
  them back. Under reduced motion they just appear.

**In the catalogue** (`/choose-quiz`), a board's card carries a "Board" label and a small 4×4 of
tiles in the quiz's colour ([`quiz-card.md`](./quiz-card.md)), and — for whoever can see boards,
admins while §0 holds — an **All / Quizzes / Boards** control filters the grid server-side
(`format` is a whitelisted filter field in `QuizFilterFields`; it filters only within what
`VisibleTo` already allows, so a player asking for boards gets none).

`AssociationBoard` (`src/pages/Quiz/Associations/board/`) is the one board component — Solo play,
the results review and the Duel (§10.7) — and it never calls the API: a Tile click and a
target choice go up as callbacks, the new view comes down
([`quiz-playing-architecture.md`](./quiz-playing-architecture.md) §1). The guess inputs are its
own — each slot keeps what is typed in it — and a Guess goes up as `onGuess(target, text)`, whose
answer (right, wrong, too late, or refused) tells the slot whether to clear or shake; a refused
Guess keeps the text. Each move writes the returned view straight into the React Query cache
(`useAssociationMoves`); nothing is refetched after a move.

**The end-of-game reveal.** With `reveal`, a finished board shows everything the player hadn't
seen, one after another, column by column: unopened Tiles turn over on the same card flip as an
opened one, each with its own `transition-delay`, and unsolved or via-Final solutions flip down
into place (`.board-reveal` in `global.css`), after a won Final pops in first and glows
(`.board-final-win`). All of it is off under `prefers-reduced-motion`. `solverName` (Duel) adds who
solved a slot after its points.

### 9.10 The first-play guide

A player who has never seen a Board doesn't know it starts with a Tile. The first time one plays in
a browser, the Solo game page draws a two-step guide over the board (`BoardCoach`,
`board/board-coach.tsx`): the rest of the board dimmed and blurred, a ring around one
element, a short note beside it (with a `foreground` border), and a curved arrow from the note to the
middle of the side of the element that faces the note.

1. **Before any Tile is opened** — around the first closed Tile: "Start here — open a tile. Every
   tile you open earns you one guess."
2. **Once one is open and a Guess is earned** — around the solution slot of that Tile's Column (or
   the next open target, if that Column is solved): "Type what links this column's tiles here and
   press Enter — or open another tile for another clue."

Which step shows is **derived from the view** (`coachStep` in `board-model.ts`: the moves so far,
`canOpen` / `canGuess`), never stored, so a resumed game picks up at the right step. The guide ends
at the first Guess, right or wrong, or with its Skip / Got it button, and the page then remembers it
in `localStorage` (`board/coach-storage.ts`). That is a per-browser convenience on purpose — the
worst case of forgetting is seeing two notes again — so it is not per account and not on the
server. **In development** (`npm run dev`, `import.meta.env.DEV`) the flag is ignored and the
guide shows on every new game; Skip still hides it for the rest of that game. The note sits beside the target, towards the roomier side, below it in the top half of the
board and above it in the bottom half, so it covers closed Tiles rather than the Column being
guessed; the overlay passes clicks through, so the Tile in the ring is clicked as usual. It
The blur covers **the board only** — the clock and the prompt above it stay sharp, since the clock
is running. It is one layer with a window cut out (`clip-path`), running 12px past the board and fading out
over that edge (a mask) so it has no hard border; on dark the arrow is `foreground`, not primary,
which vanished against the blue Tiles; in step 2 the window is the whole
Column, not just its slot, because the opened Tile is the clue being guessed from. Clicks pass
through the blur — the guide points, it doesn't block. It measures the board to place itself — the one Effect in it, and a DOM measurement.

**Solo only**, for now. A Duel is turn-based and timed at 30 seconds a turn; a note on the
opponent's turn would point at things the player can't do. `coachStep` and `BoardCoach` take a view
and nothing Solo-specific, so the Duel can adopt them when it's wanted.

## 10. Playing — Duel

Two players in a lobby, taking turns on one Board — the rules are §3.3. This section is how the
lobby, the server and the screens carry them out. The lobby itself (create, join, ready, chat,
rematch) is unchanged and is [`multiplayer.md`](./multiplayer.md).

### 10.1 In the lobby

- **An Associations quiz in a lobby is always a Duel**, for **exactly 2** players. `canStartQuiz`
  says so with a Board picked and three or more in the room; the server re-checks
  (`AssociationMatchOrchestrator.StartMatchAsync`: "An Associations duel is for exactly 2 players.").
- **The pick carries its format**, filled by `QuizHub.SelectQuiz` from the quiz — never the
  client's — and replayed to late joiners with the rest of the pick (multiplayer.md §4.3).
  `StartMatch` dispatches on it.
- **While the format is in preview (§0) only an admin may pick a Board**; anyone else gets "You
  can't host this quiz.", the same as for a quiz they may not host at all. The other player needn't
  be an admin — an admin can test a Duel with anyone they invite.
- **The server picks who opens first at random; a rematch alternates** (D12) —
  `MultiplayerSession.LastDuelOpener` survives the lobby reset for exactly that.

### 10.2 The runner and the loop

Two pieces, split on purpose:

- **`AssociationDuel`** (`Services/Associations/AssociationDuel.cs`) — one live Duel, **pure**:
  every call takes the server's "now". It maps a username to a Seat (case-insensitively) and
  refuses everyone else ("You're not playing in this duel.", "It isn't your turn."), puts moves
  through the engine, turns a late move away ("Time's up." — it records nothing; the clock tick
  records the expiry), records `TurnExpired` when the clock has run out, forfeits, decides the
  winner and builds the view. It builds the `AssociationGame` row — moves, players, rules snapshot,
  `SeatCount` 2 — as the Duel is played, so recording it is one `Add`. `AssociationDuelTests` is
  its spec, the clock being the times the tests pass in.
- **`AssociationMatchOrchestrator`** — the singleton around it: the countdown (3s,
  `DuelStarting`), the real clock (an injected `TimeProvider`), the broadcasts, the write, and
  handing the lobby back. It shares the lobby's `MatchCts` liveness guard and calls the **same**
  `ResetToLobbyAsync` as the Classic loop from its `finally`, which clears `session.Duel` too
  (multiplayer.md §3.2–3.3).

**The loop keeps only the turn clock.** Moves come in through the hub. The loop sleeps until the
current turn's deadline *or* until a move wakes it (`DuelMatch.Changed`), then checks again — so a
correct Guess, which restarts the clock, and a move that ends the Duel are both picked up at once
rather than at the next poll. Everything that touches the runner — a hub move and a clock tick —
goes through one `SemaphoreSlim` per Duel together with its broadcast, so updates reach the room in
the order they happened.

### 10.3 The hub surface

| Client → server | Server → client (to the room unless noted) |
|---|---|
| `OpenTile(sessionId, tileId)` | `DuelStarting(countdownSeconds)` |
| `GuessAssociation(sessionId, target, text)` | `DuelStarted(view)` |
| `PassTurn(sessionId)` | `DuelUpdated({ move, isCorrect, points, view })` — a move, an expired turn, or a forfeit (`move` null) |
| | `DuelEnded(view)` — over **and recorded** |
| | `DuelState(view)` — to a caller joining mid-Duel |

The player is always the signed-in account — as the name that account is pinned to in the lobby
(`Context.Items["Username"]`, set by `JoinSession`; [account-identity-changes.md](../auth/account-identity-changes.md) §4),
not the token's `username` claim, which lags a rename. A refused move is a `HubException` with the runner's
sentence — not ignored silently: the other player's UI shouldn't send a move out of turn, and if it
does, that's worth seeing.

**Every event carries the whole view** (`DuelViewDTO`), not a delta. The plan listed
`BoardStarted` / `TurnStarted` / `TileOpened` / `GuessResult` / `BoardEnded`; one view per event
means a client that missed one — or reconnected — is right again on the next, and `DuelState` is
simply the same view sent to one caller. The names all start with `Duel` so none collides with a
Classic event (`connection.off(name)` removes every handler for a name — multiplayer.md §1).

**The view** is the same for both players — nothing in a Duel is private to a Seat (D15: the
opponent sees every Guess, right or wrong). It is built by `AssociationViews.BuildDuel` from the
same Column / Final / move builders as the Solo view, so what is hidden is decided in one place:
the seats (names, scores, endgame turns left), whose turn and its deadline, `serverNow` for clock
correction, `canOpen` / `canGuess` / `canPass` for the Seat whose turn it is, `inEndgame`,
`isOver`, `endReason`, `winnerSeat`, the board and the move log. Once it is over and recorded,
each seat carries its `sessionId` — the player's results link.

### 10.4 Leaving, reconnecting, catching up

- **A seated player whom the lobby removes forfeits** — `LeaveSession`, or the disconnect grace
  running out; both call `PlayerLeftAsync`. Someone who isn't seated leaving changes nothing.
  Leaving during the countdown forfeits the moment the board is up.
  [ADR 0021](../adr/0021-a-duel-is-forfeited-when-the-lobby-drops-the-player.md) has the reasoning.
- **A blip is not a leave.** The client rejoins the lobby after an automatic reconnect, inside the
  grace, and gets `DuelState` — the board as it stands (multiplayer.md §3.6). The turn clock does
  not stop for it.
- **An emptied lobby interrupts the Duel** (the session manager cancels `MatchCts`) and nothing is
  written — unless the Duel had already ended (a forfeit, then the other player left too), which is
  a result and is recorded.

### 10.5 What a Duel leaves behind

Written once, when it ends, in one save — the shape of Classic's (multiplayer.md §7): a `Match`
(quiz, pinned version, room code, host, winner), a `QuizSession` per player (`Mode = Multiplayer`,
`MatchId`, `TotalScore` = their board points, `QuizVersion` pinned at start), and the one
`AssociationGame` with its two players and every move. Three deliberate differences from Classic:

- **Every seated player gets a session**, moves or not. Classic drops a player who never answered
  (§7.2 there — a row of blanks would drag down their stats). A Duel player can lose without ever
  having had a turn (the opponent took the Final on the first), that is a real result, and the game
  needs every Seat's row to know who sat where. (A player whose account is gone by the end gets no
  session and no seat row.) Seats are keyed by pinned lobby name; the host and each Seat's user id
  come from the lobby's `PlayerUserIds`, the same as Classic, so a player who renamed while the
  lobby was open is still recorded.
- **The write comes before the final broadcast.** `DuelEnded` carries each player's results link,
  and a link to a row that isn't there yet would 404. If the write fails, the players still get the
  result, without links, and the failure is logged as itself.
- **The winner is stored, not derived**: a forfeit is won by the player still there whatever the
  score, and replay can't tell who left.

Winner otherwise: the higher score; equal scores → no winner (`WinnerUserId` null).

### 10.6 Reviewing a Duel

Each player reviews the Duel on the Solo results page, `/associations/results/{their session id}`,
through the same `GET /api/associations/sessions/{id}` — replay under the game's snapshot, the whole
Board revealed. The view knows whose it is: `mySeat`, `score` (that Seat's), `seats` (names and
scores) and `winnerSeat` (from the `Match`). A Seat whose player later deleted their session keeps
its score and is shown as "(player left)". A Duel session takes no moves over HTTP ("This game is
already over."). While the format is in preview, a non-admin opponent can still read their own
Duel here (§0). The page shows both scores and who won instead of one score, names who solved
each slot on the board itself (no breakdown or move list, §9.9), and has no "Play again" — a rematch is in the
lobby. Pinned by `DuelReviewTests`.

### 10.7 The screens

Everything is in `src/pages/Quiz/Associations/duel/`, beside `solo/`:

- **`useAssociationMatch`** — the Duel's own listener set on the lobby's connection (`Duel*`
  events only, so `off(name)` can't touch `useMatch`'s). Each event carries the whole view, so it
  just replaces the last one; `receivedAtMs` is kept for the clock. Moves are `invoke`s whose
  refusals come back as the server's sentence.
- **`DuelGame`** — rendered by `MultiplayerLobbyPage` in place of the lobby while a Duel is on
  (with the leave dialog, whose copy says leaving forfeits). "Get ready…" during the countdown;
  then both Seats with their scores (the one whose turn it is outlined), the **turn clock**
  (`BoardTimer` — the same ring as Solo, red for the last 10 seconds, counting to the server's
  deadline corrected by `serverNow` — `useBoardClock`), one line saying whose turn it is and what it
  allows, the shared `AssociationBoard` (clickable only on your turn, and only what the turn
  allows — its guess slots are live only then), **Pass**, the last move from either side in one
  line, and the recent moves. Right or wrong arrives as the next view (`DuelUpdated`), not as the
  hub call's answer, so a Duel slot clears once its Guess is accepted and the line under the board
  says how it went. At the end:
  who won, the whole Board playing the same reveal as Solo, with who solved each slot, **Review the duel** (the results page, in a new tab so the lobby
  stays) and **Back to lobby** for a rematch.
- **`duel-model.ts`** — the pure helpers (whose turn, the prompt, the outcome from the reader's
  side, a move in words), tested in `duel-model.test.ts`.
- **In the lobby**: a Board pick shows "Board · duel for 2", and the Start button follows
  `startBlockedReason` (`Multiplayer/utils/lobby-start.ts`), which says why it's disabled — e.g.
  "A board is a duel for exactly 2 players — one too many in the room."

**Checked end to end** (2026-09-25) against the real API on PostgreSQL 16 with two browsers: a
full Duel (open, wrong Guess hands over, the Final ends it), both players' reviews, a rematch
opened by the other player, a turn running out at 30 seconds, and a player closing the tab
forfeiting five seconds later. That run is also what found the disconnect grace had never
removed anyone (multiplayer.md §3.5).

## Files

| Concern | File |
|---|---|
| The format | `Models/Quiz/QuizFormat.cs`, `Quiz.Format`, migration `20260922213821_AddQuizFormat` |
| Board tables | `Models/Associations/AssociationBoard.cs`, `ConfigureAssociationBoards` in `ApplicationDbContext`, migration `20260922221302_AddAssociationBoards` |
| Authoring | `Controllers/Quizzes/AssociationQuizzesController.cs`, `Services/Associations/AssociationBoardService.cs`, `AssociationBoardValidator.cs`, `AssociationBoardMapping.cs`, `Repositories/AssociationBoardRepository.cs`, `DTOs/Quiz/AssociationQuizDTOs.cs` |
| The Classic guard | `Common/QuizFormatGuard.cs` |
| Rules, settings, provider | `Services/Associations/AssociationRules.cs` |
| Engine vocabulary (board, moves, state) | `Services/Associations/AssociationModel.cs` |
| The rules engine | `Services/Associations/AssociationEngine.cs` |
| Scoring | `Services/Associations/AssociationScoring.cs` |
| Guess matching | `Services/Associations/AssociationGuessMatcher.cs` → `Services/Grading/TypeTheAnswerMatcher.cs` |
| Game tables | `Models/Associations/AssociationGame.cs`, `ConfigureAssociationGames` in `ApplicationDbContext`, migration `20260923212621_AddAssociationGames` |
| Solo play | `Controllers/Quizzes/AssociationSessionsController.cs`, `Services/Associations/AssociationPlayService.cs`, `AssociationViews.cs`, `Repositories/AssociationGameRepository.cs`, `DTOs/Quiz/AssociationPlayDTOs.cs`, `Common/QuizPlayAccess.cs` |
| Duel | `Services/Associations/AssociationDuel.cs` (the runner), `AssociationMoveInput.cs` (input checks and refusal sentences shared with Solo), `Services/QuizSessionServices/AssociationMatchOrchestrator.cs` (+ `IAssociationMatchOrchestrator`), `QuizHub` (dispatch, `OpenTile` / `GuessAssociation` / `PassTurn`, forfeits, `DuelState`), `AssociationViews.BuildDuel`, `DuelViewDTO` in `AssociationPlayDTOs.cs`, migration `20260925071707_AddAssociationGameSeatCount`; [ADR 0021](../adr/0021-a-duel-is-forfeited-when-the-lobby-drops-the-player.md) |
| Classic machinery for Board sessions | `SessionAbandonmentService` (format branch), `QuizSessionService` (delete / discard), `UserStatsService`, `ReportService` |
| Tests | `QuizAPI.Tests/Associations/*` (incl. `AssociationPlayServiceTests`, `AssociationViewSecrecyTests`, `AssociationLifecycleTests`, `AssociationDuelTests`), `QuizAPI.Tests/Multiplayer/*` (`AssociationMatchOrchestratorTests`, `QuizHubDuelTests`, `QuizHubRejoinTests`, `DuelReviewTests`), `QuizAPI.Tests/Formats/ClassicEntryPointGuardTests.cs`, `PreviewFormatAccessTests.cs`, `Stats/UserStatsServiceTests.cs`; frontend `api/__tests__/association-quiz.test.ts`, `quiz-card/__tests__/card-model.test.ts`, `Associations/board/__tests__/board-model.test.ts`, `Associations/duel/__tests__/duel-model.test.ts`, `Multiplayer/utils/__tests__/lobby-start.test.ts`, `context/__tests__/lobby-rejoin.test.ts`, `Quiz/__tests__/quiz-play-path.test.ts` |
| Frontend — authoring | `QuizFormat` in `src/types/quiz-types.ts`; `src/types/association-types.ts`; `quizSizeLabel` in `quiz-card/card-model.ts`; `api/association-quiz.ts`; `components/Association-Board-Form/`; `quiz-paths.ts`; `components/quiz-view/association-board-preview.tsx` |
| Frontend — play | `src/pages/Quiz/Associations/` (`api/association-play.ts`, `board/` — incl. `board-coach.tsx` and `coach-storage.ts` (§9.10) — `solo/` — incl. `give-up-control.tsx` — `duel/`, `results/`); `src/pages/Quiz/components/countdown-ring.tsx` (the clock, shared with Classic); `src/pages/Quiz/Multiplayer/utils/lobby-start.ts`; `src/context/lobby-rejoin.ts`; `src/pages/Quiz/quiz-play-path.ts`; routes in `src/routes/Router.tsx` |
