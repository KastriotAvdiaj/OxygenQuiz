# Multiplayer Feature Documentation

## Overview
The multiplayer feature allows users to create or join real-time quiz lobbies using SignalR for bidirectional communication between the React frontend and ASP.NET Core backend. Players can compete together in synchronized quiz sessions.

---

## Architecture

### Backend (ASP.NET Core)
- **SignalR Hub**: [`QuizHub.cs`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/OxygenBackend/QuizAPI/Hubs/QuizHub.cs)
  - Handles real-time connections and method invocations
  - Methods: `JoinSession`, `LeaveSession`, `ToggleReady`, `StartQuiz`, `SubmitAnswer`
  
- **Session Manager**: [`InMemoryQuizSessionManager.cs`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/OxygenBackend/QuizAPI/Services/QuizSessionServices/InMemoryQuizSessionManager.cs)
  - Stores active sessions in `ConcurrentDictionary`
  - Manages participants, host assignment, and ready states
  - Thread-safe operations with locking

- **Client Interface**: [`IQuizClient.cs`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/OxygenBackend/QuizAPI/Hubs/Clients/IQuizClient.cs)
  - Defines server-to-client events: `UserJoined`, `UserLeft`, `PlayerReadyChanged`, `HostChanged`, `GameStarted`, `CurrentParticipants`

### Frontend (React + TypeScript)
- **Context**: [`MultiplayerContext`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/src/context/multiplayer-context.tsx)
  - Manages global SignalR connection
  - Provides methods: `joinSession`, `leaveSession`, `submitAnswer`
  - Handles automatic reconnection

- **Main Component**: [`MultiplayerLobby`](file:///c:/Users/hp/source/repos/KastriotAvdiaj/OxygenQuiz/src/pages/Quiz/components/multiplayer-lobby.tsx)
  - Supports two modes: `create` and `join`
  - Uses derived state for `isHost` and `isReady` (computed from participants list)
  - Real-time participant list with status indicators

- **Routing**:
  - `/multiplayer-menu` - Choose between create or join
  - `/quiz/:quizId/multiplayer` - Create lobby (host mode)
  - `/join-session` - Join existing lobby

---

## User Flows

### Creating a Lobby (Host)
1. User navigates: Home → Choose Mode → Multiplayer → Create Lobby
2. Selects a quiz from quiz selection page
3. Routed to `/quiz/:quizId/multiplayer`
4. Room code auto-generated (6-character alphanumeric)
5. User enters username and clicks "Create Lobby"
6. SignalR: `JoinSession` invoked
7. Backend assigns user as host (first participant)
8. Lobby displays with invite link to share
9. Host can toggle ready status
10. When ≥2 players and all ready, host can start game

### Joining a Lobby (Participant)
1. User navigates: Home → Choose Mode → Multiplayer → Join Lobby
2. Routed to `/join-session`
3. User enters username and room code
4. Clicks "Join Lobby"
5. SignalR: `JoinSession` invoked
6. Backend adds participant to session
7. All clients receive `UserJoined` event
8. New user receives `CurrentParticipants` list
9. Participant can toggle ready status
10. Waits for host to start game

### Auto-Resume After Disconnect
1. Session data stored in `sessionStorage`
2. On page reload, checks for stored session
3. If in join mode OR (create mode AND session matches), auto-rejoins
4. Otherwise, clears stale session data

---

## Key Features

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
connection.on("UserJoined", (username, isFirstUser) => { /* ... */ });
connection.on("UserLeft", (username) => { /* ... */ });
connection.on("PlayerReadyChanged", (username, ready) => { /* ... */ });
connection.on("HostChanged", (newHostUsername) => { /* ... */ });
connection.on("GameStarted", (quizId) => { /* ... */ });
connection.on("CurrentParticipants", (participants) => { /* ... */ });
```

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
- No maximum lobby size enforcement
- Hardcoded API URL (not environment-aware)
- No unit or integration tests
- No username uniqueness validation
- ~~No security/authentication~~ — **implemented 2026-06-20:** the lobby routes require login,
  identity is derived from the authenticated account (the host's name is their real username),
  and the hub is `[Authorize]`'d with the username taken from `Context.User` (no longer trusted
  from the client). See [`play-auth-and-identity.md`](./play-auth-and-identity.md).

### 📋 Next Steps (Phase 2+)
See [`implementation_plan.md`](file:///C:/Users/hp/.gemini/antigravity/brain/a79d957d-a384-46b9-adfc-42628fbd6534/implementation_plan.md) for detailed roadmap:
- **Phase 2**: Input validation, session cleanup, robustness
- **Phase 3**: Production readiness (env vars, logging, tests)
- **Phase 4**: Advanced features (chat, spectator mode, lobby settings)

---

## UI/UX Features

### Visual Indicators
- **Crown Icon** (👑): Identifies the host
- **Ready Status**: Green "READY" vs grey "NOT READY"
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
| Method | Parameters | Description |
|--------|------------|-------------|
| `JoinSession` | sessionId, username | Join or create a session |
| `LeaveSession` | sessionId, username | Leave a session |
| `ToggleReady` | sessionId, username, isReady | Update ready status |
| `StartQuiz` | sessionId, quizId | Start the game (host only) |
| `SubmitAnswer` | sessionId, username, answer | Submit quiz answer |

### Client Events (IQuizClient)
| Event | Parameters | Description |
|-------|------------|-------------|
| `UserJoined` | username, isFirstUser | User joined session |
| `UserLeft` | username | User left session |
| `CurrentParticipants` | participants[] | Full participant list |
| `PlayerReadyChanged` | username, isReady | Ready status changed |
| `HostChanged` | newHostUsername | New host assigned |
| `GameStarted` | quizId | Game starting |

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
