# 21. A Duel is forfeited when the lobby drops the player

Date: 2026-09-25
Status: Accepted

## Context

D10 says a player who leaves mid-Duel forfeits: the game ends, the player still there wins, and the
match is recorded. "Leaves" had to be pinned to something the server can observe, and a lobby can
lose a player three ways that look alike from the server: they clicked Leave, they closed the tab,
or their connection dropped for a moment.

What the lobby already does (docs/quiz/multiplayer.md §3.5): a dropped connection is given a
**5-second grace**, and the participant is removed only if no newer connection took their place.
Before this change a reconnect never took their place — nothing rejoined — so every blip longer
than a heartbeat became a removal. In Classic that costs a player some rounds; in a turn-based Duel
tied to "leaving", it would have cost them the game.

The alternatives considered:

- **Forfeit on the raw disconnect.** Simplest, and wrong: a phone switching from Wi-Fi to mobile
  data would lose games.
- **Pause the Duel while a Seat is disconnected**, and forfeit only after a long absence (a minute).
  Fairest to the one who dropped, and it holds the other player hostage in front of a frozen board;
  it also needs a "paused" state the engine doesn't have and a timer that every other rule would
  have to respect.
- **Let the turn clock handle it.** A player who is gone simply lets their turns expire. No forfeit
  at all — and a Duel against someone who closed the tab then takes minutes of expiring turns and
  an endgame to end.

## Decision

**A Duel is forfeited when the lobby removes a seated player** — through `LeaveSession`, or when the
5-second disconnect grace runs out without a reconnect. Both removal paths call
`IAssociationMatchOrchestrator.PlayerLeftAsync`; nothing else forfeits.

That is made livable by **the client rejoining after an automatic reconnect** (multiplayer.md
§3.6): a blip that recovers inside the grace moves the player to their new connection, and the
removal check leaves them alone. **The turn clock keeps running** through a blip; a player who is
away for three seconds of their turn has three seconds less.

A forfeit is a result: it is **recorded even if the lobby then empties** before the loop gets to
write it. A Duel interrupted any other way — the lobby emptied while it was still being played — is
half a game and writes nothing, as for Classic (multiplayer.md §7.3).

## Consequences

- Leaving, closing the tab and an outage longer than ~5 seconds all end the Duel the same way, and
  the review says "Forfeit" for each. A player can't tell them apart afterwards, and neither can we.
- The grace is shared with Classic and with the lobby roster. Lengthening it for Duels would leave a
  player who really left sitting in everyone's roster, marked ready, for as long — the reason it
  wasn't lengthened for the host-refresh bug either (multiplayer.md §10, 2026-09-16).
- A forfeit is won by the player still there **whatever the score**. The winner is therefore stored
  (`Match.WinnerUserId`), not derived: replay knows the game ended by `Forfeit`, not who left.
- If a friendlier rule is wanted later (say, forfeit only after 30 seconds away), it is the grace
  for seated Duel players alone, decided in `QuizHub.OnDisconnectedAsync` — the engine and the
  runner don't change.
