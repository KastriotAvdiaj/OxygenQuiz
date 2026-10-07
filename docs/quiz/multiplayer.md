# Multiplayer

Real-time competitive quiz play: a host opens a **lobby**, players join with a 6-character room
code, and the host starts a **match** that every player experiences in lockstep. Transport is
SignalR over a single shared connection; the server is authoritative for timing, correctness and
scoring, and clients only render what they are told.

**Related docs**

- [`multiplayer-join.md`](./multiplayer-join.md) — the join flow in detail (two URL shapes, who
  performs the join, and the bug that consolidated it).
- [`play-auth-and-identity.md`](../auth/play-auth-and-identity.md) — why the hub is `[Authorize]`'d
  and identity is never client-supplied.
- [`quiz-grading.md`](./quiz-grading.md) — scoring and latency-compensated timing, shared with
  singleplayer.
- [`quiz-visibility.md`](./quiz-visibility.md) — which quizzes a host is allowed to run.
- [`known-issues.md`](../deployment/known-issues.md) — the open backlog; multiplayer items live
  under "Multiplayer / Game State".

---

> **Not this hub:** Host mode's screens use their own `HostedGameHub` (`/hostedGameHub`) — no lobby,
> and Displays are anonymous. See [`classroom.md`](./classroom.md) §3.

## 1. Architecture

### Backend (ASP.NET Core, `OxygenBackend/QuizAPI`)

| Piece | File | Role |
|---|---|---|
| `QuizHub` | `Hubs/QuizHub.cs` | The only client-callable surface. `Hub<IQuizClient>`, `[Authorize]`, mapped at **`/quizHub`** (`Program.cs`). |
| `IQuizClient` | `Hubs/Clients/IQuizClient.cs` | Strongly-typed server→client events. Adding an event here is what makes it callable as `Clients.Group(...).Foo(...)`. |
| `IQuizSessionManager` / `InMemoryQuizSessionManager` | `Services/QuizSessionServices/` | Lobby store. A `ConcurrentDictionary<string, MultiplayerSession>` keyed by room code; per-session mutations take `lock (session)`. Registered **singleton**. |
| `IMatchOrchestrator` / `MatchOrchestrator` | `Services/QuizSessionServices/` | The match loop: load questions → countdown → per-question round loop → grade → reveal → final result → reset. Registered **singleton**; broadcasts through `IHubContext<QuizHub, IQuizClient>`. Owns the **one** lobby reset, `ResetToLobbyAsync`, which the Duel loop calls too. |
| `IAssociationMatchOrchestrator` / `AssociationMatchOrchestrator` | `Services/QuizSessionServices/` | The Associations **Duel** loop, when the picked quiz is a Board: countdown → the board → turns until it ends → record → reset. Singleton. The rules are `AssociationDuel`'s; this is the clock, the broadcasts and the write. See [`associations.md`](./associations.md) §10. |
| `MultiplayerSession` | `Services/QuizSessionServices/MultiplayerSession.cs` | One lobby's entire state — roster, settings, selected quiz, chat buffer, and the live-match runtime fields. |
| Match DTOs | `Services/QuizSessionServices/MatchModels.cs` | Wire contracts. Note the deliberate split: `RoundQuestion` is server-only and holds the grading key; `RoundQuestionView` / `RoundOption` are what clients see and carry **no** correct-answer information. Option order in `RoundOption` is shuffled once per match, and question order too when the quiz sets `ShuffleQuestions` — see [`../adr/0006-answer-order-is-shuffled-at-serve-time.md`](../adr/0006-answer-order-is-shuffled-at-serve-time.md). Every player is served from the one shuffled list, so "it's the third one" means the same thing to all of them. |

Grading is *not* reimplemented here — `MatchOrchestrator.GradeRoundAsync` resolves
`IAnswerGradingService` from a fresh DI scope and reuses the same service singleplayer uses.

### Frontend (React + TypeScript, `src/`)

| Piece | File | Role |
|---|---|---|
| `MultiplayerProvider` | `context/multiplayer-context.tsx` | Owns the one shared `HubConnection` and exposes typed invoke wrappers. Rejoins the lobby after an automatic reconnect (`lobby-rejoin.ts`, §3.6). |
| `useLobbyConnection` | `pages/Quiz/Multiplayer/hooks/use-lobby-connection.ts` | Lobby-phase state: roster, ready, host, selected quiz, join/leave. |
| `useMatch` | `pages/Quiz/Multiplayer/hooks/use-match.ts` | Match-phase state, driven purely by server events. |
| `useLobbyChat` | `pages/Quiz/Multiplayer/hooks/use-lobby-chat.ts` | Chat history + send. |
| `MultiplayerLobbyPage` | `pages/Quiz/Multiplayer/MultiplayerLobbyPage.tsx` | Thin data wrapper. Renders `<MultiplayerGame>` while `match.isActive`, otherwise `<LobbyPageView>`. |
| `LobbyPageView` | `pages/Quiz/Multiplayer/LobbyPageView.tsx` | Presentational lobby, fully prop-driven (Storybook-previewable with no backend). |
| `MultiplayerGame` | `pages/Quiz/Multiplayer/components/game/MultiplayerGame.tsx` | The in-match screen: countdown, question, reveal, results. |
| `useAssociationMatch` / `DuelGame` | `pages/Quiz/Associations/duel/` | The Associations Duel's listener set (`Duel*` events) and screen, rendered instead of the lobby while a Duel is on ([`associations.md`](./associations.md) §10.7). |

**Four separate listener sets** bind to the same connection, one per concern —
`use-lobby-connection` (roster/host/quiz), `use-match` (match events), `use-lobby-chat` (chat),
`use-association-match` (Duel events).
They each `connection.off(...)` their own events on cleanup. Because `off(name)` removes *all*
handlers for that event name, two hooks must never subscribe to the same event.

### Routes (`src/routes/Router.tsx`)

| Route | Component | Notes |
|---|---|---|
| `/multiplayer-menu` | `MultiplayerMenu` | Mode selection. "Create"/"Join" open `CreateLobbyDialog` / `JoinLobbyDialog` — dialogs, not routes. |
| `/multiplayer/lobby/:sessionId` | `MultiplayerLobbyPage` | Where the create flow and the Join dialog both land. |
| `/multiplayer/join` | `MultiplayerLobbyPage` | Shared invite link; reads the code from `?code=`. |

All three use `DashboardErrorElement`; the two lobby routes are gated by `userAuthLoader`.

---

## 2. State ownership

The recurring source of bugs in this feature is state that exists in two places, so it's worth
being explicit about who owns what.

| State | Owner | How clients learn it |
|---|---|---|
| Roster, host, ready flags | Server (`MultiplayerSession.Participants`) | `CurrentParticipants` on join, then `UserJoined` / `UserLeft` / `PlayerReadyChanged` / `HostChanged` deltas |
| Lobby capacity | Server (`MaxPlayers`) | `LobbySettingsChanged` to the caller on create/join |
| Selected quiz | Server (`SelectedQuiz`) | `QuizSelected` broadcast on selection **and** replayed to the caller on join |
| Match phase, timing, scores | Server (`QuizState`, `QuestionDeadlineUtc`, `PlayerScores`) | `MatchStarting` / `QuestionStarted` / `QuestionEnded` / `MatchEnded` |
| A Duel's board, turn and scores | Server (`MultiplayerSession.Duel`) | `DuelStarting` / `DuelStarted` / `DuelUpdated` / `DuelEnded`, each carrying the whole view; `DuelState` replays it to someone (re)joining mid-Duel |
| Which screen *this* player sees | Client (`useMatch.phase`) | Local — see the asymmetry in §3.4 |

**The late-joiner rule.** Any state announced *only* by a broadcast event is invisible to anyone
who joins afterwards. Every such field needs a matching replay in `JoinSession`. Today that's
`CurrentParticipants`, `LobbySettingsChanged`, `QuizSelected`, `ChatHistory` and — while a Duel is
on — `DuelState`. When you add a
new piece of lobby state, add its catch-up send at the same time — the "late joiners never see the
host's quiz pick" bug (2026-07-31) was exactly this omission.

---

## 3. Session lifecycle

### 3.1 A lobby outlives a match

This is the central model, and getting it wrong caused the longest-lived bug in the feature.

A `MultiplayerSession` is a **long-lived container** keyed by room code. It's created by
`CreateSession` and destroyed only when the last participant leaves. Within it, `QuizState` marks
the phase of the **current match**:

```
Lobby ──StartMatch──▶ Starting ──▶ QuestionActive ⇄ QuestionEnded ──▶ QuizEnded
  ▲                                                                      │
  └──────────────── ResetToLobbyAsync (match loop's finally) ◀────────────┘
```

`SendLobbyMessage` is allowed in `Lobby` and `Starting` only; `SubmitAnswer` in `QuestionActive`
only.

### 3.2 The rematch reset

`IMatchOrchestrator.ResetToLobbyAsync(sessionId)` is the single "return to lobby" operation:

- `QuizState` → `Lobby`
- drops the finished match's runtime state: `Questions`, `PlayerScores`, `PlayerCorrect`,
  `CurrentRoundAnswers`, `PlayerAnswers`, `CurrentQuestionIndex`, `QuestionStartTime`,
  `QuestionDeadlineUtc`
- clears every participant's `IsReady`, broadcasting each change as `PlayerReadyChanged`
- **keeps `SelectedQuiz`** — deliberately, so a rematch of the same quiz is one click and the lobby
  doesn't fall back to "waiting for the host to select a quiz"

It runs from `RunMatchAsync`'s **`finally`**, not after the `MatchEnded` broadcast. That placement
is load-bearing: a match that throws or is cancelled mid-question releases the lobby too, instead
of stranding it in `QuestionActive` forever. `StartMatchAsync` also calls it defensively if it ever
finds a session in a non-`Lobby` state.

### 3.3 "Already started" means a live loop, not a phase

The start guard is **`session.MatchCts != null`** — the cancellation token source is created in
`StartMatchAsync` and nulled in the same `finally` that resets, so it tracks actual loop liveness.

It used to be `QuizState != QuizState.Lobby`. Since the phase only ever moved forward and nothing
returned it to `Lobby`, the second `StartMatch` in any lobby threw
`HubException: The match has already started.` — one match per lobby, forever. **A forward-only
phase enum cannot double as a mutex**; if you add another "is this busy?" check, hang it off loop
liveness, not the phase.

### 3.4 Server-side vs client-side return to lobby

These are deliberately different, and the asymmetry is easy to misread:

- The **server** returns to the lobby the moment the match loop stops.
- Each **client** returns when its own player clicks "Back to lobby" on the results screen
  (`ResultsPanel` → `match.reset`, purely local view state).

So a player can still be reading the final scoreboard while the lobby is already startable. If the
host starts a rematch in the meantime, that player is pulled straight in by `MatchStarting`, which
sets `phase = "starting"`. Clearing ready flags on reset is what stops this from being abrupt: a
rematch needs a fresh opt-in from everyone, because `canStartQuiz` requires all-ready.

### 3.5 Leaving and disconnecting

- **`LeaveSession`** — explicit. Removes from the SignalR group and the roster, clears
  `Context.Items`, broadcasts `UserLeft`, and `HostChanged` if the host left.
- **`OnDisconnectedAsync`** — grants a **5-second grace period** on a background task, then removes
  the participant *only if their `ConnectionId` is still the one that dropped*. **Until 2026-09-25
  this removed nobody**: the task made its DI scope from the hub's own `IServiceProvider`, which is
  the invocation's scope and was disposed by the time the grace ran out, so it threw — silently,
  being fire-and-forget. Players who closed their tab stayed in everyone's roster (and in a Duel,
  never forfeited). Found by the Duel's two-browser run; the hub now takes an
  `IServiceScopeFactory`, the grace runs on an injected `TimeProvider` (so
  `QuizHubRejoinTests` can drive it), and a failure in the task is logged. This is what makes a
  page refresh survivable: the client reconnects and re-joins with a new connection id, so the
  delayed check sees a different id and leaves them alone.
- **Host reassignment** — `RemoveParticipantAsync` promotes `Participants.First()` and updates
  `HostUsername`; the hub broadcasts `HostChanged`.
- **Empty lobby** — cancels `MatchCts` (nobody is left to play the match) and stamps
  `EmptySinceUtc`. The session is **kept** for `InMemoryQuizSessionManager.AbandonedLobbyGrace`
  (90s) rather than removed, because the commonest way a lobby empties is its host refreshing.
  Every lookup goes through `TryGetLiveSession`, which collects a session past its grace on the
  way out, so a stale code still fails `NotFound`; `CreateSessionAsync` also sweeps, so rooms
  nobody returns to cannot accumulate.

**Leaving mid-Duel is a forfeit.** Both removal paths — `LeaveSession` and the disconnect grace
running out — call `IAssociationMatchOrchestrator.PlayerLeftAsync`, which ends a Duel the leaver is
seated in ([ADR 0021](../adr/0021-a-duel-is-forfeited-when-the-lobby-drops-the-player.md)).

**Client-side, `useNavigationGuard(hasJoined)` blocks in-app navigation** (React Router's
`useBlocker`, plus `beforeunload` for refresh and tab close) for as long as you're in the session —
**including mid-match**, since `hasJoined` doesn't drop when a match starts.

That has one hard requirement: *every* render branch of `MultiplayerLobbyPage` must render
`<LeaveLobbyDialog>`. A blocked navigation with no dialog on screen is not a no-op — the blocker
latches into `blocked` and nothing can call `proceed()` or `reset()`, so the click looks ignored and
every further click re-renders the subtree. That is exactly how the mid-match branch shipped, and it
froze the question timer as a side effect ([`quiz-timer.md`](./quiz-timer.md#what-went-wrong-2026-08-02)).
The dialog is now rendered in both branches and takes an `inMatch` flag for the copy, because "you
can rejoin later with the room code" is misleading while a round clock is running.

Note that confirming only calls `blocker.proceed()` — it does **not** invoke `LeaveSession`. The
server keeps you in the roster until the round's deadline passes or you disconnect. Logged as a P3
in [`known-issues.md`](../deployment/known-issues.md#multiplayer--game-state).

### 3.6 Reconnecting

The connection is built `.withAutomaticReconnect()`. A reconnected SignalR connection is a **new
connection id**: on the server it is in no group, its `Context.Items` are empty, and the 5-second
disconnect check is counting down against the *old* id. Until 2026-09-25 nothing handled that, so a
network blip cost a player the room's broadcasts, then the `Context.Items` hub methods ("You are
not in this lobby."), then — five seconds later — their place in the roster. In Classic that is a
few rounds; in a Duel it is the game (a removal is a forfeit, §3.5).

Now:

- **The client rejoins.** `MultiplayerProvider` remembers the lobby it created or joined
  (`createLobbyMembership` in `context/lobby-rejoin.ts`, forgotten on `LeaveSession`) and binds
  `onreconnected` to re-invoke `JoinSession` for it. `JoinSession` is idempotent for an existing
  participant (matched by account id, not name): it moves them to the new connection id — so the disconnect check leaves them alone —
  re-adds the connection to the group, re-stamps `Context.Items`, and sends the catch-up bundle
  (§4.2), including the Duel's `DuelState` if one is on.
- **The room isn't told.** A rejoin does not broadcast `UserJoined`: the others never saw the player
  leave (`UserLeft` is sent only when the participant record goes), so announcing them again would
  toast "X joined the lobby" at everyone for a blip. "Already in the roster" is the test, so a
  refresh and the host's second join (§4.1) are quiet the same way.
- **A refused rejoin is shown.** If the lobby is gone or full by the time the connection is back,
  the provider's `rejoinError` carries the server's sentence and the lobby shows it the way it shows
  any failed join.
- `isConnected` now follows the connection: false while reconnecting, true again once it is back.

A reconnect that takes longer than the 5-second grace is a leave, as before — the player is removed
and rejoins as a new arrival (and a Duel is already forfeited). Pinned by `QuizHubRejoinTests`
(server) and `lobby-rejoin.test.ts` (client).

---

## 4. Flows

### 4.1 Creating a lobby

1. `/multiplayer-menu` → "Create Lobby" opens `CreateLobbyDialog`.
2. The host picks a max-player count (2–10). Identity is the logged-in account — nothing is typed.
   The hub clamps the count to the same range (`QuizHub.MinLobbyPlayers` / `MaxLobbyPlayers`), so
   the dialog's limits are feedback, not the rule.
3. The dialog generates the room code **client-side**
   (`Math.random().toString(36).substring(2, 8).toUpperCase()`) and invokes
   `CreateSession(sessionId, lobbyName, maxPlayers)`. `lobbyName` is derived as
   `"{username}'s Quiz Lobby"`.
4. The server creates the session, adds the caller as host, and sends `CurrentParticipants` +
   `LobbySettingsChanged` to the caller.
5. The dialog stores `{sessionId, username}` in `sessionStorage` under `quiz_session` and navigates
   to `/multiplayer/lobby/:sessionId`.
6. The lobby page then **also** auto-joins via `JoinSession` (see the note in §4.2) — the host is a
   participant like everyone else, and picks a quiz and readies up like everyone else.

### 4.2 Joining

Both entry points (typed code, invite link) converge — full writeup in
[`multiplayer-join.md`](./multiplayer-join.md). The short version: the **lobby page owns the single
join**, auto-invoking `JoinSession` once the connection is live, and the code is always upper-cased
because the dictionary key and SignalR group name are case-sensitive.

`JoinSession` then sends the new client its catch-up bundle: `UserJoined` to the group, then
`CurrentParticipants`, `LobbySettingsChanged`, `QuizSelected` (if a pick exists) and `ChatHistory`
to the caller.

> **The host joins twice.** `CreateSession` already added them, then the lobby page's auto-join
> calls `JoinSession` for the same account. `AddParticipantAsync` is idempotent — it finds the
> existing participant and refreshes `ConnectionId`, `IsHost` and the avatar — and the client
> dedupes `UserJoined` by username, so this is harmless. It's worth knowing before you "fix" a
> duplicate-looking join.

### 4.3 Ready, select, start

- Anyone toggles ready (`ToggleReady`), including the host.
- Only the host can `SelectQuiz`. The id is validated server-side via
  `IQuizService.CanHostQuizAsync` (Public, or owned by the host) — the title/category/difficulty in
  the payload are **display labels only** and are never trusted.
- **The pick carries its format.** `SelectQuiz` fills `SelectedQuizView.Format` (`Classic` /
  `Associations`) from the quiz itself, overwriting whatever the client sent — the lobby's rules
  follow from it, so it can't be the client's to choose. It reaches late joiners with the rest of the
  pick through the `QuizSelected` replay, so no new lobby state was needed.
- **An Associations quiz is a Duel, for exactly 2 players** ([`associations.md`](./associations.md)
  §10). While the format is in preview only an admin may pick one; anyone else gets the same "You
  can't host this quiz." as for a quiz they may not host at all.
- `canStartQuiz` (client) = host **and** the right number of players — ≥2, or **exactly 2** for a
  Board — **and** all ready **and** a quiz selected. One function, `startBlockedReason`
  (`Multiplayer/utils/lobby-start.ts`), gives both the button's state and the sentence under it. With a Board and three or more players the
  lobby says why the button is disabled. The server independently re-checks the quiz and the count
  (`StartMatchAsync` in each orchestrator); the client computation is convenience, not enforcement.
- **`StartMatch` dispatches by format**: a Board to `IAssociationMatchOrchestrator`, anything else to
  `IMatchOrchestrator`. Both use the same `MatchCts` liveness guard and the same `ResetToLobbyAsync`
  (§3.2–3.3), so a lobby can alternate between the two.

### 4.4 The match loop

Per `MatchOrchestrator`, with constants `CountdownSeconds = 3`, `InterQuestionPauseMs = 3000`,
`PollIntervalMs = 250`, `DefaultTimeLimitSeconds = 30`:

1. `StartMatchAsync` validates, loads the quiz's questions once (`ignoreFilters: true` — the
   background scope has no current user, and the host's pick was already authorized at selection
   time), zeroes the standings, and fires `RunMatchAsync` on a background task.
2. `MatchStarting(3)` → 3-second delay.
3. For each question: set the deadline, broadcast `QuestionStarted(view, deadlineUtc)`, then wait.
4. `WaitForRoundEndAsync` polls every 250 ms and ends the round when the deadline passes **or**
   every current participant has submitted.
5. `GradeRoundAsync` grades each submission through `IAnswerGradingService`, rolls the points into
   the standings, and the result goes out as `QuestionEnded` — then a 3-second reveal pause.
6. After the last question: `QuizEnded`, then `MatchEnded` with the final scoreboard and winner.
7. The `finally` disposes the CTS and calls `ResetToLobbyAsync`.

**The deadline is an absolute server timestamp** (`QuestionStartTime.AddSeconds(limit)`), so the
client cannot simply subtract its own `Date.now()` from it — the two clocks are not the same clock.
`useMatch` reads the server's clock off the event (`deadline − limit` is what `UtcNow` was at send)
and `multiplayer-question-view` corrects for the offset before deriving the seconds it shows. A
drifted device clock used to open a 30s question at 32 or 34.
See [`quiz-timer.md`](./quiz-timer.md#clock-skew-same-day).

**Winner** = top of the board, unless the top two are exactly tied on both score *and* correct
count, in which case there is no single winner (`WinnerUsername` is null and the UI shows a tie).

**Answers.** `SubmitAnswer` records the raw submission with a server timestamp; first submission of
the round wins and duplicates/late arrivals are silently ignored. Correctness is never returned
here — only `AnswerSubmitted(username)` goes out, so the UI can show who has locked in without
leaking anything. `clientElapsedMs` is the player's own `performance.now()` delta, used at grading
time so ping doesn't decide close rounds; the deadline check stays on the server clock, so a client
report can never resurrect a late answer. See
[`quiz-grading.md`](./quiz-grading.md#latency-compensated-timing) and the P3 note in
[`known-issues.md`](../deployment/known-issues.md) about the fixed latency credit.

### 4.5 Chat

Ephemeral and in-memory only: a 50-message capped buffer per session
(`InMemoryQuizSessionManager.MaxRecentMessages`). The client keeps the newest 200. Messages are
trimmed and truncated to 500 chars server-side, the sender is taken from the connection context,
and chat is rejected outside the `Lobby`/`Starting` phases. Nothing is persisted — the MongoDB
archiver was removed (see [`mongodb.md`](../data/mongodb.md)).

**You only see chat from the moment you arrived.** `Participant.FirstJoinedAt` is stamped on the
first join, and `GetMessagesSinceJoinAsync` filters the `ChatHistory` catch-up to messages sent at
or after it. A new arrival cannot read what was said before they were in the room.

The watermark is **not** re-stamped on rejoin, and that's the point: `AddParticipantAsync` is
idempotent, so a refresh, a reconnect or the host's second join (`CreateSession` then the lobby
page's auto-join — see §4.1) all find the existing participant and keep the original timestamp.
Re-stamping would blank the chat someone had already read every time their tab reloaded.

`LeaveSession` removes the participant record entirely, so leaving and coming back *does* reset the
watermark — a deliberate leave is treated as arriving fresh. If you ever make leave a soft state,
this changes with it.

**The transcript is shadcn's `Message`** (`src/components/ui/message.tsx`, ported from the AI
Elements registry entry). A row is `<Message from="user | assistant">` wrapping
`<MessageContent>`: `from` puts an `is-user` / `is-assistant` marker class on the wrapper and the
content styles hang off it (`group-[.is-user]:…`), so alignment and bubble live in the component
rather than in a ternary at the call site. Here `user` means *this* account — your own messages sit
right and unlabelled, everyone else's sit left under their name. System notices are not messages
and stay a centred italic line.

The port keeps only `Message` and `MessageContent`. Upstream also ships branch navigation, an
actions toolbar, attachments and a markdown `MessageResponse`, which would pull in `ai`,
`streamdown` and `button-group` for a chat that sends plain 500-character strings.

### Chat on phones

Under `lg` the chat panel is **dropped from the stacked column** and moves into a bottom drawer
behind a floating button (`MobileChatDrawer`). Stacked, chat was the tallest card and sat between
the player and the ready/start actions; while waiting you're watching the roster and the actions,
and chat is the thing you dip into. The drawer caps at `70dvh` so a strip of lobby stays visible —
you should still notice the host picking a quiz or the match starting.

The message list sizes itself to its container in **both** shells (`flex-1 min-h-0`), so one
`chatSlot` node serves the desktop panel and the drawer — the board's `1fr` row and the drawer's
`70dvh` each give it a definite height to divide. It briefly had a `heightMode` prop for this;
once the desktop board became viewport-height there was only one behaviour left and the prop went.

**The drawer does not focus the composer on open.** Radix focuses the first focusable descendant of
`DialogContent`, which here is the chat input — so opening chat raised the keyboard, and the
keyboard covered most of a 70dvh drawer before you had read anything. `onOpenAutoFocus` is
prevented and focus goes to the drawer content instead (`tabIndex={-1}`, so the focus trap, Escape
and screen-reader announcement all still work). Opening chat is "what did I miss"; typing is one
deliberate tap away.

The composer input is `text-base lg:text-sm` and carries `enterKeyHint="send"`. Both are phone
concerns: below 16px iOS zooms the page on focus and never zooms back out, which is what used to
push the send button off the right edge, and the default "return" key label reads as "new line" on
a single-line field. See [`RESPONSIVE.md`](../RESPONSIVE.md).

The button carries an unread badge (`useChatUnread`), counting messages that arrived while the
drawer was shut. **Own and system messages don't count** — a badge that fires on "Ana joined"
trains people to ignore it. Counting is by list length rather than message identity: chat messages
have no ids, `sentUtc` can collide, and the list is capped at `MAX_MESSAGES`, so the only thing
that stays correct once trimming starts is "how many have I seen" plus a tail diff.

> **The subscription had to move for this to be safe.** `useLobbyChat` now lives in
> `MultiplayerLobbyPage`, not in `LobbyChat`. The desktop panel and the mobile drawer are both
> mounted (CSS hides one), and the hook registers handlers on the *shared* connection whose
> cleanup calls `connection.off("ChatHistory")` — which removes them globally. Two subscribed
> copies would mean unmounting either one silently killed the other's messages. With the
> subscription hoisted, the duplicated subtree is just a second view. If you ever push live state
> back down into `LobbyChat`, one of the two renders has to go. See
> [`RESPONSIVE.md`](../RESPONSIVE.md).

---

## 5. API reference

### Hub methods (client → server)

Identity is **never** a parameter. Every method derives it from the connection: the account id
from the token, and — once the connection is in a lobby — the name it plays under there from
`Context.Items["Username"]`. See the note below the table.

| Method | Parameters | Auth | Notes |
|---|---|---|---|
| `CreateSession` | `sessionId, lobbyName, maxPlayers` | any authenticated | Caller becomes host. Throws if the code already exists. `maxPlayers` is clamped to 2–10. |
| `CheckSession` | `sessionId` | any authenticated | Returns `SessionAvailability` (`canJoin`, `reason`, `message`, `inProgress`, roster counts). Mutates nothing. Pre-flight for the join dialog — advisory, not the gate. |
| `JoinSession` | `sessionId` | any authenticated | Converts `SessionJoinException` to `HubException` so the client sees the real cause (`not-found` / `full` / `name-in-use`). Idempotent for an existing participant (matched by account id); adds to the SignalR group only **after** the participant add succeeds. |
| `LeaveSession` | `sessionId` | participant | Broadcasts `UserLeft`, plus `HostChanged` if the host left. |
| `ToggleReady` | `sessionId, isReady` | participant | Sets the **caller's** own flag only. |
| `SelectQuiz` | `sessionId, quiz` | **host** | `quiz` is a `SelectedQuizView`; only `Id` is authorized (`CanHostQuizAsync`), and `Format` is filled by the server. A Board needs an admin host while in preview. |
| `SendLobbyMessage` | `sessionId, text` | participant | Lobby/Starting phases only. |
| `StartMatch` | `sessionId` | **host** | Dispatches by the pick's format (§4.3). Rethrows the orchestrator's `InvalidOperationException` as a `HubException`, so the client shows the real reason. |
| `SubmitAnswer` | `sessionId, answer, clientElapsedMs?` | participant | Returns silently (no throw) when not accepting answers. |
| `OpenTile` | `sessionId, tileId` | seated Duel player | Duel only. A refusal — not your turn, already opened, time's up — is a `HubException` with the sentence to show. |
| `GuessAssociation` | `sessionId, target, text` | seated Duel player | `target` is `A`–`D` or `Final`. |
| `PassTurn` | `sessionId` | seated Duel player | After opening a Tile, or in the endgame. |

> **Identity is the account id; the name is a pinned label** (since 2026-09-27, when display names
> became changeable — [account-identity-changes.md](../auth/account-identity-changes.md) §4).
> `CreateSession`/`JoinSession` read the account's current display name from the database and the
> session manager pins it to the account for the lobby's lifetime (`PlayerUserIds`); every other
> method reads that pinned name from `Context.Items["Username"]`. The methods used to split
> between that and the JWT's `username` claim, which lags a rename. `Context.Items` is
> per-connection, so it is empty on a connection that has not joined — which is what surfaces as
> `"You are not in this lobby."` (`LeaveSession` on such a connection is a silent no-op). See the
> reconnect gap in §7.

### Client events (server → client)

Defined in `IQuizClient`; SignalR serializes payloads camelCased.

| Event | Payload | When |
|---|---|---|
| `UserJoined` | `username, isFirstUser, profileImageUrl` | Someone joined (group) |
| `UserLeft` | `username` | Someone left or timed out (group) |
| `CurrentParticipants` | `Participant[]` | To the caller on create/join |
| `LobbySettingsChanged` | `lobbyName, maxPlayers` | To the caller on create/join |
| `PlayerReadyChanged` | `username, isReady` | On `ToggleReady`, and for each player on the rematch reset |
| `HostChanged` | `newHostUsername` | Host left and was replaced |
| `QuizSelected` | `SelectedQuizView` | Broadcast on `SelectQuiz`; replayed to the caller on join |
| `MatchStarting` | `countdownSeconds` | Match loop begins |
| `QuestionStarted` | `RoundQuestionView, deadlineUtc` | A question opens |
| `AnswerSubmitted` | `username` | A player locked in (progress only, no correctness) |
| `QuestionEnded` | `QuestionResult` | Round closed: per-player outcome + standings |
| `MatchEnded` | `MatchResult` | Final scoreboard + winner |
| `ChatMessageReceived` | `LobbyChatMessage` | New chat message |
| `ChatHistory` | `LobbyChatMessage[]` | To a newly-joined client |
| `DuelStarting` | `countdownSeconds` | A Duel begins (its own name — `useMatch` owns `MatchStarting`) |
| `DuelStarted` | `DuelViewDTO` | The board is up |
| `DuelUpdated` | `DuelUpdateDTO` (`move?`, `isCorrect?`, `points`, `view`) | A move, an expired turn, or a forfeit (`move` null) |
| `DuelEnded` | `DuelViewDTO` | Over and recorded; each seat carries its results `sessionId` |
| `DuelState` | `DuelViewDTO` | To a caller joining while a Duel is on (§3.6) |

---

## 6. UI notes

The lobby is a fixed 2×2 board of `LobbyPanel`s — **Players** / **Room** top row, **Chat** /
**Quiz** bottom row — collapsing to one stacked column under `lg`. Panels are *explicitly*
grid-placed (`lg:col-start-*` / `lg:row-start-*`) so the DOM can order Quiz before Chat for the
mobile column without that order reaching desktop. `LobbyPanel` is the single structural unit:
bordered box, solid title bar, inset body.

- **The desktop board is viewport-height and must never scroll.** Above `lg` the shell takes an
  explicit `h-[calc(100dvh-var(--header-height,4rem))]` and the grid is `h-full` with rows
  `[auto, minmax(0,1fr)]`: the top row sizes to its content, the bottom row takes what's left.
  Two things are load-bearing and both fail silently:
  - The shell's height **cannot** be `h-full`. The layout's scroll container wraps its children in
    `min-h-full`, and `min-height: 100%` doesn't make a height definite — so a percentage height
    below it computes to `auto` and the board grows with the chat log. This is the bug that made
    chat expand instead of scroll.
  - Every link below needs `min-h-0`, or a grid/flex item's default `min-height: auto` floors it at
    its content and defeats the `1fr`.

  If you add a panel, or a fixed height inside one, check a short viewport (≈768px tall) before
  assuming it still fits. Below `lg` the column stacks and scrolls normally.
- **Chat is desktop-only in the board.** Under `lg` that panel is dropped and chat moves to a
  bottom drawer behind a floating button — see §4.5. The panel is `hidden lg:flex`, *not*
  `lg:block`: `LobbyPanel`'s root is a flex column, and overriding its display breaks the body's
  `flex-1` so chat can no longer size to its row.

- **Type zones:** `font-quiz` cascades from the page shell so labels, buttons, names and chat wear
  the user's display font. Two deliberate opt-outs — panel title bars (`font-header`: chrome
  shouldn't be restyled by a user setting) and the room code (`font-mono`: `0` vs `O` must be
  unambiguous for someone typing it in).
- **Surfaces:** panel bodies are `--background` in light mode with the page behind them `bg-muted`;
  dark mode inverts that. Anything sitting *on* a panel body therefore needs a light-mode tint of
  its own — a translucent `bg-background/60` is invisible there.
- **Ready and Start** are equal-sized sibling buttons sized to their labels (shared `ACTION_SIZE`
  in `lobby-actions.tsx`), both primary, with Ready outlined in *both* states so toggling changes
  only its fill, never its shape.
- **Roster:** shadcn `Avatar` with a ready-state ring and a host crown badge; dashed empty slots up
  to the real `maxPlayers`.
- **In-match:** the question screen reuses the singleplayer leaf components through
  `MultiplayerQuestionView` + `QuestionCard`. The multiplayer-only phases (countdown, reveal,
  results) stay bespoke by design and share a `FloatingAvatarCluster` showing live per-player state
  (idle / submitted / correct / incorrect).
- **Storybook:** `LobbyPageView.stories.tsx` and `MultiplayerGame.stories.tsx` preview every state
  with no backend. They are the fastest way to see a UI change — see
  [`storybook.md`](../development/storybook.md).

---

## 7. What a match leaves behind

Until 2026-09-14 a match was graded entirely in memory and thrown away: no record it happened, no
effect on analytics or personal stats, and no way for a player to see which questions they got
wrong. A finished match now writes rows.

### 7.1 The shape

Three players finishing a 5-question match on quiz 12:

| Table | Rows | Holds |
|---|---|---|
| `Match` | 1 | quiz id, pinned quiz version, room code, host, started/ended, winner |
| `QuizSession` | 3 | one per player, with `Mode = Multiplayer` and `MatchId` |
| `UserAnswer` | 15 | 3 players × 5 questions, unchanged shape |

The middle row is the whole idea. **Multiplayer writes the same tables single player already
writes**, so analytics, personal stats and the results pages work on a match without being taught
what a match is.

**The rejected alternative was a separate `Match` / `MatchParticipant` / `MatchAnswer` set of
tables.** It keeps single-player numbers safe by construction — nothing multiplayer can ever land in
them — and it costs a second reader for every consumer: a second analytics query, a second stats
query, a second results page, each to be kept in step with the first forever. Filtering by `Mode`
buys the same separation for one `WHERE` clause.

### 7.2 What the answer rows say

Every player who stayed gets a row for every question, so "left after Q3" is readable from the rows
themselves and needs no extra flag on the session:

| The player | Status |
|---|---|
| answered | `Correct` / `Incorrect` |
| was present and said nothing | `TimedOut` |
| had already left | `NotAnswered` |

**A player who never submitted anything gets no session row at all.** Multiplayer counts toward
personal stats, so a row of blanks scoring zero would drag down the average of someone who joined,
saw one question and left — a game they did not play must not look like one they played badly.

### 7.3 When it is written

`MatchOrchestrator.PersistMatchAsync`, once, after the final scoreboard and before
`ResetToLobbyAsync` wipes the scores it reads. Per round would put a database round trip per player
per question inside a loop the players are watching a timer in.

- **An interrupted match writes nothing.** A cancelled or crashed loop never reaches that line, so
  there is no half-match row — half a match is not a record of anything.
- **Host id and quiz version are captured at match start**, because by the end the host may have
  left and the author may have edited the quiz.
- **A failed write is logged as itself** ("finished but could not be recorded") and never blocks the
  lobby from becoming startable again; the players already have their results.
- **A rematch is a new `Match` row.** It is a separate game with separate answers; the lobby is what
  persists across it (§3.1), not the match.

### 7.4 What had to learn about it

Two existing mechanisms would have mistaken a match session for an abandoned single-player one, so
both were taught the difference **before** anything started writing:

- `SessionAbandonmentService` filters on `Mode` in both queries, and `IsSessionAbandonedAsync`
  returns false for a match whoever asks. The second query matters as much as the first: it answers
  "does this player already have a game of this quiz running?", so an unfiltered match session would
  have blocked that player from starting the quiz alone (`MaxConcurrentSessionsPerUser` is 1).
- `ResolveAndResumeAsync` refuses an unfinished match and sends a finished one to its results. "Where
  was I?" has no answer for a game that ran on a shared clock with other people in the room.

### 7.5 Who reads it

- **Quiz analytics exclude multiplayer by default**, with a Solo / Multiplayer / Both control. A
  fixed clock and social pressure depress scores for reasons unrelated to question quality, and an
  author's average score is their signal for exactly that
  ([`quiz-analytics-page.md`](./quiz-analytics-page.md)).
- **Personal stats always include it.** The player played; it counts.
- **The results page is the single-player page.** `/quiz/results/:sessionId` and its review tab
  already render a session, so a match's per-player session gets those URLs for free.
- **Everyone in a match can read everyone's answers, permanently**, through `MatchPlayerTabs` on the
  review tab. You were all in the same room being asked the same questions, and hiding it a week
  later would be strange. `EnsureSessionOrMatchPeerAccessAsync` admits a match peer to exactly two
  reads — the roster and `/results` — and to nothing writable.

### 7.6 Still open

Whether a `Match` should survive its quiz being **soft-deleted**. Sessions deliberately outlive a
deleted quiz and a match currently does too, which is the reversible default; the reason to revisit
is if a deleted quiz's matches start appearing somewhere they shouldn't.

---

## 8. Known limitations

Multiplayer entries in [`known-issues.md`](../deployment/known-issues.md) are the tracked backlog;
this is the feature-level summary.

- **Room codes are generated client-side** with `Math.random()` and no server-side uniqueness
  check before `CreateSession`. A collision surfaces as "Session already exists". Codes should be
  issued by the server.
- ~~**No re-join after an automatic reconnect.**~~ — *fixed 2026-09-25* (§3.6). The client
  rejoins in `onreconnected`, and the rejoin is quiet. **Still true for Classic:** a player who
  reconnects mid-question gets no catch-up for the question on screen (only a Duel has one,
  `DuelState`); they rejoin at the next `QuestionStarted`.
- **Sessions never expire.** Nothing evicts an abandoned lobby that still has a participant record,
  so the dictionary grows for the process lifetime.
- **Single-instance only.** Lobby and match state live in in-memory singletons, so the backend
  can't be scaled horizontally and a deploy drops in-flight matches. Path when needed: SignalR
  Redis backplane + shared session store.
- **The `mode` prop is effectively dead.** `MultiplayerLobbyPage` accepts `mode: "create" | "join"`
  but `Router.tsx` renders it without the prop on both routes, so it is always `"join"`. The
  `mode === "create"` branches in `useLobbyConnection` (room-code generation, the create arm of
  auto-resume) are therefore unreachable — the create flow generates its code in
  `CreateLobbyDialog` instead. Candidate for removal.
- ~~**Lobby-full has no dedicated UI treatment**~~ — *fixed 2026-07-31.* It was worse than
  recorded: `AddParticipantAsync` threw `InvalidOperationException`, which SignalR does **not**
  relay (only `HubException` is, with `EnableDetailedErrors` off), and the client then replaced
  even that with a hardcoded `"The room may not exist."` — so a full lobby was reported as a
  missing one. Now a `SessionJoinException` carrying a `JoinFailureReason`, rethrown as
  `HubException`, and passed through verbatim by the client.
- **No validation of room-code shape on input.** (Names within a lobby are unique: one account,
  one pinned name, and a second account under a name the lobby has seen is refused.)
- **The Classic match loop has no automated tests.** `MatchPersistenceTests` covers the reads over the rows
  a match leaves (§7) and `QuizAPI.Tests` covers scoring, grading, auth, versioning and stats — the
  pieces the loop *calls* — but there is nothing for
  `MatchOrchestrator`'s round loop itself, and none for the lobby hooks. **The Duel loop is tested** (2026-09-25):
  `AssociationMatchOrchestratorTests` runs it on its real background task against a
  `FakeTimeProvider`, with the real session manager and the real lobby reset, and `HubHarness`
  (`QuizAPI.Tests/Multiplayer/`) drives `QuizHub` with SignalR's clients mocked — the pattern to
  copy for the Classic loop. The orchestrator is a singleton holding
  a hub context, a scope factory and a three-second countdown, so testing it means first deciding
  how much of that to fake. The lifecycle rules in §3 are exactly the kind of thing a test would
  have caught.
- **Rematch reset has a narrow theoretical race.** Session fields are mutated without a lock (as
  they are throughout this class), so a `StartMatch` landing in the microseconds between the loop
  nulling `MatchCts` and its reset completing could have its freshly-loaded state cleared. In
  practice unreachable: the reset clears ready flags, which gates `canStartQuiz`.

---

## 9. Working on it

**Locally:** run the API and `npm run dev`, then open the app in two browser profiles (not two tabs
— they'd share the account). Create in one, join with the code in the other, ready both, start.
Play a full match through to the results screen, then click "Back to lobby" in both and start a
second match: that's the regression path for §3.2.

**Debugging:** the hub logs connection events to the API console; `MatchOrchestrator` logs match
start, cancellation, failure and each return-to-lobby. On the client, the Network tab's WebSocket
frames show every event payload verbatim, which is usually faster than adding console logs.

**When changing the match loop,** check both terminal paths — the clean end *and* an exception or
cancellation mid-question — because both run through the same `finally`.

**After changing code,** run `graphify update .` to keep the knowledge graph current.

---

## 10. Changelog

| Date | Change |
|---|---|
| 2026-09-25 | **The disconnect grace removes people again** (§3.5): its background task no longer uses the disposed invocation scope. |
| 2026-09-25 | **The Associations Duel plays in the lobby, and a reconnect rejoins.** The pick carries a server-filled `Format`; a Board needs exactly 2 players and dispatches `StartMatch` to `AssociationMatchOrchestrator` (Duel events `DuelStarting` / `DuelStarted` / `DuelUpdated` / `DuelEnded` / `DuelState`; moves `OpenTile` / `GuessAssociation` / `PassTurn`) — [`associations.md`](./associations.md) §10. Leaving mid-Duel forfeits ([ADR 0021](../adr/0021-a-duel-is-forfeited-when-the-lobby-drops-the-player.md)). The client re-invokes `JoinSession` after an automatic reconnect, and a rejoin no longer announces `UserJoined` (§3.6). First tests of a match loop and of the hub. |
| 2026-09-16 | **A host who refreshes keeps their lobby.** The 5s disconnect grace is fine for a socket blip and too short for a cold page load — boot the SPA, authenticate, open the connection, re-join — so the host was removed before the browser was ready. A host alone in the lobby is the common case, and removing the last participant destroyed the session outright, so the client's auto-resume then asked to rejoin a room that no longer existed and the user was left on an empty page with a "could not rejoin" toast. An empty lobby now lingers 90s (`EmptySinceUtc` + `TryGetLiveSession` + a sweep on create) with its code, name, quiz pick and `HostUsername` intact, so the returning host comes back *as host*. Deliberately not fixed by widening the disconnect grace, which would leave a player who genuinely left sitting in everyone's roster, marked ready, for a minute and a half. The client also surfaces a failed resume through `joinError` — the view's own error state, carrying the server's message — instead of a toast over a blank lobby. |
| 2026-09-14 | **A match is recorded when it ends** — §7, folded in from the multiplayer-persistence plan doc, which this replaces and which is deleted. One `Match` row plus the same `QuizSession` and `UserAnswer` rows single player writes, so analytics, stats and the results pages read a match without being taught what one is. Analytics exclude matches by default (Solo / Multiplayer / Both); the review tab grows a tab per player. **Sections 7, 8 and 9 became 8, 9 and 10** to make room — a citation to an old §7–§9 elsewhere is off by one. |
| 2026-08-02 | **The desktop board fits the viewport.** The shell takes an explicit `calc(100dvh - header)` height (a percentage `h-full` can't work — the layout's `min-h-full` wrapper leaves the height indefinite) and the 2×2 grid divides it with an `auto` top row and a `minmax(0,1fr)` bottom row. Chat's message list fills its share instead of forcing a hard-coded `lg:h-[17rem]`. The lobby had been overflowing the fold on laptop-height screens, and chat grew instead of scrolling. |
| 2026-08-02 | **A blocked navigation mid-match now has a way out.** `useNavigationGuard` is armed for the whole session, but the dialog that resolves it lived only inside `<LobbyPageView>` — on the far side of `MultiplayerLobbyPage`'s early return for an active match. Clicking a header link during a match armed the blocker, showed nothing, and left it stuck in `blocked`; each further click produced a new blocker object and re-rendered the game subtree, which froze the question timer. `<LeaveLobbyDialog>` is now rendered in both branches, with match-specific copy. Full write-up: [`quiz-timer.md`](./quiz-timer.md). |
| 2026-08-02 | **The question timer no longer restarts on re-render, and no longer trusts the device clock.** `QuizTimer` holds its callbacks in refs so its countdown effect depends on primitives only, and re-anchors its deadline exactly twice — new question, and resume from pause. Separately, `useMatch` now measures the server/client clock offset from each `QuestionStarted` and `multiplayer-question-view` corrects for it, so a phone with a drifted clock no longer opens a 30s question at 32 or 34. |
| 2026-08-02 | **Mobile chat composer fixes.** The drawer no longer focuses the input on open (`onOpenAutoFocus` prevented), the input is `text-base lg:text-sm` so iOS stops zooming — the zoom was what pushed the send button off-screen — and `enterKeyHint="send"` relabels the keyboard's return key. Send button bumped to `h-9` on touch. |
| 2026-08-02 | **Chat moves to a drawer on phones.** Under `lg` the chat panel leaves the stacked column for a bottom drawer behind a floating button with an unread badge (`MobileChatDrawer`, `useChatUnread`). `useLobbyChat` was hoisted from `LobbyChat` to `MultiplayerLobbyPage` so the two shells can both mount without double-registering the shared connection's handlers. |
| 2026-07-31 | **Chat is private to who was in the room.** `Participant.FirstJoinedAt` + `GetMessagesSinceJoinAsync` replace the unconditional `GetRecentMessagesAsync` replay, so a new joiner no longer receives chat sent before they arrived. Rejoins keep their history because the stamp isn't refreshed. |
| 2026-07-31 | **Join failures are reported honestly.** Added `CheckSession` + `SessionAvailability` (dialog pre-flight), `SessionJoinException` → `HubException` so the cause survives to the client, and moved `Groups.AddToGroupAsync` after the participant add to stop failed joiners staying subscribed. A bad code no longer strands the player on the lobby route ([`multiplayer-join.md`](./multiplayer-join.md)). |
| 2026-07-31 | **Rematch fixed.** Added `ResetToLobbyAsync`, run from the match loop's `finally`; the start guard became loop liveness (`MatchCts`) instead of `QuizState`; ready flags now clear on reset. Previously only one match could ever be played per lobby. |
| 2026-07-31 | **Late joiners receive the host's quiz pick.** `MultiplayerSession` stores the full `SelectedQuizView` (with `SelectedQuizId` as a computed accessor), and `JoinSession` replays `QuizSelected` to the caller. |
| 2026-07-31 | **Lobby panel-board layout.** 2×2 `LobbyPanel` grid replaced the previous redesign; dropped the sticky mobile CTA bar, the chat `Accordion`, `useIsCompactLayout`, `LobbyInfoBar` and `LobbyInfoBanner`. |
| 2026-07-30 | **Lobby capacity sent to clients.** `LobbySettingsChanged` existed in `IQuizClient` but was never called; `CreateSession`/`JoinSession` now emit it, and the roster renders real empty slots. |
| 2026-07-30 | **Lobby UI redesign** and the `MultiplayerLobbyPage` / `LobbyPageView` split (thin wrapper + prop-driven view), matching the `MultiplayerGame` / `QuizInterface` pattern. Multiplayer-only match phases got a visual pass and the `FloatingAvatarCluster`. |
| 2026-07-14 | **Participant avatars.** `ProfileImageUrl` looked up server-side on join/create and carried on `UserJoined` / `CurrentParticipants`. Removed the redundant `/multiplayer/create` route, deleted the dead `Multiplayer-Host-Wrapper.tsx`, added error boundaries to the multiplayer routes. |
| 2026-07-14 | **Join flow consolidated** — the lobby page owns the single join; typed code and invite link behave identically ([`multiplayer-join.md`](./multiplayer-join.md)). |
| 2026-06-22 | **Question screen unified** with singleplayer via `MultiplayerQuestionView` + `QuestionCard`. |
| 2026-06-20 | **Auth.** Lobby routes require login, the hub is `[Authorize]`'d, and identity comes from `Context.User` rather than a client-supplied name ([`play-auth-and-identity.md`](../auth/play-auth-and-identity.md)). |

> Earlier "Phase 1" planning documents lived outside the repo and are no longer reachable; their
> surviving conclusions are folded into the sections above.
