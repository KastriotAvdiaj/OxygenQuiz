# Classroom — Teachers, Classes and Host mode

What exists **today** for Teachers playing Associations with a class. The words are in
[`glossary.md`](./glossary.md) ("Classroom"); what is still being built is
[`classroom-plan.md`](./classroom-plan.md), and moves here as it lands. The role itself is
[`../auth/teacher-role.md`](../auth/teacher-role.md).

> **Status (2026-10-02):** built — the Teacher role, Classes, and Host mode end to end: setup,
> the Controller, Displays, Hosted games and results. Not yet: an end-to-end (Playwright) test of
> a hosted game, and a run in a real classroom ([`classroom-plan.md`](./classroom-plan.md) §1).

---

## 1. Classes

A **Class** is a Teacher's saved, named list of students — **first names only, not accounts** —
that Teams are formed from when hosting. It is optional: a Teacher can host with Team names alone.

- **Rules** (`ClassService`): a name of up to 40 characters, **unique per Teacher**
  (case-insensitive); up to **40 students**, each up to 30 characters. Names are trimmed and inner
  whitespace collapsed; blank lines are dropped. **Duplicate student names are allowed** — two Artas
  in one class happens, and the Teacher tells them apart.
- **How many Classes is the plan's:** one on Free and Plus, unlimited on the Teacher plan
  ([`../auth/paid-plans.md`](../auth/paid-plans.md)). Only creating one more is refused — a host
  over the limit keeps, edits and hosts from every Class they have (ADR 0026).
- **Ownership:** every read and write goes through `IClassRepository` with the Teacher's id, so
  another Teacher's Class is a 404, never a 403 that confirms it exists. `ClassesController` is
  `[Authorize(Roles = RoleRules.HostRoles)]` — Teacher or SuperAdmin
  ([`../auth/teacher-role.md`](../auth/teacher-role.md) §1.1).
- **Saving replaces the whole list**, in the order given.
- **Account anonymisation removes a Teacher's Classes** (`AccountClosureService.AnonymiseAsync`):
  they are other people's personal data, kept only for that account.

`/api/classes` — `GET`, `GET {id}`, `POST`, `PUT {id}`, `DELETE {id}`.

**Screen:** *My dashboard → Classroom → Classes* (`src/pages/Classroom/ClassesPage.tsx`): a card per
Class; New / Edit opens a dialog with the name and a box of names, one per line, with a live count
against the limit (`parseStudents` mirrors the server's cleaning).

Tables: `Classes` (`OwnerUserId` → Users, cascade), `ClassStudents` (`ClassId` → Classes, cascade,
`Order`). Migration `AddClasses`.

Tests: `QuizAPI.Tests/Classroom/ClassServiceTests.cs`, `src/pages/Classroom/api/__tests__/classes.test.ts`.

---

## 2. Host mode — the game

A Teacher hosts one Board for **2–4 Teams** on one screen, making every move for them. Nobody
joins. The rules are the **Duel's** (`associations.md` §3.3) with one Seat per Team
([ADR 0023](../adr/0023-a-hosted-team-is-a-seat.md)):

1. A turn opens exactly one closed Tile, then may Guess any unsolved Column or the Final.
2. Correct → scored to that Team; it may Guess again (not open). Wrong, or **Pass** → next Team.
3. Endgame: from the first turn that begins with no closed Tile, each Team gets
   `EndgameTurnsPerSeat` (2) guess-only turns. Scoring is the Duel's.
4. Turn order `(seat + 1) % teams`; the first Team is random; **Play again** keeps the Teams and
   the next Team starts.

### 2.1 The game record

`AssociationGame` with `PlayStyle.Hosted`, `HostUserId` and one `HostedTeam` per Seat (name,
colour, the students' names *as they were that day* — editing the Class later doesn't rewrite a
past game). **No `QuizSession`**, so nothing in stats, history, streaks or reports counts it as the
Teacher playing (C12). Saved **move by move** and replayed on every read (ADR 0020), like Solo.

### 2.2 Clocks

- **No time limit** — no clocks. Ends by the Final, the endgame, or End game.
- **Timed** — `GameSeconds` 300–3600 and `TurnSeconds` 30/60/90/120, both required.
  - A turn that runs out is recorded as `TurnExpired` and passes — the server's decision, not the
    engine's: in Host mode the engine enforces no clock (`ApplyDuel`'s `clocked` is Duel-only),
    because Host mode's clocks **pause**.
  - The game clock running out starts the **last round** (`LastRound`): play continues until the
    turn would come back to the Team that started, then ends `TimeUp`. Every Team gets as many
    turns (C6).
  - A correct Guess or a new turn restarts the turn clock.
- **The clocks live on the game row** (`GameDeadlineUtc`, `TurnDeadlineUtc`) while running.
  **Pause** stores `PausedAt` and freezes them; **Resume** pushes both back by the pause's length.
  Moves are refused while paused.
- **Settling.** Every read and move first brings a running game up to now
  (`HostedGameService.Settle`): each turn that ran out is recorded at its own deadline, in order,
  interleaved with the game clock. So a game nobody looked at for three turns shows three
  `TurnExpired`s at the right times. The Controller re-reads when its countdown hits zero, which is
  what moves the screens on time.
- A move that arrives after its turn ran out is refused — "Time ran out — it's Blue's turn" — and
  the Controller keeps the typed text.

### 2.3 Undo

The Teacher may take back **the latest move** — an Open, a Guess or a Pass — with a confirm step
([ADR 0025](../adr/0025-undo-is-a-move.md)). It appends `MoveKind.Undo` with `CancelsSeq`;
`AssociationEngine.Replay` skips both. An Undo can't itself be undone, nothing can be undone once the
game is over or while paused, and the clock doesn't give time back. The view's `undoLabel` says what
would be undone ("Blue opened B2"). A Tile opened by mistake closes again on the board; the review's
move list still shows both.

### 2.4 Ending

`FinalSolved`, `EndgameOver`, `TimeUp` (after the last round), **`EndedByHost`** (End game), and
`Abandoned` — a game with no move, pause or resume for **7 days** (`LastActivityAt`) is ended by the
existing abandonment sweep (`AbandonedSessionSweeper` → `EndIdleGamesAsync`), scores kept.

## 3. Screens: the Controller and Displays

The Teacher's device is the **Controller**; it alone moves. **Displays** are optional read-only
screens ([ADR 0024](../adr/0024-a-display-needs-no-login.md)):

- **Screen code** — 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L), stored on the
  game (`ScreenCode`, unique). Issued on request, stable until **disconnect all screens** replaces it,
  and dead once the game ends. Typed in any case, with or without separators.
- **`HostedGameHub`** at `/hostedGameHub`, one group per game. A Display calls
  `JoinAsDisplay(code)` — **no login**, at most **3** per game (`HostedDisplayRegistry`), 5 wrong codes
  per connection. The Controller calls `JoinAsController(gameId)` with its JWT. Every change sends
  the **Display view** (`HostedGameUpdated`) to the group; the Controller gets its own view from the
  REST answer.
- **The Answer key** (`answerKey`, every solution) is in the Controller's view **only while a Display
  is connected** (C8), so the Controller isn't the projected screen. Never in a Display view.
- **Secrecy:** both views are built by `AssociationViews.BuildHosted`; the Display one carries no
  code, no key, no undo label, and the same hiding as a player's view.
  `HostedGameServiceTests.TheDisplayView_CarriesNothingHidden_EvenWithADisplayConnected` searches
  the whole JSON, pushed and read.
- **Closing the Controller pauses the game**: when the last Controller connection drops and stays
  gone for 5 s (the lobby's grace), `PauseIfRunningAsync` runs in a fresh scope.

## 4. The screens (frontend)

Everything is in `src/pages/Classroom/`; pure helpers are `host/hosted-model.ts` and
`host/setup-model.ts` (tested in `__tests__/`). Classes, Hosted games and Setup sit inside the
user dashboard, so their cards and list rows are `bg-card` with a border, not plain `<Card>`s
([`../RESPONSIVE.md`](../RESPONSIVE.md), "Surfaces inside a dashboard").

- **Entry points (C16):** *My dashboard → Classroom* (`Host a board`, `Hosted games`, `Classes`, shown
  to Teachers and SuperAdmins), **Host a board** in the header's account drawer
  (`common/Custom-Drawer/drawer.links.tsx`, same roles, straight to Setup), and **Host for a class** beside Start in a board's start dialog
  (`quiz-start-modal.tsx`, Teachers and SuperAdmins, Associations only). Both read `HOST_ROLES` /
  `canHost` in `lib/authorization.tsx`.
- **Setup** — `/my-dashboard/host` (`HostSetupPage`): pick a board (yours, drafts included, or
  public — one card: a search field (searches as you type), then *Your boards* and *Public boards* each in
  a muted well, split by a separator; each board is a `BoardChoice` row with a chip in its category
  colour, a Draft tag, and an arrow; picking slides into Setup), or arrive with `?quizId=`; pick a Class (optional), 2–4 Teams, **Shuffle into teams**,
  move students by dragging a name, or with the ⇄ button on each name (touch and keyboard) —
  with two Teams it moves the name straight across, with three or four it opens a *Move to* menu;
  rename Teams. **With a Class, every Team needs a student:** the Teams control greys out counts
  above the class size (and picking a smaller Class drops the extra Teams before shuffling), and
  an empty Team can't start. **Start** stays pressable so it can show why: pressing it with an
  empty Team shakes that card (`useAnimate`, skipped under reduced motion) and swaps its "No
  students yet" line for a red *Needs at least one student* chip in the card itself. Any other
  problem (duplicate names, game time) appears as a red alert beside Start. Nothing is flagged
  before the first press — a fresh form isn't wrong yet. Without a Class, Teams are just names and may all be empty. The API
  enforces the part it can see — students on every Team or on none — since the start request
  carries no Class id (`setupProblem` / `maxTeamsFor` in `setup-model.ts`). **Format**: **No time limit** or **Timed** (turn seconds beside it, game minutes
  under it on a −/+ stepper that steps by 5 and clamps to `HOSTED_LIMITS`). Each Team is a
  ModeCard-shaped card (`border-2`, `rounded-xl`, a solid 4px edge) filled with its colour at
  ~75% — `TEAM_THEME[colour].fill` / `.onFill` in `hosted-model.ts` — with the name in a solid
  `bg-background` field and the students as `bg-background` chips, so both read on any of the
  four colours (yellow takes dark text, the rest white). Start opens the Controller.
- **Controller** — `/host/:gameId` (`ControllerPage`, header hidden): a top bar pinned above the
  play area — *Hosted games* on the far left, *Show on a screen* / *Pause* / *End game* centred —
  then **Undo** and **Pass** on the board's top-right corner; Teams strip (the Setup
  screen's filled Team cards, one column per Team so 2–4 always span the width evenly; the Team in play at full strength and lifted, the rest at half —
  the Displays use the same strip), centred in the window; on `2xl` and ≥1920px screens the
  play area (Teams, prompt, board) scales up with `zoom` while the header and buttons keep their
  normal size and the column widens to match, the turn clock as the board ring (red in the last 10 s) with the game
  time under it ("Last round" once it's up), one prompt line, the shared `AssociationBoard` on a `bg-muted` card (`BoardCard` in
  `hosted-parts.tsx`; the board's `MUTED_SURFACE` wrapper gives its dashed and grey slots a
  `bg-background` fill there, since `border-border` matches `muted`) (live
  only for what the turn allows), the last Guess in words, **Pass**, **Undo** (confirm, naming the
  move), **Pause/Resume**, **End game** (confirm), **Show on a screen** (the code, the connected
  count, disconnect all), and the **Answer key** (tap per solution) while a Display is connected.
  When its turn clock reaches zero it re-reads the game, which is what records the expiry. Over:
  the ranking (ties as ties), the revealed board with each slot's Team, **Play again, same teams**,
  **Host another board**.
- **Display** — `/screen` (`DisplayPage`, no sign-in, header hidden): a code box, then the same
  board large with the Teams and scores, whose turn, the clocks, the last Guess, and at the end the
  ranking. Joins over `useDisplayHub`; if the host disconnects the screens it returns to the code
  box; on reconnect it rejoins with the same code.
- **Hosted games** — `/my-dashboard/hosted-games` (`HostedGamesPage`): newest first, each with its
  Teams and scores and Running / Paused / the winner; a row opens the Controller.

## 5. API

`/api/hosted-games` — `[Authorize(Roles = RoleRules.HostRoles)]` (Teacher or SuperAdmin) and the
Associations preview gate; `HostedGameHub.JoinAsController` checks the same rule (`RoleRules.CanHost`); every id
is clamped to its host (another Teacher's game is 404).

| | |
|---|---|
| `POST` | start: `quizId`, `shareToken?`, `teams[]` (`name`, `colour?`, `students[]`), `gameSeconds?`, `turnSeconds?` |
| `GET` / `GET {id}` | the Teacher's hosted games / one game (settled first) |
| `POST {id}/open \| guess \| pass` | moves (`{ tileId }`, `{ target, text }`) |
| `POST {id}/undo \| pause \| resume \| end` | |
| `POST {id}/again` | same Teams, same or another Board (`quizId?`) |
| `POST {id}/screen-code`, `DELETE {id}/screens` | issue the code / disconnect all and replace it |

Boards a Teacher may host: any they could play — Public, Unlisted with its token, **and their own
in any status** (C10; `QuizPlayAccess.IsPlayAuthorized` already allows an owner).

Account anonymisation blanks the students' names on a Teacher's hosted games and keeps the games.

Tests: `QuizAPI.Tests/Classroom/HostedGameServiceTests.cs` (start and its validation, access, turns,
Undo, each clock rule, pause, ending, Play again, abandonment, screens, the Answer key, secrecy),
`TeacherAccountClosureTests.cs`. Migration `AddHostedGames`.
