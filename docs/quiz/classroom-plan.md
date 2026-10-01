# Classroom — implementation plan

A **Teacher** hosts an Associations Board for a class split into 2–4 **Teams** taking turns on one
shared Board — **Host mode**. A later phase, **Live classroom**, lets students join on their own
devices. The words are in [`glossary.md`](./glossary.md) ("Classroom"); the rules this builds on are
[`associations.md`](./associations.md).

> **Status: planned (2026-10-01), nothing built.** Branch `feature/classroom-host-mode`. This is a
> plan: as each phase lands, what is true moves into a feature doc (`classroom.md`,
> `../auth/teacher-role.md`) and the phase is marked done here. When all of Host mode has landed the
> plan is folded and deleted (docs/development/documenting-changes.md).

---

## 0. Decided (2026-10-01)

| # | Decision |
|---|---|
| C1 | **Host mode first**, shipped on its own; Live classroom is a later phase on top of it (§9). |
| C2 | **Associations only.** A Teacher-hosted Classic (Kahoot-style) game is a separate, later feature. |
| C3 | **Solo's rules don't change.** (Considered and dropped: forbidding a Tile after a correct Guess in Solo — a Solo player who is stuck must be able to open another Tile.) |
| C4 | **Teacher is a role**, granted by an Admin, by an invite code that carries it, or by the user asking and an Admin approving (§2). |
| C5 | **2–4 Teams on one shared Board, under the Duel's rules** (§3). A Team is a Seat ([ADR 0023](../adr/0023-a-hosted-team-is-a-seat.md)). |
| C6 | **Clocks:** "No time limit" (no clocks at all — the Teacher paces the room), or a game time of 5–60 min **with** a required turn time of 30/60/90/120 s. A turn that runs out passes. When the game clock runs out, **the round is finished first** so every Team has had the same number of turns (§3.3). |
| C7 | **One device is enough; a Display is optional.** The Teacher's device is the Controller. "Show on a screen" gives a Screen code; any browser at `/screen` shows the game read-only, **with no login** ([ADR 0024](../adr/0024-a-display-needs-no-login.md)). Up to 3 Displays. |
| C8 | **Answer key** on the Controller, tap to reveal, **only while a Display is connected**. |
| C9 | **Undo** of the latest move, with a confirm, recorded as a move ([ADR 0025](../adr/0025-undo-is-a-move.md)). |
| C10 | **Which Boards:** any the Teacher could play, plus their own in any status (Draft, Private). |
| C11 | **Classes:** saved, named, up to 40 first names; optional when hosting; shuffle into Teams, drag to adjust; Teams named Red/Blue/Green/Yellow by default, renamable. |
| C12 | **Afterwards:** a Hosted games list and a results screen (Teams ranked, ties shown as ties, the revealed Board with who solved each slot). Not in the Teacher's own stats; students have no stats. |
| C13 | **Pause** freezes both clocks; closing the tab pauses. Resume from Hosted games. A game untouched for **7 days** is ended as abandoned, scores kept. |
| C14 | **End game** (confirmed) ends at once with the scores as they are. **Play again**: same Teams, same or another Board, the first Team rotates. |
| C15 | **No Captain in Host mode** — the Teacher makes every move. Captain is a Live classroom term. |
| C16 | **Entry points:** a **Host** button beside Play in a Board's start dialog (Teachers only), and a **Classroom** section in the user dashboard: Classes, Hosted games, Host a board. Easy to move later. |

---

## 1. Phases

Each phase lands with its tests and its docs, on the branch, in order. "Done" means the suite
passes, the new tests have failed at least once with the behaviour broken (CLAUDE.md, Tests), and
the docs say what is now true.

| Phase | What | Tests | Docs |
|---|---|---|---|
| **1 — Teacher role** *(done 2026-10-01)* | The `Teacher` role (seeded); not "elevated" (§2.1); grant/remove from the Users table; Teacher invite codes; the request flow (§2.2); Teachers see Associations during the preview (§2.3). | Role seeding; an Admin can grant/remove Teacher and delete a Teacher; an Admin can mint a Teacher code; request → approve/decline, one open request, the 30-day wait, notifications; a Teacher sees boards in every read `VisibleTo` covers, a plain User still doesn't (extend `PreviewFormatAccessTests`). Frontend: the request button's states. | `../auth/teacher-role.md` (new); `user-role-management.md`, `invite-code-system.md`, `associations.md` §0. |
| **2 — Classes** | `Class` + `ClassStudent`, CRUD API owned by the Teacher, the Classes page. | Ownership (a Teacher can't read or edit another's Class), the 40-name cap, name validation, Teacher-only. | `classroom.md` (new) §Classes. |
| **3 — Hosted games: engine and API** | `PlayStyle.Hosted`, `HostedTeam`, the game's clock columns, `MoveKind.Undo` and `TurnTimedOut` handling, the service and REST API for the Controller (§4–§5). No UI yet. | Engine: Duel rules with 2/3/4 Seats; Undo in every allowed position and refused elsewhere; replay with Undo. Service: start (board access per C10, team count, clock combinations), every move, turn time-out, the game clock finishing the round, pause/resume (clocks frozen), end game, the 7-day abandonment. Secrecy: the Controller view without a Display has no answers. | `classroom.md` §Host mode; `associations.md` §3 (a pointer), ADRs 0023/0025 checked against what was built. |
| **4 — Controller UI** | Host setup (Board, Class, Teams, clocks), the Controller screen, pause/end/undo, the Answer key toggle (inert until Phase 5). | Unit: the setup model (shuffle, team limits), the Controller's prompt per state. E2E: one hosted game start to finish against the real API. | `classroom.md` §Screens. |
| **5 — Displays** | Screen codes, the `/screen` page, the SignalR group per hosted game, live updates, disconnect-all, the Answer key gated on a connected Display. | Code: issue, expiry when the game ends, replacement on disconnect-all, the 3-Display cap, rate-limited attempts. Secrecy test over the Display payload (ADR 0024). E2E: a Controller and a Display in two browser contexts, a move on one appearing on the other. | `classroom.md` §Displays; `multiplayer.md` (the new hub group). |
| **6 — Afterwards** | Hosted games list, results screen, Play again, the abandonment sweep wired in. | Listing is per Teacher; results ranking and ties; Play again rotates the first Team; abandonment after 7 idle days. | `classroom.md` §Afterwards; fold this plan. |

---

## 2. The Teacher role

### 2.1 What it is

`Teacher` is a role alongside `User`, `Admin`, `SuperAdmin`, held **on top of** `User`. It grants:
hosting (Host mode), Classes, and — while Associations is in preview — seeing, playing and
authoring Associations (§2.3). Nothing else: no admin dashboard, no power over other accounts.

**It is not "elevated".** `RoleRules.IsElevated` currently means "anything but `User`", and two
rules read it: only a SuperAdmin may delete an elevated account, and an elevated role on an invite
code needs the minting rails. Teacher is a capability, not authority over others, so `IsElevated`
becomes "Admin or SuperAdmin" explicitly — an Admin may delete a Teacher and mint a Teacher code.
The change is tested from both rules' side.

### 2.2 Getting it

- **An Admin grants it** in the Users table (the existing role editor; Teacher appears in the list).
- **An invite code carries it** — the existing `GrantedRoleId` mechanism, no new code.
- **The user asks.** Account settings gets **Request teacher access** with one optional note
  (school, subject). An Admin sees pending requests in the admin dashboard and approves or declines,
  optionally with a reason; the user gets a notification either way (the existing
  `NotificationService`). One open request per user; after a decline, a new one is accepted after
  30 days. Approving grants the role through the same service as the Users table, so it is audited
  the same way. Table: `TeacherAccessRequest` (user, note, status, decided by, decided at, reason).

### 2.3 Teachers and the Associations preview

`QuizFormatAccess.IsAvailableTo(format, isAdmin)` and `VisibleTo(isAdmin)` take "may see preview
formats" instead of "is admin" — true for Admin, SuperAdmin and Teacher. Every caller passes the new
flag; the rule stays in one place (CLAUDE.md, "A new read of quizzes applies VisibleTo").

---

## 3. Host mode — the game

### 3.1 Turns and scoring

Exactly the Duel (`associations.md` §3.3, §4) with 2–4 Seats, one per Team:

1. A turn opens exactly one closed Tile.
2. Then it may Guess any unsolved Column or the Final. Correct → scored to that Team, and it may
   Guess again (not open). Wrong → the next Team's turn.
3. **Pass** hands over at any point after the Tile.
4. **Endgame:** from the first turn that begins with no closed Tile, each Team gets 2 guess-only turns
   (`EndgameTurnsPerSeat`), then the game ends.

Turn order is `(seat + 1) % seatCount`; the first Team is random, and Play again rotates it.

### 3.2 The Teacher's moves

Open (a Tile), Guess (target + text), Pass, **Undo** (the latest effective move, confirmed — ADR
0025), **Pause / Resume**, **End game** (confirmed; `EndReason.EndedByHost`).

### 3.3 Clocks

- **No time limit:** no game clock, no turn clock. The game ends by the Final, the endgame, or End
  game.
- **Timed:** `GameSeconds` (300–3600) and `TurnSeconds` (30/60/90/120), both required.
  - A turn that runs out records `TurnTimedOut` and passes — the Duel's behaviour, enforced on the
    server. A Guess sent after it is refused ("Time ran out — it's Blue's turn") and keeps its text
    on the Controller.
  - When the **game clock** runs out, the game enters its **last round**: play continues until the
    turn would pass back to the Team that started the game, then it ends (`TimeUp`). So every Team
    has had the same number of turns. If the endgame or the Final ends it first, that wins.
- **Pause** freezes both: the game stores the time left on each, not a deadline, while paused.
  Closing the Controller's tab pauses (on disconnect, after the same 5 s grace the lobby uses); a
  Display disconnecting doesn't.
- The turn clock is enforced by a timer on the server that is **rebuilt from the database** on start
  (the game row says which games are running and their deadlines), so a restart loses nothing.

### 3.4 Ending

`FinalSolved`, `EndgameOver`, `TimeUp` (after the last round), `EndedByHost`, `Abandoned` (7 days
with no move and no resume — the existing `AbandonedSessionSweeper` gains a hosted-game branch).
Every ending plays the reveal.

---

## 4. Data

| Table | Columns (new) | Notes |
|---|---|---|
| `AssociationGame` | `HostUserId` (null except Hosted), `GameSeconds?`, `TurnSeconds?`, `TurnDeadlineUtc?`, `PausedAt?`, `GameSecondsLeft?`, `TurnSecondsLeft?`, `LastRound` (bool), `LastActivityAt` | `PlayStyle.Hosted = 2`. `SeatCount` 2–4. |
| `HostedTeam` (new) | `GameId`, `Seat`, `Name` (≤ 30), `Colour`, `StudentsJson` | Students as they were that day — editing the Class later doesn't rewrite a past game. |
| `AssociationGameMove` | `CancelsSeq?` | Set on an `Undo` move. |
| `Class`, `ClassStudent` (new) | Class: `OwnerUserId`, `Name` (≤ 40); Student: `ClassId`, `Name` (≤ 30), `Order` | Max 40 students. Deleted with the owner's account (anonymisation path). |
| `ScreenCode` (new) | `Code`, `GameId`, `CreatedAt`, `RevokedAt?` | One live code per game. |
| `TeacherAccessRequest` (new) | §2.2 | |

Account deletion: a Teacher's Classes, hosted games and Teams are theirs and go with the account
(the anonymisation sweeper, `docs/auth/account-closure.md`) — students' first names are the only
personal data, and they leave with it.

---

## 5. API and real time

- `api/hosted-games`: `POST` (start: board id, share token if Unlisted, teams, clocks),
  `GET {id}` (the Controller view), `POST {id}/open|guess|pass|undo|pause|resume|end`,
  `GET` (the Teacher's Hosted games), `POST {id}/again`, `POST {id}/screen-code`,
  `DELETE {id}/screens` (disconnect all). `[Authorize(Roles = "Teacher")]` plus ownership: a game is
  only its host's (CLAUDE.md: permission in the controller, ownership in the repository).
- `api/classes`: CRUD, Teacher-only, owner-clamped.
- `api/teacher-requests`: `POST` (ask), `GET mine`; admin: `GET`, `POST {id}/approve|decline`.
- **SignalR:** a `HostedGameHub` (separate from `QuizHub`, which is the lobby's) with one group per
  hosted game. The Controller joins as host (authenticated); a Display joins with a Screen code
  (anonymous, rate-limited). Each accepted move broadcasts the new **Display view** to the group;
  the Controller gets its own view from the REST answer, as Solo does.
- **Views:** `HostedControllerView` (board, Teams, scores, whose turn, phase, clocks, endgame,
  connected Displays, and — only when a Display is connected — `answerKey`), and
  `HostedDisplayView` (the same minus moves-controls and never the key). Both built in
  `AssociationViews`; both covered by the secrecy test.

---

## 6. Screens

- **Host setup** (`/classroom/host/:quizId`): Board summary, Class picker (optional), number of
  Teams (2–4), Shuffle into teams, drag students between Teams, rename Teams, clocks ("No time
  limit" or minutes + turn seconds), Start.
- **Controller** (`/classroom/games/:id`): the shared `AssociationBoard` with Open and the guess
  slots live only for the current Team's phase; Teams strip with scores and whose turn; both clocks;
  Pass, Undo (the last move named: "Undo: opened B2"), Pause, End game; "Show on a screen" (the code
  and the connected-screens count); Answer key (only with a Display). Fits a phone.
- **Display** (`/screen`): code entry, then the board large, the Teams and scores, whose turn, the
  clocks, the last Guess, the reveal and the final ranking. No controls.
- **Classes** and **Hosted games** under the dashboard's Classroom section.

The Board component is shared with Solo and the Duel (`associations.md` §9.9) — Host mode adds no
second board.

---

## 7. Not in Host mode

Captains, students' devices, an answer key without a Display, undoing more than one move, per-Board
rule overrides, Classic quizzes.

## 8. Risks

- **The Controller is projected with the key showing.** Mitigated by C8 (Display connected, tap per
  solution). Not eliminable: a Teacher can mirror their phone.
- **Clock correctness across pause/restart.** The clock state is persisted and the timer rebuilt;
  tests pass times in, as the Duel's do.
- **Preview leakage** when `VisibleTo` gains a third role — covered by extending the access tests to
  every read they already cover.

## 9. Later — Live classroom

Students join the hosted game on their devices with a code (no account), each into a Team; one
member is the Team's **Captain** and submits its moves after seeing teammates' proposals. Built on
Host mode: the same game, Seats, clocks and Displays. Planned when Host mode has been used in a
class.
