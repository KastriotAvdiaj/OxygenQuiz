# 11. System accounts are protected rows

Date: 2026-09-12
Status: Accepted

## Context

`DbSeeder` creates two user rows the application depends on, and marks neither of them as
anything:

- **The root admin.** `EnsureAdminAsync` seeds one SuperAdmin account. SuperAdmin is the only
  role that can grant SuperAdmin (`RoleRules.SuperAdminOnlyRoles`), so it is the account from
  which every other privilege ultimately descends.
- **The guest placeholder.** `EnsureGuestAccountAsync` seeds a fixed, well-known row
  (`GuestAccount.Id`) that every guest-play session points at, because `QuizSession.UserId` is a
  required foreign key and a guest has no account of their own. See
  [`guest-play.md`](../auth/guest-play.md).

Both are ordinary rows in `Users`, both appear in the admin user list, and both are deletable by
anyone who can reach the delete endpoint — which is anyone with Admin or above:

```csharp
// UsersController.CanActOnUser
_currentUser.UserId == targetUserId || User.IsInRole("Admin") || User.IsInRole("SuperAdmin")
```

So an Admin could delete every SuperAdmin, including the seeded one, and nothing in the
application could restore them — `UserService` has no code path that sets `IsDeleted` back to
`false`, and the global `HasQueryFilter(u => !u.IsDeleted)` hides the row from every read. The
only recovery is a manual `UPDATE` against the database.

That matters because **role changes are already guarded and deletion is not.**
`SetUserRolesAsync` refuses to let an Admin touch the SuperAdmin role at all, and refuses to
remove the role from the last account holding it. The delete endpoint reaches the same outcome —
no SuperAdmin left — through a door with no lock on it.

The existing lockout guard is also not the rule we want. It counts:

```csharp
var superAdminCount = await _userRepository.Query()
    .CountAsync(u => u.UserRoles.Any(ur => ur.Role.Name == "SuperAdmin"), ct);
if (superAdminCount <= 1) throw new AppValidationException("You can't remove the last SuperAdmin...");
```

That protects **whoever happens to be last standing**, not the account the system was built
around. With three SuperAdmins, all three are demotable, and the seeded account has no special
status; demote the other two in any order and the survivor is frozen, whoever they are.

The guest row's exposure is subtler and, today, latent rather than live. Deleting it is a soft
delete, the row stays, the foreign key still resolves, and `CreateGuestSessionAsync` never loads
the user — so guest play keeps working. But the deletion sticks (`EnsureGuestAccountAsync` checks
existence with `IgnoreQueryFilters()`, sees the soft-deleted row, and does not recreate it), and
the moment deletion starts scrubbing fields — see
[`0012`](0012-account-deletion-is-anonymisation-after-a-grace-period.md) — deleting `guest`
corrupts a row the play engine depends on.

## Decision

**A user row may be marked protected, and a protected row is immutable to the application.**

`User` gains `bool IsProtected`. It is set by `DbSeeder` and by nothing else — there is no
endpoint, no admin action and no DTO that can turn it on or off. A protected account:

- cannot be deleted by anyone, including itself
- cannot have its roles changed by anyone
- cannot close its own account through the self-service flow in
  [`0012`](0012-account-deletion-is-anonymisation-after-a-grace-period.md)
- is listed in the admin user list with a **System** badge and its row actions disabled

`DbSeeder` marks both seeded rows: the root admin and the guest placeholder.

**The count-based lockout guard is removed.** Root is protected, so it can never stop being a
SuperAdmin, so the count can never reach zero and the guard can never fire for the reason it was
written. Worse, it would start firing for the wrong reason: with root plus one promoted
colleague, demoting the colleague drops the count to one and the guard would refuse a change
that is now entirely legitimate. One rule, held by the flag.

The delete matrix that follows:

| Caller | May delete |
|---|---|
| Admin | `User` accounts only — not other Admins, not SuperAdmins |
| SuperAdmin | any unprotected account |
| anyone | never a protected account |
| anyone | never their own account *from the dashboard* — that is account closure, a different flow |

Two alternatives were rejected:

- **Key the rule off `ImmutableName == "admin"`.** Free, and the constant already exists in
  `EnsureAdminAsync`. Rejected because it makes a string literal security-critical: a future
  rename, a differently-seeded environment, or a user who registers a clashing immutable name all
  turn an authorization rule into a coincidence. A column says what it means at every call site.
- **Put the protected user's id in configuration.** Rejected for the same class of reason — an
  authorization invariant should not live in a file that operations can edit, and a typo in it
  fails open.

## Consequences

- **The migration must backfill, or it protects nothing.** `EnsureAdminAsync` returns early when
  the account already exists, so on any environment that has run before, a new column defaulting
  to `false` would stay `false` forever. The migration carries an explicit
  `UPDATE "Users" SET "IsProtected" = TRUE WHERE "ImmutableName" IN ('admin', 'guest')`, and the
  seeder sets the flag on the existing rows too, so a fresh database, a restored backup and the
  live server all converge on the same state.
- **Retiring a root account is a deliberate act.** There is no in-app way to move the flag. The
  procedure is: promote the successor to SuperAdmin, move `IsProtected` in the database, then
  delete the old account. That friction is the point — an account the application cannot destroy
  is only a guarantee if the application also cannot un-protect it.
- **`guest` stays visible in the admin list.** Hiding it would mean the next person wondering
  what that row is has no way to find out from the app. A badge plus disabled actions teaches the
  rule; concealment just moves the surprise.
- **Protection is not authorization.** `IsProtected` says "this row must survive", not "this row
  may do anything". Root's powers come from its SuperAdmin role exactly as before; guest has no
  roles and gains none. A protected account with no privileges is a perfectly sensible thing.
- **This does not give you a second root.** Nothing stops a future seeder from protecting more
  rows, but two protected SuperAdmins means two accounts nobody can remove, which is a worse
  problem than the one being solved. If shared root ownership is ever wanted, the answer is a
  break-glass procedure, not a second flag.
