# Multiplayer Lobby — Identified Improvements

Potential issues and improvements identified during the refactoring of the multiplayer lobby.

---

## 1. Duplicate Join Logic — ✅ resolved
The Join dialog used to perform its own `joinSession` before navigating, while the lobby page had a
second, independent join path. The dialog now only navigates (`/multiplayer/lobby/:sessionId`) and
the lobby page owns the single, connection-safe join (`useLobbyConnection` auto-joins from the URL
code). This fixed "a typed code won't join but the invite link does." See
[`docs/quiz/multiplayer-join.md`](../../../../docs/quiz/multiplayer-join.md).

---

## 2. Username Not Tied to Authentication
The username is stored in `sessionStorage` and is entered manually every time. If the user is already authenticated (via `useUser()`), the username could be pre-filled or auto-populated from their profile.

**Suggestion:** Check if the user is logged in and use their authenticated username by default, with an option to override.

---

## 3. Room Code Generation is Client-Side
`generateRoomCode()` uses `Math.random()`, which risks collisions across users. There's no server-side validation that the code is unique before the `CreateSession` call.

**Suggestion:** Generate room codes on the server and return them via the SignalR hub or a REST endpoint.

---

## 4. `create-lobby.tsx` (Full-Page Form) May Be Redundant
The dialog version (`create-lobby-dialog.tsx`) has replaced the full-page create form in the user flow. However, the route `/multiplayer/create` still exists in `Router.tsx` pointing to the full-page version.

**Suggestion:** Remove the `/multiplayer/create` route if the dialog is the intended experience, or remove the dialog if both are needed.

---

## 5. `Multiplayer-Host-Wrapper.tsx` May Be Dead Code
This component uses `useLoaderData()` to receive quiz data and passes it to the lobby, but no route in `Router.tsx` uses a loader to serve it. The actual lobby route at `/multiplayer/lobby/:sessionId` renders `MultiplayerLobbyPage` directly without a loader.

**Suggestion:** Either wire up a route with a quiz loader pointing to this wrapper, or remove it if it's no longer needed.

---

## 6. Missing Error Boundaries
None of the multiplayer routes have error boundaries (unlike quiz session routes which use `DashboardErrorElement`). A SignalR connection failure or unexpected error will crash the entire app.

**Suggestion:** Add error boundary elements to the multiplayer routes in `Router.tsx`.
