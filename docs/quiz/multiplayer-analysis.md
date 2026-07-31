# Multiplayer Feature Documentation

## Overview
The multiplayer feature allows users to create or join real-time quiz lobbies using SignalR for bidirectional communication between the React frontend and ASP.NET Core backend. Players can compete together in synchronized quiz sessions.

---

## Architecture

### Backend (ASP.NET Core)
- **SignalR Hub**: [`QuizHub.cs`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/OxygenBackend/QuizAPI/Hubs/QuizHub.cs)
  - Handles real-time connections and method invocations
  - Methods: `CreateSession`, `JoinSession`, `LeaveSession`, `ToggleReady`, `SelectQuiz`,
    `SendLobbyMessage`, `StartMatch`, `SubmitAnswer` (full signatures in
    [API Reference](#api-reference) below)

- **Session Manager**: [`InMemoryQuizSessionManager.cs`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/OxygenBackend/QuizAPI/Services/QuizSessionServices/InMemoryQuizSessionManager.cs)
  - Stores active sessions in `ConcurrentDictionary`
  - Manages participants, host assignment, and ready states
  - Thread-safe operations with locking

- **Client Interface**: [`IQuizClient.cs`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/OxygenBackend/QuizAPI/Hubs/Clients/IQuizClient.cs)
  - Defines server-to-client events: `UserJoined`, `UserLeft`, `PlayerReadyChanged`, `HostChanged`,
    `CurrentParticipants`, `LobbySettingsChanged`, `QuizSelected`, plus the live-match events
    (`MatchStarting`, `QuestionStarted`, `QuestionEnded`, `MatchEnded`) and lobby chat
    (`ChatMessageReceived`, `ChatHistory`)

### Frontend (React + TypeScript)
- **Context**: [`MultiplayerContext`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/src/context/multiplayer-context.tsx)
  - Manages global SignalR connection
  - Provides methods: `joinSession`, `leaveSession`, `submitAnswer`
  - Handles automatic reconnection

- **Main Components**:
  [`MultiplayerLobbyPage.tsx`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/src/pages/Quiz/Multiplayer/MultiplayerLobbyPage.tsx)
  (thin data-wrapper: calls `useLobbyConnection`/`useMatch`) +
  [`LobbyPageView.tsx`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/src/pages/Quiz/Multiplayer/LobbyPageView.tsx)
  (presentational, storied — see [Lobby UI redesign](#lobby-ui-redesign-2026-07-30) below)
  - Supports two modes: `create` and `join`
  - Uses derived state for `isHost` and `isReady` (computed from participants list)
  - Real-time participant list with status indicators

- **Routing** (`src/routes/Router.tsx`):
  - `/multiplayer-menu` → `MultiplayerMenu` — mode selection; "Create"/"Join" open
    `CreateLobbyDialog`/`JoinLobbyDialog` (dialogs, not routes — the old full-page
    `/multiplayer/create` route was removed 2026-07-14)
  - `/multiplayer/lobby/:sessionId` → `MultiplayerLobbyPage` — a created lobby, or the
    destination the typed-code join dialog navigates to
  - `/multiplayer/join` → `MultiplayerLobbyPage` — shared invite link entry point, reads the room
    code from `?code=` (see [`multiplayer-join.md`](./multiplayer-join.md) for the full join-flow
    writeup)

---

## User Flows

### Creating a Lobby (Host)
1. User navigates: Home → Choose Mode → Multiplayer → `/multiplayer-menu`
2. Clicks "Create Lobby" → opens `CreateLobbyDialog` (a dialog on the menu page, not a route)
3. Picks a max-player count (2–10) and confirms. Identity is always the logged-in account —
   nothing is typed here.
4. Room code auto-generated client-side (6-character alphanumeric); SignalR:
   `CreateSession(sessionId, lobbyName, maxPlayers)` invoked
5. Backend creates the session and assigns the caller as host; dialog closes and navigates to
   `/multiplayer/lobby/:sessionId`
6. Lobby displays with the room code prominent for sharing (copy button)
7. Host picks a quiz (`QuizSelectionDialog` → `SelectQuiz`) and toggles ready like everyone else
8. Once ≥2 players, everyone (including the host) is ready, and a quiz is selected, the host can
   start the match (`StartMatch` → the live `MultiplayerGame` screen takes over, driven by the
   `MatchStarting`/`QuestionStarted`/`QuestionEnded`/`MatchEnded` events)

### Joining a Lobby (Participant)
Two equivalent entry points — see [`multiplayer-join.md`](./multiplayer-join.md) for the full
writeup of why they behave identically:
1. Typed code: Home → Choose Mode → Multiplayer → `/multiplayer-menu` → "Join Lobby" →
   `JoinLobbyDialog` (room code input; identity is the account, not typed) → navigates to
   `/multiplayer/lobby/:sessionId`
2. Shared invite link: opens `/multiplayer/join?code=XYZ123` directly
3. Either way, `useLobbyConnection` performs the **actual** join itself, once the SignalR
   connection is live: `JoinSession(sessionId)` invoked
4. Backend adds the participant to the session
5. All clients receive `UserJoined`; the new user also receives `CurrentParticipants` (full
   roster) and `LobbySettingsChanged` (lobby's max-player count)
6. Participant toggles ready status and waits for the host to pick a quiz and start the match

### Auto-Resume After Disconnect
1. Session data stored in `sessionStorage`
2. On page reload, checks for stored session
3. If in join mode OR (create mode AND session matches), auto-rejoins
4. Otherwise, clears stale session data

---

## Key Features

### Participant Avatars (added 2026-07-14)
- `Participant` (backend + frontend) carries `ProfileImageUrl`, looked up from the account by the
  hub on `JoinSession`/`CreateSession` (never trusted from the client, same rule as usernames).
- `UserJoined` broadcasts `(username, isFirstUser, profileImageUrl)` so existing clients render
  the newcomer's avatar without a refetch; `CurrentParticipants` includes it for late joiners.
- The lobby's participant card shows the image when present and falls back to the colored-initial
  tile when the account has no avatar (or the image URL fails to load).

### Lobby capacity is now sent to the client (added 2026-07-30)
- `MultiplayerSession.MaxPlayers` was already enforced server-side (`AddParticipantAsync` throws
  once full) but was never sent back to clients after creation — `IQuizClient.LobbySettingsChanged
  (lobbyName, maxPlayers)` existed in the interface but nothing ever called it. `QuizHub.CreateSession`
  and `QuizHub.JoinSession` now emit it to `Clients.Caller` right after `CurrentParticipants`, so
  every client (creator or joiner, including late joiners) learns the real limit at connect time.
- `useLobbyConnection` exposes it as `maxPlayers` (0 = not received yet). `ParticipantGrid` uses it
  to render dashed empty-slot placeholders up to the real per-lobby limit (2–10), not a hardcoded
  number.

### Lobby UI redesign (2026-07-30)
- The whole pre-match lobby screen was rebuilt for visual hierarchy and mobile UX: a prominent
  room-code pill header, a single primary CTA (host: Browse & Select Quiz → Start Quiz; player:
  Ready Up ↔ Cancel Ready), a responsive avatar grid (shadcn `Avatar`, ready-state ring, host
  crown, dashed empty slots), and a chat panel on `ScrollArea`. On phones the CTA became a sticky
  bottom bar and chat collapsed into an `Accordion`.
- Structurally, `MultiplayerLobbyPage` is now a thin data-wrapper around a presentational
  `LobbyPageView` (same split already used for `MultiplayerGame`/`QuizInterface` — see
  `docs/development/storybook.md` §3–4). The full lobby, every state, is previewable with no
  backend via `LobbyPageView.stories.tsx`.
- **Superseded by the panel-board layout below.** The structural split (thin wrapper +
  prop-driven view + slot props) survives; the layout described above does not.

### Lobby panel-board layout (2026-07-31)
- The lobby is now a fixed 2×2 board of `LobbyPanel`s — **Players** / **Room** on top, **Chat** /
  **Quiz** below — collapsing to one stacked column under `lg`. `LobbyPanel`
  (`components/lobby/lobby-panel.tsx`) is the single structural unit: bordered box, solid title
  bar, inset body. Panels are *explicitly* grid-placed (`lg:col-start-*`/`lg:row-start-*`) so the
  DOM can order Quiz before Chat for the mobile column without that order reaching desktop.
- Dropped in the process: the sticky mobile CTA bar, the chat `Accordion`, `useIsCompactLayout`,
  `LobbyInfoBar` and `LobbyInfoBanner`. Chat is one panel at every breakpoint now, so there is no
  breakpoint-switched wrapper around the live chat slot at all (see the note in
  `docs/RESPONSIVE.md`). `lobby-info-bar.tsx` / `lobby-info-banner.tsx` are dead files.
- Ready and Start are equal-sized sibling buttons sized to their labels (shared `ACTION_SIZE` in
  `lobby-actions.tsx`), both primary — Ready outlined in *both* states so toggling changes only
  its fill, never its shape.
- **Type zones:** `font-quiz` cascades from the page shell, so labels, buttons, names and chat all
  wear the user's display font. Two deliberate opt-outs — panel title bars (`font-header`: they're
  chrome, and `--font-quiz` is a user setting that shouldn't restyle the furniture) and the room
  code (`font-mono`: `0` vs `O` must be unambiguous for someone typing it in).
- **Surfaces:** panel bodies are `--background` in light mode with the page behind them `bg-muted`;
  dark mode inverts that relationship (tinted `bg-muted/40` bodies on the inherited dark page).
  Anything sitting *on* a panel body therefore needs a light-mode tint of its own — a translucent
  `bg-background/60` is invisible there.

### Late joiners now receive the host's quiz pick (2026-07-31)
- `QuizSelected` was only ever broadcast at the moment of selection, and the session stored just
  `SelectedQuizId` — so a player joining after the host had chosen saw "waiting for the host to
  select a quiz" indefinitely, with no event able to correct it.
- `MultiplayerSession` now holds the full `SelectedQuizView` (`SelectedQuizId` remains as a
  computed `=> SelectedQuiz?.Id`, which is all `MatchOrchestrator` needs). `SetQuizAsync` takes the
  payload rather than an id string, and `QuizHub.JoinSession` replays `QuizSelected` to
  `Clients.Caller` when a pick exists — alongside the existing `CurrentParticipants` /
  `LobbySettingsChanged` / `ChatHistory` catch-up sends.
- Same shape of bug to watch for elsewhere: any state that is *only* announced by a broadcast
  event needs a corresponding replay in `JoinSession`, or it is invisible to late joiners.

### Host Management
- **First user** in a session becomes host automatically
- **Host reassignment**: When host leaves, next participant becomes host
- **Host notifications**: All clients notified via `HostChanged` event
- **Host privileges**: Only host can start the game

### Ready Status
- Each participant can toggle ready/not ready
- Server manages state via `SetPlayerReadyAsync`
- All clients receive `PlayerReadyChanged` events
- Host can only start when ≥2 players and all are ready

### Real-time Synchronization
- **Join/Leave**: Broadcast to all participants
- **Ready changes**: Instant updates across all clients
- **Host changes**: Automatic UI updates (crown icon moves)
- **Graceful disconnection**: `OnDisconnectedAsync` handles cleanup

### Error Handling
- Connection state validation before operations
- Descriptive error messages thrown from backend
- Frontend displays errors via notifications
- Loading states during async operations

---

## Technical Implementation Details

### State Management
```typescript
// Derived state pattern (no separate isHost/isReady state)
const currentUser = useMemo(
  () => participants.find(p => p.username === username),
  [participants, username]
);
const isHost = currentUser?.isHost ?? false;
const isReady = currentUser?.isReady ?? false;
```

### Event Listeners
```typescript
connection.on("UserJoined", (username, isFirstUser, profileImageUrl) => { /* ... */ });
connection.on("UserLeft", (username) => { /* ... */ });
connection.on("PlayerReadyChanged", (username, ready) => { /* ... */ });
connection.on("HostChanged", (newHostUsername) => { /* ... */ });
connection.on("QuizSelected", (quiz) => { /* { id, title, category?, difficulty?, questionCount? } */ });
connection.on("CurrentParticipants", (participants) => { /* ... */ });
connection.on("LobbySettingsChanged", (lobbyName, maxPlayers) => { /* ... */ });
```
(`src/pages/Quiz/Multiplayer/hooks/use-lobby-connection.ts`. There's a second, separate listener
set for the live-match phase in `use-match.ts` — `MatchStarting`/`QuestionStarted`/`QuestionEnded`/
`MatchEnded` — and a third for chat in `use-lobby-chat.ts`.)

### Host Reassignment Logic
```csharp
// Backend: When host leaves
if (participant.IsHost && session.Participants.Count > 0)
{
    var newHost = session.Participants.First();
    newHost.IsHost = true;
    session.HostUsername = newHost.Username;
    await Clients.Group(sessionId).HostChanged(newHost.Username);
}
```

---

## Current Status

### ✅ Completed (Phase 1)
- Session creation and joining
- Host assignment and reassignment
- Ready status toggle (fully functional)
- Real-time participant synchronization
- Graceful disconnection handling
- Auto-resume after page refresh
- Comprehensive error handling
- Derived state pattern for UI consistency

### 🚧 Known Limitations
- No input validation (username/room code format)
- Sessions never expire (memory leak)
- ~~No maximum lobby size enforcement~~ — already enforced server-side
  (`AddParticipantAsync` rejects joins past `MaxPlayers`); as of 2026-07-30 the limit is also
  communicated to the client (see "Lobby capacity" above), it just wasn't documented here.
- Hardcoded API URL (not environment-aware)
- No unit or integration tests
- No username uniqueness validation
- ~~No security/authentication~~ — **implemented 2026-06-20:** the lobby routes require login,
  identity is derived from the authenticated account (the host's name is their real username),
  and the hub is `[Authorize]`'d with the username taken from `Context.User` (no longer trusted
  from the client). See [`play-auth-and-identity.md`](../auth/play-auth-and-identity.md).

The following were identified during the lobby refactor and re-verified against the code on
2026-07-14 (absorbed from the now-deleted `src/pages/Quiz/Multiplayer/improvements.md`):

- **Room codes are generated client-side** — still open. `Math.random().toString(36)` in
  `use-lobby-connection.ts` and `create-lobby-dialog.tsx`, with no server-side uniqueness check
  before `CreateSession`. Codes should be issued by the server (hub method or REST endpoint).
- ~~`/multiplayer/create` full-page route is redundant~~ — **fixed 2026-07-14:** the route and the
  full-page `create-lobby.tsx` were removed; the create-lobby dialog on the multiplayer menu is
  the single create flow.
- ~~`Multiplayer-Host-Wrapper.tsx` is dead code~~ — **fixed 2026-07-14:** deleted (nothing
  referenced it and no route supplied its loader data).
- ~~Multiplayer routes have no error boundaries~~ — **fixed 2026-07-14:** `/multiplayer-menu`,
  `/multiplayer/join`, and `/multiplayer/lobby/:sessionId` now use `DashboardErrorElement`, same
  as the quiz session routes.

Two items from that list were already fixed and documented elsewhere: duplicate join logic
(dialog navigates, lobby owns the single join — see [`multiplayer-join.md`](./multiplayer-join.md))
and username-not-tied-to-auth (identity now always comes from the authenticated account, per the
security note above).

### 📋 Next Steps (Phase 2+)
See [`implementation_plan.md`](file:///C:/Users/hp/.gemini/antigravity/brain/a79d957d-a384-46b9-adfc-42628fbd6534/implementation_plan.md) for detailed roadmap:
- **Phase 2**: Input validation, session cleanup, robustness
- **Phase 3**: Production readiness (env vars, logging, tests)
- **Phase 4**: Advanced features (chat, spectator mode, lobby settings)

---

## UI/UX Features

### Visual Indicators
- **Crown badge**: small amber badge overlapping the host's avatar (was a corner ribbon pre-2026-07-30 redesign)
- **Ready Status**: emerald ring around the avatar + a small check badge (was green/grey text pre-2026-07-30 redesign)
- **Connection Status**: Badge showing connected/disconnected state
- **Loading States**: "Joining..." button text during operations

### Notifications
- User joined/left lobby
- Host reassignment
- Ready status changes
- Error messages
- Success confirmations

### Responsive Design
- Mobile-friendly grid layout
- Adaptive button sizes
- Scrollable participant list
- Touch-friendly controls

---

## API Reference

### Backend Methods (QuizHub)
Identity (`username`) is never a client-supplied parameter — every method reads it off
`Context`/`Context.Items`, populated from the authenticated JWT on connect (see
[`play-auth-and-identity.md`](../auth/play-auth-and-identity.md)).

| Method | Parameters | Description |
|--------|------------|-------------|
| `CreateSession` | sessionId, lobbyName, maxPlayers | Create a new lobby; caller becomes host |
| `JoinSession` | sessionId | Join an existing lobby |
| `LeaveSession` | sessionId | Leave a lobby |
| `ToggleReady` | sessionId, isReady | Update the caller's own ready status |
| `SelectQuiz` | sessionId, quiz | Host picks the quiz to play. `quiz` is a `SelectedQuizView` (`id`, `title`, `category?`, `difficulty?`, `questionCount?`); only `id` is authorized server-side — see `quiz-visibility.md` |
| `SendLobbyMessage` | sessionId, text | Ephemeral lobby chat (lobby phase only) |
| `StartMatch` | sessionId | Start the live match (host only) — drives the `MultiplayerGame` screen |
| `SubmitAnswer` | sessionId, answer, clientElapsedMs? | Submit an answer during a live match question |

### Client Events (IQuizClient)
| Event | Parameters | Description |
|-------|------------|-------------|
| `UserJoined` | username, isFirstUser, profileImageUrl | User joined session |
| `UserLeft` | username | User left session |
| `AnswerSubmitted` | username | Live-match: someone submitted an answer this round (no answer content) |
| `CurrentParticipants` | participants[] | Full participant list |
| `PlayerReadyChanged` | username, isReady | Ready status changed |
| `HostChanged` | newHostUsername | New host assigned |
| `QuizSelected` | quiz | Host picked the quiz to play (`SelectedQuizView`). Broadcast to the group on `SelectQuiz`, **and** replayed to `Clients.Caller` on `JoinSession` when a pick already exists |
| `LobbySettingsChanged` | lobbyName, maxPlayers | Sent to `Clients.Caller` on `CreateSession`/`JoinSession` — lobby capacity |
| `MatchStarting` | countdownSeconds | Live match: pre-first-question countdown begins |
| `QuestionStarted` | question, deadlineUtc | Live match: a question is now live |
| `QuestionEnded` | result | Live match: round results + updated scoreboard |
| `MatchEnded` | result | Live match: final scoreboard + winner |
| `ChatMessageReceived` | message | New lobby chat message |
| `ChatHistory` | messages[] | Recent lobby chat, sent to a newly-joined client |

---

## Configuration

### Backend
- SignalR endpoint: `/quizHub`
- Session storage: In-memory (singleton)
- Connection timeout: Default SignalR settings

### Frontend
- API URL: `https://localhost:7153` (hardcoded, needs env var)
- Auto-reconnect: Enabled
- Session storage key: `"quiz_session"`

---

## Troubleshooting

### Common Issues

**Issue**: Ready button doesn't work
- **Status**: ✅ Fixed in Phase 1
- **Solution**: `ToggleReady` method now implemented

**Issue**: Host status not updating
- **Status**: ✅ Fixed in Phase 1
- **Solution**: Using derived state from participants list

**Issue**: Can't rejoin after refresh
- **Status**: ✅ Fixed in Phase 1
- **Solution**: Auto-resume logic with mode checking

**Issue**: Duplicate route errors
- **Status**: ✅ Fixed in Phase 1
- **Solution**: Removed duplicate `/multiplayer-menu` route

---

## Development Notes

### Testing Locally
1. Start backend: Run API project
2. Start frontend: `npm run dev`
3. Open multiple browser windows/tabs
4. Create lobby in one, join from others
5. Test ready status, host leaving, etc.

### Debugging
- Backend logs: Check console for SignalR connection events
- Frontend logs: Browser console shows connection state
- Network tab: Monitor SignalR WebSocket traffic

---

## References

- [Phase 1 Summary](file:///C:/Users/hp/.gemini/antigravity/brain/a79d957d-a384-46b9-adfc-42628fbd6534/phase1_summary.md)
- [Implementation Plan](file:///C:/Users/hp/.gemini/antigravity/brain/a79d957d-a384-46b9-adfc-42628fbd6534/implementation_plan.md)
- [Original Analysis](file:///C:/Users/hp/.gemini/antigravity/brain/a79d957d-a384-46b9-adfc-42628fbd6534/multiplayer_lobby_analysis.md)
