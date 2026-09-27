# 17. One namespace for names

Date: 2026-09-27
Status: Accepted

## Context

Every account has two names. `ImmutableName` is the lower-cased name chosen at signup and never
changed; it is the stable handle — the chat system's key, what `GET /Users/username/{name}`
resolves, what old mentions and links point at. `Username` is the display name. Until now the two
always agreed (`Username.ToLower() == ImmutableName`), because nothing could change either.

Letting people change their display name (`PUT /Users/me/username`) breaks that agreement, and the
uniqueness rule was written for the world where it held: signup checked only `ImmutableName`.

Two ways to extend it were on the table:

- **Two separate rules.** Immutable names unique among immutable names, display names unique among
  display names. Obvious, and each half is an index.
- **One namespace.** A name is taken if it matches — case-insensitively — *either* column of any
  other counted account.

The separate rules leave a hole that only shows up after a rename. Carol renames herself to "Dave";
"Carol" is now nobody's display name, so Bob may rename himself to "Carol". The app then shows Bob
as "Carol" while `carol` — the handle, the profile link, every old mention — still means Carol.
That is impersonation with extra steps, and it is exactly what a stable handle exists to prevent.

## Decision

**A name is available to an account only if no other counted account holds it, in either column,
ignoring case.** Signup, admin user creation, the availability check and rename all ask the same
question (`UserRepository.NameTakenAsync`; signup reaches it through `UsernameExistsAsync`).

- **"Counted"** is the same set of rows that owns an email address (`EmailExistsAsync`): live
  accounts, and accounts inside their closure grace period. An admin-deleted row does not hold its
  names, for the reason it does not hold its address — nothing ever anonymises it, and
  re-registering a name grants nothing of the old account. An anonymised row has had both names
  rewritten to `deleted_user_*`.
- **Your own names never count against you**, so re-casing ("alice" → "Alice") is allowed — and is
  not subject to the cooldown below, because it is the same name.
- **The immutable name stays reserved for good.** Renaming releases only your previous *display*
  name. The name you signed up with is yours for as long as the account exists.
- **A display name can change once per 30 days** (`AccountIdentityService.UsernameChangeCooldown`),
  so a name is something others can learn, and nobody can cycle through names to confuse a lobby.

The database backs the per-column half with partial unique indexes over the same rows: one on
`ImmutableName`, one on `lower("Username")` (raw SQL in the `AddIdentityChanges` migration — EF
can't model an expression index). The cross-column half — my display name against your immutable
one — cannot be an index and is enforced in code only; the indexes catch the races the code check
can lose within a column.

## Consequences

- Names are scarcer than two separate rules would make them: every account spends up to two names
  (its immutable one and its current display name). With 3–50 characters of free text that is not
  a practical constraint.
- A released display name can be taken by someone else. The one place that could matter is a
  multiplayer lobby that outlives a rename, where the old name is still in use as a pinned label;
  the lobby refuses a second account under a name it has already seen (`name-in-use`), rather
  than let two players share one scoreboard key.
- "Taken" can't be answered locally by the client for either column; the rename form shows the
  server's sentence.
- Anything new that resolves a user *by name* must look at both columns (as `GetByUsernameAsync`
  now does) — or, better, resolve by id. Names are labels; ids are identity. Multiplayer was
  changed to key players by id for exactly this reason
  (see [account-identity-changes.md](../auth/account-identity-changes.md)).
