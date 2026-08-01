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

`/multiplayer/join` with **no** `?code=` is also valid — that's the manual code-entry screen
(`JoinForm`, rendered by `LobbyPageView` whenever `hasJoined` is false).

## Who performs the join

The **lobby page owns the single join**. `useLobbyConnection` auto-joins once, after the SignalR
connection is live and the account is known, whenever it has a code from the URL (see the
`urlJoinAttempted` effect). The typed input (`JoinForm`) and the dialog input both upper-case the
code.

## When the join fails

Two things can go wrong — the code names no lobby, or the lobby is full — and they are handled at
different points depending on where the code came from.

**A typed code is checked before navigating.** `JoinLobbyDialog` calls `CheckSession` and only
closes + navigates if `canJoin` is true; otherwise it shows the server's own sentence inline and
the user corrects it right there. The check is **advisory** — a lobby can fill between the check
and the join — so `JoinSession` re-runs the same conditions and remains the real gate.

**An invite link can't be checked first** — there's no dialog, the lobby route is the landing page.
The auto-join runs, and on failure `LobbyPageView` still falls through to `JoinForm`, which now
leads with "Couldn't join that lobby", the reason, and a link back to `/multiplayer-menu` rather
than rendering as a bare code form.

**The reason survives the trip.** `AddParticipantAsync` throws `SessionJoinException` (reason +
message); `QuizHub.JoinSession` converts it to `HubException`, the only exception type SignalR
relays verbatim when `EnableDetailedErrors` is off; `multiplayer-context.tsx` unwraps SignalR's
`"An unexpected error occurred invoking … HubException:"` prefix and passes the sentence through.
Breaking any link in that chain silently degrades every join failure to one generic message —
which is exactly what used to happen, with "lobby full" surfacing as "the room may not exist".

> `QuizHub.JoinSession` adds the connection to the SignalR group **after** `AddParticipantAsync`
> succeeds. The original order added first, so a rejected joiner stayed subscribed to that group's
> broadcasts. Keep the order.

## The bug this replaced

Previously the **Join dialog** called `joinSession(code)` itself — before navigating and potentially
before the shared connection was connected — then navigated to `/multiplayer/lobby/:sessionId`. But
the lobby hook only read the `?code=` query, so on that route the code was empty and the page fell
back to a fragile `sessionStorage` resume. Net effect: a typed code often failed to join, while the
invite link (which uses `?code=`) worked. Consolidating the join into the lobby page — reading the
route param and auto-joining once connected — makes both paths identical.

## Related

- [`multiplayer.md`](./multiplayer.md) — the feature reference this flow is one part of:
  architecture, session lifecycle, and the full hub/event API. In particular, `JoinSession`'s
  catch-up sends (roster, capacity, quiz pick, chat history) and the **late-joiner rule** are
  documented there.

> The since-deleted `src/pages/Quiz/Multiplayer/improvements.md` previously noted the duplicated
> join logic between the dialog and the lobby's `JoinForm`; that duplication is now removed.
