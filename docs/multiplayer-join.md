# Multiplayer lobby join flow

How a player ends up in a lobby, and why "type a code" and "open the invite link" now behave the
same.

## Room codes

The host's room code is generated upper-case (`Math.random().toString(36).substring(2, 8)
.toUpperCase()`) and is the key the server stores the lobby under
(`InMemoryQuizSessionManager._sessions`). SignalR group names and that dictionary key are
**case-sensitive**, so any code the client sends must be upper-cased to match.

## The two URL shapes (both supported)

A lobby can be reached two ways, and `useLobbyConnection` reads the code from whichever is present
(route param wins, then the query), upper-casing it:

| Entry point | URL | Code source |
|---|---|---|
| Join dialog / create flow | `/multiplayer/lobby/:sessionId` | route param |
| Shared invite link | `/multiplayer/join?code=XYZ123` | `?code=` query |

## Who performs the join

The **lobby page owns the single join**. `useLobbyConnection` auto-joins once, after the SignalR
connection is live and the account is known, whenever it has a code from the URL (see the
`urlJoinAttempted` effect). The typed input (`JoinForm`) and the dialog input both upper-case the
code.

## The bug this replaced

Previously the **Join dialog** called `joinSession(code)` itself — before navigating and potentially
before the shared connection was connected — then navigated to `/multiplayer/lobby/:sessionId`. But
the lobby hook only read the `?code=` query, so on that route the code was empty and the page fell
back to a fragile `sessionStorage` resume. Net effect: a typed code often failed to join, while the
invite link (which uses `?code=`) worked. Consolidating the join into the lobby page — reading the
route param and auto-joining once connected — makes both paths identical.

> Related: `src/pages/Quiz/Multiplayer/improvements.md` previously noted the duplicated join logic
> between the dialog and the lobby's `JoinForm`; that duplication is now removed.
