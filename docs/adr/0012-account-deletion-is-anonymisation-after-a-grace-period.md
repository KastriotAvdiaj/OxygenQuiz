# 12. Account deletion is anonymisation after a grace period

Date: 2026-09-12
Status: Accepted

## Context

`DeleteUserAsync` sets `IsDeleted = true` and writes an audit row. That is the whole
implementation. Three things follow from it, and none of them are what "delete" promises:

- **Nothing is erased.** The username, the email and the password hash all stay in the table
  exactly as they were. The row is hidden, not cleaned. For a person who asked to be deleted,
  hiding their email from an admin screen is not deletion.
- **Nothing can be undone.** No code path anywhere sets `IsDeleted` back to `false`, and the
  global `HasQueryFilter(u => !u.IsDeleted)` means the row is invisible to every query that could
  find it. An accidental deletion is repaired with SQL or not at all.
- **There is no self-service route.** Only an Admin can delete an account. A person who wants to
  leave has to ask someone.

Hard deletion is not the obvious fix it looks like. Every foreign key into `Users` is
`DeleteBehavior.Restrict` — `Quiz.UserId`, `QuizSession.UserId`, `QuestionBase.UserId`,
`QuestionCategory/Difficulty/Language.UserId` — so `DELETE FROM "Users"` fails at the database for
anyone who has ever authored or played anything. Making it succeed means deciding the fate of
every dependent row, and some of those rows are **other people's data**: deleting a player's
sessions silently rewrites a quiz author's analytics, months after the fact, for reasons the
author can never discover.

The legal framing points the same way. The right to erasure is about personal data, not about
destroying every row that references a person. Once an identity is scrubbed, a session row is no
longer personal data — it is an anonymous play. This is also what comparable products do:
GitHub reattributes to `ghost`, Reddit renders `[deleted]`, Discord shows `Deleted User 1a2b3c`.
None of them delete the rows.

*(This ADR records an engineering decision, not legal advice. If OxygenQuiz ever serves real EU
users, the retention policy wants review by someone qualified.)*

## Decision

**Deleting an account scrubs its personal data and keeps its row. The scrub happens 30 days
after the request, and logging in during those 30 days cancels it.**

The lifecycle:

1. **Request.** The person asks to close their account, from their own settings — not from the
   admin dashboard, which is an administrative tool and stays one. `DeletionRequestedAt` is set.
   The account is signed out and cannot be signed into except to cancel.
2. **Grace, 30 days.** The account is treated as deleted everywhere it is read. Logging in
   cancels the request and restores it completely. A reminder email goes out a few days before
   the window closes, because 30 days is long enough to forget and that mail is the last moment
   recovery is possible. **The email address stays reserved for the whole window** — it cannot be
   used to register a new account until the old one is actually anonymised.
3. **Anonymisation.** A hosted background service, a sibling of `AbandonedSessionSweeper`, scrubs
   the row: email becomes `deleted-{guid}@deleted.invalid`, username becomes
   `deleted_user_{short}`, the password hash is nulled, the avatar file is removed. Auth material
   is hard-deleted outright — refresh tokens, external logins, password-reset and
   email-verification tokens, user settings. The row and its id survive, so every foreign key
   still resolves, and the original email is now free for re-registration as a genuinely new
   account with no history.
4. **What is kept.** Play history, because it is no longer personal once the identity is gone and
   because a quiz author's analytics should not change when a stranger closes their account.
   Audit logs, including the original user id — they are the record *of* the deletion, and losing
   them would make the one action most worth being able to prove the one action least provable.
   Authored quizzes and questions, still attributed to the scrubbed row, so they read as authored
   by `deleted_user_8f3a` and stay playable.

Rejected alternatives:

- **True hard delete.** Requires re-deciding every `Restrict` foreign key above, and the honest
  version of it destroys other users' history. The version that does not destroy other users'
  history *is* anonymisation, arrived at the long way round.
- **Lazy anonymisation on next access.** An account nobody ever touches would never be
  anonymised, which defeats the purpose precisely for the people most likely to have walked away.
- **No grace period.** Immediate and irreversible is a worse trade than it sounds: the recovery
  cost of a mistaken deletion is total, and the cost of a 30-day delay is one nullable timestamp.
- **Transferring authored content to a system account.** More machinery than attribution to the
  scrubbed row, and it buys nothing a reader can see — either way the byline is not a person.

## Consequences

- **`IsDeleted` acquires a second meaning and should lose one.** Today it means "hidden". After
  this it means "closure requested, grace period running" until the sweeper turns it into "row
  scrubbed". Those are different states and want different columns — `DeletionRequestedAt` and
  `AnonymisedAt` — with `IsDeleted` derived rather than stored, or kept only as the query-filter
  flag it already is.
- **The admin delete action and account closure are different operations.** An admin removing a
  spam account and a person leaving are not the same event, should not produce the same audit
  entry, and do not need the same grace period. They share the scrubbing machinery, not the
  endpoint.
- **Account closure and the delete-matrix change ship together.** Once an Admin can no longer
  delete their own account from the dashboard
  ([`0011`](0011-system-accounts-are-protected-rows.md)), closure from settings is their only
  exit. Shipping the restriction without the exit leaves a dead end.
- **Protected accounts never enter this flow at all.** Root cannot close its own account and
  guest has no one to close it — see `0011`. The sweeper must skip them, and the settings page
  must not offer the action.
- **The email-uniqueness check now has three answers, not two.** Free, taken, and *reserved by a
  pending deletion*. The signup path needs to tell the third apart without leaking that a
  particular address once had an account — same reasoning as the login error, which deliberately
  refuses to distinguish "no such account" from "wrong password".
- **A quiz can outlive its author.** An anonymised author's public quizzes stay playable and stay
  in search results. That is deliberate, and it is the one part of this decision a person might
  reasonably object to — if it ever becomes a complaint, unpublishing on anonymisation is the
  smallest change that answers it, and this is the decision to revisit.
