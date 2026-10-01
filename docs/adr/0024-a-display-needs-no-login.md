# 24. A Display needs no login — a Screen code is enough

Date: 2026-10-01
Status: Accepted

## Context

In Host mode the Teacher plays on a Controller (their signed-in phone or laptop) and may put the
game on a projector as a **Display** ([`classroom-plan.md`](../quiz/classroom-plan.md)). The
projector is very often a school PC: signing the Teacher in there means typing a password in front
of a class, on a machine they don't own, and remembering to sign out.

Every other read of a game in this app requires the signed-in owner.

## Decision

**A Display is authorised by a Screen code alone.** The Controller asks for one; the Display opens
`/screen` and types it. The code is short, random and unguessable in practice (rate-limited
attempts), and valid only while its game is unfinished. The Controller can disconnect every
Display at once, which also replaces the code. At most three Displays connect at a time.

**What a Display receives is the room's view and nothing more** — the same secrecy as a player's
view (`AssociationViews`, pinned by `AssociationViewSecrecyTests`): closed Tiles have no text,
unsolved solutions are absent, acceptable spellings are never sent. A Display can't make a move.

## Consequences

- Leaking a Screen code leaks exactly what the projector already shows the room. That is the whole
  risk accepted, and the reason the view must stay as secret as a player's — a new field on the
  Display view is covered by a secrecy test the same way.
- The Answer key exists only on the Controller, which is signed in. It is never on a Display's
  connection, so a Display can't be made to show it.
- Rate limiting and code expiry are what keep a code from being guessed; both are tested.
- If schools later want Displays that need a login (e.g. a school account), that is a stricter
  option layered on, not a change to this one.
