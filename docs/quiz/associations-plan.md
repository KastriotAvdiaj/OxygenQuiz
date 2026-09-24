# Associations — implementation plan

The plan for OxygenQuiz's second **quiz format**: the Associations board from the final of the TV
show *Oxygen*. It covers the rules, the scoring, the data model, the rules engine, solo and
multiplayer play, authoring, and every existing code path that has to learn that a quiz might not
be made of questions. The *why* behind the overall shape is
[ADR 0018](../adr/0018-quiz-formats-are-separate-verticals.md); the vocabulary is in
[`glossary.md`](./glossary.md).

> **Status: plan (2026-09-22). Phases 0–4 are implemented** and their sections now point to
> [`associations.md`](./associations.md); everything else below is still a plan. This is a transient `*-plan.md`
> ([`documenting-changes.md`](../development/documenting-changes.md)): as each phase lands, what
> is true moves into `docs/quiz/associations.md` (the feature doc, created in Phase 1) and the
> matching section here is deleted. When the last phase lands, this file is deleted. **Source
> comments must cite `associations.md`, never this file**, so that deleting it breaks no reference
> — four older plans became undeletable exactly this way (`known-issues.md`, "Documentation debt").

---

## 0. Decided, and still open

**Decided (2026-09-22):**

| # | Decision |
|---|---|
| D1 | Associations is a **quiz format**, not a question type. A quiz is one or the other for life. |
| D2 | The format is its own vertical and shares only `Quiz` and the `QuizSession` header (ADR 0018). |
| D3 | **One quiz = one Board**: 4 Columns (A–D) × 4 Tiles, a Column solution each, one Final solution. |
| D4 | v1 supports two ways to play: **Solo** (one player vs the clock) and **Duel** (1v1, turn-based, one shared Board). A race mode (each player on their own copy) was considered and **dropped** (2026-09-22): it isn't the show's game. |
| D5 | Duel turn rule: open exactly one Tile, then Guess any Column or the Final; a correct Guess earns another Guess but **not** another Tile; a wrong Guess ends the turn. |
| D6 | Scoring rewards what was *not* revealed, and a Column solution is worth more than a Tile (§2). |
| D7 | Two future ways to play must not be blocked by v1 (§9.6): **2v2** (teams; teammates can suggest and discuss before one of them guesses) and **1v1v1** (three players taking turns on one shared Board). Both come after the core. |
| D8 | Duel turn length: **30s**, restarting after each correct Guess. *(was Q1)* |
| D9 | When every Tile is open and nobody has the Final, the Duel goes into an **endgame**: each player gets **2 more turns** of guessing, alternating (P1, P2, P1, P2), then the game ends. The count is one setting (`EndgameTurnsPerSeat`, §2.1) in case it should become 3. *(was Q3; details in §1.3)* |
| D10 | A player who leaves mid-Duel forfeits: the game ends, the player still there wins, and the match is recorded. *(was Q5)* |
| D11 | Names: **Solo** and **Duel**. *(was Q8)* |
| D12 | The server picks who opens first in a Duel at random; a rematch alternates. *(was Q2)* |
| D13 | ~~Wrong Guesses in Solo are free and unlimited.~~ *(was Q4)* **Superseded by D18.** |
| D14 | Solo board time is author-set, 60–600s, default 240s. *(was Q6)* |
| D15 | The opponent sees the text of every Guess in a Duel, right or wrong. *(was Q9)* |
| D16 | Scoring starts at 5 per Column solution, +1 per closed Tile, 10 for the Final solution — **but none of these is a constant in code**. Every tunable number is a named setting read from configuration, designed so it can later become per-quiz and author-editable, and each game stores the values it was played with (§2.1). *(was Q10)* |
| D18 | **Solo follows the Duel's rhythm** (2026-09-24, after playing the first build): a Tile earns one Guess; a correct Guess earns another at any target; a wrong one means the next Guess needs a Tile; opening a Tile without guessing is allowed; once every Tile is open, a wrong Guess starts the endgame countdown (`EndgameTurnsPerSeat`). Wrong Guesses still cost no points. Feature doc §3.2. |
| D17 | **Admins only while it's tested** (2026-09-23): the format is invisible to players and guests, server-enforced, released by removing it from one array on each side. See [`associations.md`](./associations.md) §0. |

**Nothing is open.** Q1–Q10 were all answered on 2026-09-22 and became D8–D16. (Q7 — what a
lobby of two chooses between — fell away with race mode: an Associations quiz in a lobby is always
a Duel, for exactly 2 players.)

---

## 1. The game — moved

**Implemented (2026-09-22); now in [`associations.md`](./associations.md) §3.** The Board, Solo, the
Duel turn, the endgame, forfeits and turn order for more Seats are described there as current
behaviour, and pinned by `QuizAPI.Tests/Associations/`. Still true for planning: 1v1v1 and 2v2 are
future work that the Seat-based engine already allows (§9.6).

## 2. Scoring — moved

**Implemented (2026-09-22); now in [`associations.md`](./associations.md) §4–§5**, including the
settings (`AssociationRules`, `Associations:Rules`, `IAssociationRulesProvider`). One piece is still
that was still to build — the per-game rules snapshot — landed with Phase 4 (`AssociationGame.RulesJson`,
[ADR 0020](../adr/0020-an-associations-game-is-its-move-log.md)).

---

## 3. Architecture

### 3.1 The shape

```
            ┌───────────────────────── shared ─────────────────────────┐
            │  Quiz (Format, Status, Version, DeletedAt, …)            │
            │  QuizSession header (TotalScore, IsCompleted, Mode, …)   │
            │  Match (multiplayer record)   Lobby (MultiplayerSession) │
            └───────────────┬─────────────────────────────┬────────────┘
                            │                             │
      Classic (unchanged)   │                             │   Associations (new)
      QuizQuestion          │                             │   AssociationBoard / Column / Tile
      UserAnswer            │                             │   AssociationGame / Player / Move
      AnswerGradingService  │                             │   AssociationEngine  (pure rules)
      QuizScoring           │                             │   AssociationScoring
      SubmitAnswerService   │                             │   AssociationPlayService (solo)
      MatchOrchestrator     │                             │   AssociationMatchOrchestrator
      QuizSessionService    │                             │   AssociationBoardService (authoring)
```

The one piece of logic the two share is **matching typed text**: `TypeTheAnswerMatcher`'s
normalisation (§6).

### 3.2 Backend components (new)

Folder layout follows the existing split: controllers and their services under
`Controllers/Quizzes/…`, the multiplayer runtime under `Services/QuizSessionServices/`.

| Component | Role |
|---|---|
| `Models/Quiz/QuizFormat.cs` | The enum: `Classic = 0`, `Associations = 1`. |
| `Models/Associations/*.cs` | The entities in §4. |
| `Services/Associations/AssociationEngine.cs` | **Pure** rules: legality, state transitions, scoring calls. No EF, no clock, no I/O (§5). |
| `Services/Associations/AssociationScoring.cs` | The §2 formulas, parameterised by `AssociationRules`. |
| `Services/Associations/AssociationRules.cs` + `IAssociationRulesProvider` | The tunable numbers and where a game gets them (§2.1). |
| `Services/Associations/AssociationGuessMatcher.cs` | A Guess vs a solution, through the shared matcher core (§6). |
| `Services/Associations/AssociationViews.cs` | Builds what a client may see from engine state (§7). The only place a view is made. |
| `Repositories/AssociationBoardRepository.cs`, `AssociationGameRepository.cs` (+ interfaces) | All data access for boards and games — nothing else touches `DbContext` (CLAUDE.md). Built as two, one per table group. |
| `Controllers/Quizzes/AssociationQuizzesController.cs` + `AssociationBoardService` | Authoring: create, read for editing, update (§12). |
| `Controllers/Quizzes/AssociationSessionsController.cs` + `AssociationPlayService` | Solo play (§8). A guest twin mirrors `GuestQuizSessionsController` — at release (§8.5). |
| `Services/QuizSessionServices/AssociationMatchOrchestrator.cs` | The Duel loop (§9). |
| `Common/QuizFormatGuard.cs` | `EnsureClassic(format)` / `EnsureFormat(actual, expected)` → `AppValidationException`. One message, used by every entry point in §10. |

### 3.3 Frontend components (new)

| Location | Role |
|---|---|
| `src/types/association-types.ts` | Board, view, move and event types. `QuizFormat` goes in `quiz-types.ts`. |
| `src/pages/Dashboard/Pages/Quiz/components/Association-Board-Form/` | The board builder (§12.3). |
| `src/pages/Quiz/Associations/board/` | The board, used by Solo, Duel and the results review — one component, driven by a view. *(Built, Phase 4.)* |
| `src/pages/Quiz/Associations/solo/`, `api/` | The start route and the game page; the API calls and hooks live in `api/association-play.ts` (`useAssociationGame`, `useAssociationMoves`). *(Built, Phase 4.)* |
| `src/pages/Quiz/Associations/multiplayer/` | `useAssociationMatch` and the Duel screen. |
| `src/pages/Quiz/Associations/results/` | Results and review. *(Built, Phase 4.)* |

The golden rule of the classic play stack applies unchanged: **guesses flow up, state flows down**
([`quiz-playing-architecture.md`](./quiz-playing-architecture.md) §1). The board component never
calls the API.

---

## 4. Data model

### 4.1 Content — the Board — moved

**Implemented (2026-09-23); now in [`associations.md`](./associations.md) §8.1.**

### 4.2 Play — the game and its moves — moved

**Implemented (2026-09-23); now in [`associations.md`](./associations.md) §9.1**, and the reasoning
(a move log, not a stored state) is [ADR 0020](../adr/0020-an-associations-game-is-its-move-log.md).
Two differences from this plan: the move entity is **`AssociationGameMove`** (so it can't be
confused with the engine's `AssociationMove` record), and the game has a **`FirstSeat`** column,
because a Duel's replay needs to know who opened.

### 4.3 Versioning and 4.4 The `Quiz` changes — moved

**Implemented; now in [`associations.md`](./associations.md) §1 (the `Quiz` fields) and §8.2
(copy-on-write Boards).**

---

## 5. The rules engine — moved

**Implemented (2026-09-22); now in [`associations.md`](./associations.md) §6.**

## 6. Checking a Guess — moved

**Implemented (2026-09-22); now in [`associations.md`](./associations.md) §7.**

---

## 7. What the client may see — moved

**Implemented (2026-09-23); now in [`associations.md`](./associations.md) §9.3**, pinned by
`AssociationViewSecrecyTests`.

---

## 8. Solo play

**§8.1–§8.4 implemented (2026-09-23); now in [`associations.md`](./associations.md) §9.2
(endpoints), §9.4 (the clock), §9.5–§9.6 (leaving, resuming, abandonment) and §9.9 (results and
review).** Differences from this plan, each deliberate:

- **Starting while a game is running returns that game** (`resumed: true`) instead of Classic's
  "active session" refusal and Resume / Start Fresh screen: the board clock runs regardless, so
  resuming is the useful default, and the game page offers "Start over".
- **No `resolve-and-resume` route.** `GET /{id}` settles an expired game on read, which is all that
  resolving means for a Board; `abandon-and-restart` is `POST /{id}/restart`.
- **The results page is its own route**, `/associations/results/:id`, not a branch inside
  `/quiz/results/:id` — which now redirects a Board session there.

### 8.5 Guests

**Still a plan — moved to the release step (2026-09-23).** Under D17 no guest can reach a Board
(guests are never admins), so a guest endpoint built now would be unreachable and untestable end to
end. The deletion half is done and tested ([`associations.md`](./associations.md) §9.6, §9.8); the
guest twin of the routes and the free-quiz cookie come when the format is released.

Solo is the only guest-playable way (Public quizzes only, as for Classic —
[`../auth/guest-play.md`](../auth/guest-play.md)). The one-free-guest-quiz gate counts it the same
as a Classic play. **Guest data must be deleted with the session**: the guest cleanup paths (after
viewing results, and the abandonment sweep, which *deletes* guest sessions) must remove the
`AssociationGame`, its players and its moves. `AssociationGamePlayer` cascades from `QuizSession`;
the game and moves are deleted explicitly, because a game is not owned by a single session in a
Duel. Covered by a test, since this is exactly the kind of promise that has silently broken here
before.

---

## 9. Multiplayer

### 9.1 In the lobby

The lobby is shared and stays one lobby: create, join, ready, chat, leave and rematch are
unchanged. What changes:

- **`SelectedQuizView` carries `Format`**, filled server-side from the quiz in `QuizHub.SelectQuiz`
  (never trusted from the payload — the rest of that DTO is display-only already).
- **An Associations quiz means a Duel, and a Duel needs exactly 2 participants.** `canStartQuiz`
  gains that rule and the lobby says why the start button is disabled with 3+ players; the server
  re-checks in `StartMatchAsync`, as it does the ≥2 rule. No new lobby state is needed — the rule
  is derived from the selected quiz's `Format`, which late joiners already receive through the
  `QuizSelected` replay. (If a future lobby setting is added, e.g. choosing 1v1v1, the late-joiner
  rule in [`multiplayer.md`](./multiplayer.md) §2 applies: replay it in `JoinSession`.)
- **`StartMatch` dispatches by format** — Classic to `IMatchOrchestrator`, Associations to
  `IAssociationMatchOrchestrator`.
- **Both orchestrators use the same `MatchCts` liveness guard and the same `ResetToLobbyAsync`**,
  called from each loop's `finally`. The rematch bug (§3.2–3.3 of `multiplayer.md`: "a
  forward-only phase enum cannot double as a mutex") must not be reintroduced by a second loop
  with its own idea of "busy". The reset clears the Associations runtime fields too.

### 9.2 Duel

`AssociationMatchOrchestrator` holds the engine state in memory on `MultiplayerSession` for the
length of the match. Loop:

1. `BoardStarted(view, seats, firstSeat)` after the shared countdown.
2. `TurnStarted(seat, deadlineUtc)`.
3. Wait for hub calls from **the Seat whose turn it is** (`OpenTile`, `GuessAssociation`,
   `PassTurn`) or for the deadline. Each goes through the engine; each accepted move is broadcast
   (`TileOpened`, `GuessResult`) to the room. A call from the wrong Seat is rejected with a
   `HubException`, not ignored silently — the other player's UI should never send it, and if it
   does, that's a bug worth seeing.
4. Repeat until the game ends (Final, endgame over, or forfeit — §1.3) → `BoardEnded(fullBoard, scores, winner)` →
   persist (§9.5) → `ResetToLobbyAsync` in `finally`.

Winner: higher score; equal scores → no winner (`Match.WinnerUserId` null — a tie, already
supported).

### 9.4 Hub surface

| Client → server | Server → client |
|---|---|
| `OpenTile(sessionId, tileId)` | `BoardStarted(view, seats, firstSeat)` |
| `GuessAssociation(sessionId, target, text)` | `TurnStarted(seat, deadlineUtc, isEndgame, endgameTurnsLeft)` |
| `PassTurn(sessionId)` | `TileOpened(tile, bySeat)` |
| | `GuessResult(seat, target, text, isCorrect, solution?, points)` |
| | `BoardEnded(result)` |

On the client, `useAssociationMatch` is a **separate listener set with its own event names**.
Because `connection.off(name)` removes every handler for that name, no Associations event may
reuse a Classic event name, and no two hooks may subscribe to the same one (`multiplayer.md` §1).

### 9.5 What a match leaves behind

Written once, at the end, the way `PersistMatchAsync` does it
([`multiplayer.md`](./multiplayer.md) §7.3): one `Match`, one `QuizSession` per player
(`Mode = Multiplayer`, `MatchId`, `TotalScore` = their board points), the one `AssociationGame`,
its two players and all moves. An interrupted match
writes nothing. A player who never made a move gets no session row, matching §7.2's rule.
`EnsureSessionOrMatchPeerAccessAsync` already lets match peers read each other's results, and the
Duel review is naturally shared (one game, two seats).

### 9.6 Keeping 2v2 and 1v1v1 possible

Not built in v1, but designed for:

- **Turns belong to a Seat, not a user.** The engine never sees a user id. A team is a Seat with
  two sessions in `AssociationGamePlayer`.
- **Who may act for a Seat** is decided by the orchestrator, not the engine — so "either teammate
  may submit" is an orchestrator rule later, not an engine rewrite.
- **Suggestions** (a teammate proposing a Guess) would be a new team-only SignalR group and a new
  event pair; nothing in v1 needs to change shape for them.
- **1v1v1 is a Seat count, not a new engine.** Turn order is `(seat + 1) % seatCount` and the
  endgame counts per Seat, so three Seats work unchanged. What it *does* need is a winner rule for
  three (ties between two of them) and lobby UI for choosing it — both future work.

### 9.7 A prerequisite for Duel: reconnect

`multiplayer.md` §8 records that after an automatic reconnect nothing re-joins the room, so the
client stops receiving group broadcasts and is removed from the roster after 5s. In Classic that
costs a player some rounds. In a turn-based Duel it **ends the game** (D10) for a two-second
network blip. Binding `onreconnected` to re-invoke `JoinSession` is therefore part of Phase 5, not
a nice-to-have.

---

## 10. Guarding Classic

**Backend: implemented (2026-09-22) — the table of guarded entry points, and why each needs its
own test, is in [`associations.md`](./associations.md) §2.** Two deliberate differences from what
this section first planned:

- **The lobby refuses a board at `QuizHub.SelectQuiz`**, not at `MatchOrchestrator.StartMatchAsync`
  — so a lobby never shows a pick it can't play. `StartMatchAsync`'s existing "This quiz has no
  questions" is the backstop. When the Duel lands (Phase 5) the refusal becomes the dispatch (§9.1).
- **`QuizService.CreateAiQuizAsync` needs no guard**: it only ever *creates* a quiz, and a new quiz
  is Classic unless a board endpoint says otherwise.

**Still to do, in the phase that makes them reachable:**

| Where | Phase | Why then |
|---|---|---|
| ~~`SessionAbandonmentService` — a format branch using the board time (§8.3), not a refusal~~ | ~~4~~ | **Done 2026-09-23** — feature doc §9.6. |
| ~~`UserStatsService`, `ReportService` — filter to Classic (§11)~~ | ~~4~~ | **Done 2026-09-23** — feature doc §9.7. |
| ~~**Frontend** — `quiz-start-modal`, the `/choose-quiz` start, the Classic results route, the profile history list~~ | ~~4~~ | **Done 2026-09-23** — feature doc §9.9. `quiz-duration.ts` needed nothing: a Board's time is its `TimeLimitInSeconds`, which it already formats. |
| **Frontend** — the lobby's quiz picker | 5 | Still lists Boards to admins; picking one gets the hub's "can't be played in a lobby yet". It becomes the Duel's dispatch (§9.1). Logged in `known-issues.md`. |
| ~~**Frontend** — the dashboard quiz tables, the single-quiz page, the edit route (→ board builder), the create-method dialog~~ | ~~3~~ | **Done 2026-09-23** — feature doc §8.5. |

**Frontend done in Phase 1:** `QuizFormat` and `format` on the quiz types, and the quiz card's size
line ("Associations board" instead of "0 questions").

---

## 11. Stats, history and analytics

**The v1 behaviour is implemented (2026-09-23)** — Classic-only profile stats and reports, the
history badge, the "not available" analytics state — and described in
[`associations.md`](./associations.md) §9.7. What remains is Phase 6:

Phase 6 (later) adds board analytics that mean something for the format: Final-solved rate, Tiles
opened before the Final, the hardest Column (lowest solve rate), and common wrong Guesses per
target.

---

## 12. Authoring — moved

**Implemented (2026-09-23); now in [`associations.md`](./associations.md) §8** (API, validation,
builder, sample board). Two differences from what this section planned: the builder has **no local
draft** yet (logged in `known-issues.md`), and the Board is **not** part of the create-quiz
dialog's second step — it is a third card on the first.

---

## 13. Not in v1

- **AI board generation.** The model would propose, the code decide (ADR 0003) — needs its own
  prompt, parser and validation.
- **Import / export of Board content** (the `Format` column is exported; the Board itself isn't).
- **Image, audio or video Tiles.**
- **Team duel (2v2)** — designed for (§9.6), not built.
- **Spectators** in a Duel lobby with more than two people.
- **Top 100** — its own format, later, with the data-source question still open.

---

## 14. Phases

Each phase ships **code, tests and docs together** (CLAUDE.md: a structural change is not
finished until it is written down), ends with `graphify update .`, and puts anything found and
deferred into `known-issues.md`. A phase is done when its "Done when" line is true — not when its
code compiles.

| Phase | Scope | Tests | Docs | Done when |
|---|---|---|---|---|
| **0 — Groundwork** *(done 2026-09-22)* | This plan, ADR 0018, the quiz glossary. The `Quiz` query-filter finding, resolved by **removing** the dead visibility filter rather than reviving it — reviving it broke Unlisted plays in tests ([ADR 0019](../adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md)). | `QuizQueryFilterTests`: soft delete hides; Draft/Unlisted are not hidden by EF; a stranger's Unlisted session loads its quiz. Full suite green (360). | ADR 0019; `quiz-visibility.md`, `known-issues.md`, `testing.md`, `CLAUDE.md`. | Done. |
| **1 — Format** *(done 2026-09-22)* | `QuizFormat` + migration `AddQuizFormat`; `Format` on `QuizDTO` / `QuizSummaryDTO` and the frontend types; `QuizFormatGuard` at every Classic entry point that a board can reach today (feature doc §2); export `Format` column, import refusal; the card's size line; the `QuizCM.TimeLimitInSeconds` comment corrected. `SelectedQuizView` did **not** gain `Format` — the lobby refuses boards at selection instead, and the field comes with the Duel (Phase 5). The remaining frontend branches moved to Phases 3–4 (§10). | `ClassicEntryPointGuardTests` (15): one per guarded entry point, the stranger-gets-no-format-hint cases, the projections, the guard helper. Frontend: `card-model.test.ts`. | `associations.md` created (§1–§2). `quiz-card.md`, `import-templates/README.md`, `multiplayer.md`. | Done. |
| **2 — Engine** *(done 2026-09-22)* | `AssociationEngine` (pure: `Apply`, `End`, `Replay`), `AssociationScoring`, `AssociationRules` + `Associations:Rules` options validated at startup + `IAssociationRulesProvider`; `TypeTheAnswerMatcher.IsMatch` extracted as the core, `AssociationGuessMatcher` on top. No DB, no UI. | 68 tests in `QuizAPI.Tests/Associations/`: every legality rule, every §4 scoring example under default and changed rules, the endgame worked example, endgame length 3, three Seats, replay determinism, replay under the snapshot vs changed config, corrupt-log refusal, settings validation and binding, Albanian diacritics. Existing matcher tests unchanged and green. Full suite: 443. | `associations.md` §3–§7; `typed-answer-matching.md` (the extracted core); `configuration.md`; `testing.md`; glossary (Seat, Move). | Done. |
| **3 — Boards** *(done 2026-09-23)* | Board entities + migration `AddAssociationBoards`, repository, `AssociationBoardService` + `AssociationBoardValidator`, the three authoring endpoints, copy-on-write edits, the builder (create on both dashboards, edit on the admin one), the create dialog's third card, `quizEditPath`, the single-quiz page and quiz table for boards, a Development seed board. **Moved to Phase 4:** the game tables (`AssociationGame`, players, moves) and the rules snapshot — nothing writes them until play exists. | Backend: 21 new (`AssociationBoardServiceTests`, `AssociationBoardValidatorTests`) — create, publish gate, board time, atomicity on invalid input, owner/stranger/admin edit read, copy-on-write, metadata-only edit, trim-only edit, stale version, stranger update, Classic refused, stored Board → engine key. Full suite 464. Copy-on-write also checked on real PostgreSQL 16, and the endpoints end-to-end over HTTP. Frontend: `association-quiz.test.ts` (9); all 148 unit tests pass. | `associations.md` §8; `quiz-editing.md`; `quiz-analytics-page.md`; `known-issues.md`; `testing.md`. | Done. |
| **4 — Solo** *(done 2026-09-23)* | The game tables (`AssociationGame`, `AssociationGamePlayer`, `AssociationGameMove`, `RulesJson`) + migration `AddAssociationGames`; [ADR 0020](../adr/0020-an-associations-game-is-its-move-log.md); `AssociationPlayService` + `AssociationSessionsController` (start / read / open / guess / give-up / restart), the server clock, resume and restart; `AssociationViews`; `QuizPlayAccess` extracted; the abandonment format branch; game deletion on every session-deleting path; Classic-only stats and reports; `format` on the session DTOs; the board component, the start / game / results screens, `quizPlayPath`, the start dialog, history and the Classic-results redirect. **Moved to the release step:** the guest twin (§8.5) — unreachable while D17 holds. | Backend: 29 new — `AssociationPlayServiceTests` (21: start, resume, settle on start, access incl. Unlisted token and admin read-only, every move, refusals recorded as nothing, TimeUp at the deadline, resume before/after it, the rules snapshot, restart of a running and a finished game, a refused restart ending nothing), `AssociationViewSecrecyTests` (2), `AssociationLifecycleTests` (4: abandonment deadline, bulk ending, guest discard, delete), the play endpoints' preview gate, Classic-only stats. Full suite 503. Mutation-checked: leaking Tile text fails the secrecy test; dropping the abandonment branch fails the lifecycle test. Real PostgreSQL 16: the migration applied, a full game over HTTP. Frontend: `board-model.test.ts` (10), `quiz-play-path.test.ts` (4); 164 unit tests pass; a full game, the time-up path, history and the redirect driven in a browser. | `associations.md` §9 (and §0, §2, §5); ADR 0020; `session-lifecycle.md`, `guest-play.md`, `user-stats-history.md`, `reports.md`, `testing.md`, `known-issues.md`, glossary. | Done — for a signed-in player. Guests: at release (§8.5). |
| **5 — Duel** | Reconnect fix (§9.7); the exactly-2 lobby rule; dispatch; `AssociationMatchOrchestrator` (Duel); hub methods and events; `useAssociationMatch`; Duel screen; persistence. | Orchestrator driven with a fake clock: turn passing, wrong-Seat rejection, turn timeout, the endgame, forfeit, persistence written once, nothing written on interruption. (This also starts the orchestrator tests `multiplayer.md` §8 says don't exist.) | `multiplayer.md`: dispatch, the exactly-2 rule, new events, the reconnect fix; `associations.md`: Duel. An ADR if the turn-timeout or forfeit rules turn out to be a real trade-off. | Two players can play a full Duel, rematch, and both review it. |
| **6 — Board stats** | The analytics in §11. | Aggregates over seeded games. | `quiz-analytics-page.md`, `user-stats-history.md`. | An author can see how their Board plays. |

When Phase 6 lands, this file is deleted and `associations.md` is the only description.

---

## 15. Mistakes this codebase has already made, and where this plan avoids them

| It happened before | Where | This plan |
|---|---|---|
| State announced only by a broadcast was invisible to late joiners | quiz pick, 2026-07-31 | The Duel rule is derived from `Format`, which the existing `QuizSelected` replay already carries — no new broadcast-only state (§9.1). |
| A second "is this busy?" check that wasn't loop liveness | rematch, 2026-07-31 | Both orchestrators share `MatchCts` + `ResetToLobbyAsync` (§9.1). |
| Two hooks on one event name; `off(name)` removed both | multiplayer hooks | Separate event names, separate hook (§9.4). |
| A scheduled job written but never registered; a fallback that crashed | session sweeper, 2026-09-10 | Abandonment for Boards reuses the one registered service (§8.3), and guest deletion gets a test (§8.5). |
| A rule enforced in one layer, "kept in sync" by hand in another | Unspecified lookups | The engine is the only place rules live (§5); views are built in one place (§7); guards are one helper (§10). |
| A filter that broke only for guests | question filter, 2026-08-19 | Guest play tests in Phase 4; the `Quiz` filter fix in Phase 0. |
| Plans cited from source comments so they can't be deleted | four older plans | Comments cite `associations.md`, never this file. |
| Zero shown where "no data" was meant | analytics page | Board analytics say "not available" (§11). |
| Server clock vs SQL `now()` giving negative elapsed time | question start time | The board deadline is stamped from the app clock (§8.2). |
