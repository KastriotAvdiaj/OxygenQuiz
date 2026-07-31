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

## 1. Architecture

### Backend (ASP.NET Core, `OxygenBackend/QuizAPI`)

| Piece | File | Role |
|---|---|---|
| `QuizHub` | `Hubs/QuizHub.cs` | The only client-callable surface. `Hub<IQuizClient>`, `[Authorize]`, mapped at **`/quizHub`** (`Program.cs`). |
| `IQuizClient` | `Hubs/Clients/IQuizClient.cs` | Strongly-typed server→client events. Adding an event here is what makes it callable as `Clients.Group(...).Foo(...)`. |
| `IQuizSessionManager` / `InMemoryQuizSessionManager` | `Services/QuizSessionServices/` | Lobby store. A `ConcurrentDictionary<string, MultiplayerSession>` keyed by room code; per-session mutations take `lock (session)`. Registered **singleton**. |
| `IMatchOrchestrator` / `MatchOrchestrator` | `Services/QuizSessionServices/` | The match loop: load questions → countdown → per-question round loop → grade → reveal → final result → reset. Registered **singleton**; broadcasts through `IHubContext<QuizHub, IQuizClient>`. |
| `MultiplayerSession` | `Services/QuizSessionServices/MultiplayerSession.cs` | One lobby's entire state — roster, settings, selected quiz, chat buffer, and the live-match runtime fields. |
| Match DTOs | `Services/QuizSessionServices/MatchModels.cs` | Wire contracts. Note the deliberate split: `RoundQuestion` is server-only and holds the grading key; `RoundQuestionView` / `RoundOption` are what clients see and carry **no** correct-answer information. |

Grading is *not* reimplemented here — `MatchOrchestrator.GradeRoundAsync` resolves
`IAnswerGradingService` from a fresh DI scope and reuses the same service singleplayer uses.

### Frontend (React + TypeScript, `src/`)

| Piece | File | Role |
|---|---|---|
| `MultiplayerProvider` | `context/multiplayer-context.tsx` | Owns the one shared `HubConnection` and exposes typed invoke wrappers. |
| `useLobbyConnection` | `pages/Quiz/Multiplayer/hooks/use-lobby-connection.ts` | Lobby-phase state: roster, ready, host, selected quiz, join/leave. |
| `useMatch` | `pages/Quiz/Multiplayer/hooks/use-match.ts` | Match-phase state, driven purely by server events. |
| `useLobbyChat` | `pages/Quiz/Multiplayer/hooks/use-lobby-chat.ts` | Chat history + send. |
| `MultiplayerLobbyPage` | `pages/Quiz/Multiplayer/MultiplayerLobbyPage.tsx` | Thin data wrapper. Renders `<MultiplayerGame>` while `match.isActive`, otherwise `<LobbyPageView>`. |
| `LobbyPageView` | `pages/Quiz/Multiplayer/LobbyPageView.tsx` | Presentational lobby, fully prop-driven (Storybook-previewable with no backend). |
| `MultiplayerGame` | `pages/Quiz/Multiplayer/components/game/MultiplayerGame.tsx` | The in-match screen: countdown, question, reveal, results. |

**Three separate listener sets** bind to the same connection, one per concern —
`use-lobby-connection` (roster/host/quiz), `use-match` (match events), `use-lobby-chat` (chat).
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
| Which screen *this* player sees | Client (`useMatch.phase`) | Local — see the asymmetry in §3.4 |

**The late-joiner rule.** Any state announced *only* by a broadcast event is invisible to anyone
who joins afterwards. Every such field needs a matching replay in `JoinSession`. Today that's
`CurrentParticipants`, `LobbySettingsChanged`, `QuizSelected` and `ChatHistory`. When you add a
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
  the participant *only if their `ConnectionId` is still the one that dropped*. This is what makes a
  page refresh survivable: the client reconnects and re-joins with a new connection id, so the
  delayed check sees a different id and leaves them alone.
- **Host reassignment** — `RemoveParticipantAsync` promotes `Participants.First()` and updates
  `HostUsername`; the hub broadcasts `HostChanged`.
- **Empty lobby** — cancels `MatchCts` and removes the session from the dictionary.

---

## 4. Flows

### 4.1 Creating a lobby

1. `/multiplayer-menu` → "Create Lobby" opens `CreateLobbyDialog`.
2. The host picks a max-player count (2–10). Identity is the logged-in account — nothing is typed.
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
- `canStartQuiz` (client) = host **and** ≥2 participants **and** all ready **and** a quiz selected.
  The server independently re-checks the quiz and the ≥2 count in `StartMatchAsync`; the client
  computation is convenience, not enforcement.

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
(`InMemoryQuizSessionManager.MaxRecentMessages`), replayed to each joiner as `ChatHistory`. The
client keeps the newest 200. Messages are trimmed and truncated to 500 chars server-side, the
sender is taken from the connection context, and chat is rejected outside the `Lobby`/`Starting`
phases. Nothing is persisted — the MongoDB archiver was removed
(see [`mongodb.md`](../data/mongodb.md)).

---

## 5. API reference

### Hub methods (client → server)

Identity is **never** a parameter. Every method derives the username from the connection.

| Method | Parameters | Auth | Notes |
|---|---|---|---|
| `CreateSession` | `sessionId, lobbyName, maxPlayers` | any authenticated | Caller becomes host. Throws if the code already exists. |
| `JoinSession` | `sessionId` | any authenticated | Throws `"This lobby is full."` past `MaxPlayers`. Idempotent for an existing participant. |
| `LeaveSession` | `sessionId` | participant | Broadcasts `UserLeft`, plus `HostChanged` if the host left. |
| `ToggleReady` | `sessionId, isReady` | participant | Sets the **caller's** own flag only. |
| `SelectQuiz` | `sessionId, quiz` | **host** | `quiz` is a `SelectedQuizView`; only `Id` is authorized (`CanHostQuizAsync`). |
| `SendLobbyMessage` | `sessionId, text` | participant | Lobby/Starting phases only. |
| `StartMatch` | `sessionId` | **host** | Rethrows the orchestrator's `InvalidOperationException` as a `HubException`, so the client shows the real reason. |
| `SubmitAnswer` | `sessionId, answer, clientElapsedMs?` | participant | Returns silently (no throw) when not accepting answers. |

> **Identity source inconsistency.** `JoinSession`, `LeaveSession`, `ToggleReady` and
> `SubmitAnswer` read the username from the **JWT** (`GetUsername()`), while `StartMatch`,
> `SelectQuiz` and `SendLobbyMessage` read it from **`Context.Items["Username"]`**, which is
> populated by `CreateSession`/`JoinSession`. Both are safe (neither trusts the client), but the
> `Context.Items` variety is per-connection, so it is empty on a connection that has not joined —
> which is what surfaces as `"You are not in this lobby."`. See the reconnect gap in §7.

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

---

## 6. UI notes

The lobby is a fixed 2×2 board of `LobbyPanel`s — **Players** / **Room** top row, **Chat** /
**Quiz** bottom row — collapsing to one stacked column under `lg`. Panels are *explicitly*
grid-placed (`lg:col-start-*` / `lg:row-start-*`) so the DOM can order Quiz before Chat for the
mobile column without that order reaching desktop. `LobbyPanel` is the single structural unit:
bordered box, solid title bar, inset body.

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

## 7. Known limitations

Multiplayer entries in [`known-issues.md`](../deployment/known-issues.md) are the tracked backlog;
this is the feature-level summary.

- **Room codes are generated client-side** with `Math.random()` and no server-side uniqueness
  check before `CreateSession`. A collision surfaces as "Session already exists". Codes should be
  issued by the server.
- **No re-join after an automatic reconnect.** The connection is built `.withAutomaticReconnect()`,
  but nothing binds `onreconnected`, so a recovered connection is a *new* connection id that is not
  in the SignalR group and has empty `Context.Items`. The client stops receiving group broadcasts,
  the `Context.Items`-based hub methods reject it, and `OnDisconnectedAsync`'s 5-second check —
  which compares against the id that dropped — removes the player from the roster. A reconnect
  handler that re-invokes `JoinSession` would close all three.
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
- **Lobby-full has no dedicated UI treatment** — the join surfaces the generic
  `"This lobby is full."` from the hub.
- **No username uniqueness constraint** within a lobby beyond account identity, and no validation
  of room-code shape on input.
- **No automated tests.** `QuizAPI.Tests` covers scoring, grading, auth, versioning and stats — the
  pieces the match loop *calls* — but there are no tests for the hub, the session manager or the
  orchestrator itself, and none for the lobby hooks. The lifecycle rules in §3 are exactly the kind
  of thing a test would have caught.
- **Rematch reset has a narrow theoretical race.** Session fields are mutated without a lock (as
  they are throughout this class), so a `StartMatch` landing in the microseconds between the loop
  nulling `MatchCts` and its reset completing could have its freshly-loaded state cleared. In
  practice unreachable: the reset clears ready flags, which gates `canStartQuiz`.

---

## 8. Working on it

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

## 9. Changelog

| Date | Change |
|---|---|
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
