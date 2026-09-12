# Account closure

> **What it does:** Lets a person close their own account. The account disappears immediately and
> becomes recoverable for 30 days; after that its personal data is scrubbed and the row is kept, so
> every foreign key still resolves and nobody else's history changes.
>
> **Status: backend built, not yet reachable from the UI.** §6 lists what remains. The decision and
> the alternatives it rejected are in
> [`../adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md`](../adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md).

---

## 1. Three states, two columns

`IsDeleted` keeps its original meaning — the flag the global query filter reads — and two nullable
timestamps carry the rest:

| State | `IsDeleted` | `DeletionRequestedAt` | `AnonymisedAt` |
|---|---|---|---|
| Active | false | null | null |
| **Closing** (grace period) | true | set | null |
| **Anonymised** | true | set | set |
| **Admin-deleted** | true | **null** | null |

The last row is the one that earns its place. An admin removing an account and a person leaving
both soft-delete, and they must not behave the same: **an admin deletion is a lockout with no way
back in, a closure is recoverable by simply signing in.** `DeletionRequestedAt` is what tells them
apart, and `AccountClosureLoginTests.AdminDeletedAccount_StillCannotLogIn` is what keeps it true.

Why not a status enum: `IsDeleted` is load-bearing in the global query filter *and* in the admin
users-table filter, so changing its type means touching every one of those in the same change that
introduces a new flow. Two risky changes wearing one commit.

---

## 2. The flow

1. **Request** — `POST /api/Users/me/closure`. Sets `DeletionRequestedAt` and `IsDeleted`, bumps
   `ConcurrencyStamp`, deletes every refresh token so the session can't be silently extended past
   the request. Returns the date the scrub happens. **Idempotent**: a second request returns the
   date already set rather than restarting the clock, so a double-tap can't quietly buy another
   thirty days.
2. **Grace, 30 days** — the account is gone from every read. Signing in with the right password
   cancels the closure and restores the account outright; so does
   `DELETE /api/Users/me/closure` for someone still holding a session.
3. **Anonymisation** — the `account-anonymisation-sweep` Hangfire job, hourly.

### What the scrub does

| Goes | Stays |
|---|---|
| Email → `deleted-{guid}@deleted.invalid` | The row and its id — every FK still resolves |
| Username → `deleted_user_8f3a` | Play history: sessions and answers, now anonymous |
| Password hash → null | Authored quizzes and questions, attributed to the scrubbed row |
| Avatar URL, `EmailConfirmed` | Audit entries, **including the user id** |
| Refresh tokens, external logins, password-reset and email-verification tokens, user settings | |

All of it lands in **one `SaveChanges`**, so an account is never left half-anonymised — identity
gone but a live refresh token still outstanding.

Audit keeps the id on purpose: it is the record *of* the deletion, and an unattributable one would
make the single action most worth being able to prove the one action least provable. It records the
email's **domain** only — the local part, the identifying half, is not kept.

---

## 3. Login is the recovery path

`LoginAsync` uses `GetByEmailIncludingDeletedAsync`, which looks past the global `!IsDeleted`
filter. That is deliberate and it is the only caller.

The order matters and is asserted:

1. Password is verified **first**, always. A wrong password on a closing account changes nothing —
   otherwise anyone could keep a stranger's account alive by guessing at it.
2. Then the row's state is read. Anonymised, or soft-deleted with no closure request → the same flat
   `Invalid credentials` as a wrong password. Widening the lookup must not make account state
   probeable, and it must not re-open accounts an admin removed.
3. Only then does a pending closure get cancelled.

---

## 4. Configuration

```jsonc
"AccountClosure": {
  "GracePeriodDays": 30,   // how long recovery stays possible
  "SweepBatchSize": 200    // most one sweep will scrub; a backlog drains over later runs
}
```

Both have working defaults; the section is optional.

---

## 5. The sweep is the promise

`AccountAnonymisationSweeper` → `IAccountClosureService.AnonymisePendingAsync`, registered as
`account-anonymisation-sweep` in `Program.cs`, `Cron.Hourly()`. Hourly rather than the five minutes
the other sweeps use, because the deadline is thirty days away and the work per run is heavier.

**A closure that never gets swept is an account that told its owner their data was going and then
kept it** — worse than not offering closure at all. So if closure ever looks wrong, check the job
ran before anything else: this project has already shipped a background job that was never
registered and therefore never ran once (see `AbandonedSessionSweeper`'s own notes). The sweep
selects only rows with `AnonymisedAt == null`, so it is safe to run twice and safe to retry.

---

## 6. Not built yet

- **The settings UI.** Nothing calls either endpoint, so closure is currently unreachable by a
  person. This is also why the administrative delete endpoint refusing self-deletion
  ([`user-role-management.md`](user-role-management.md) §1.1) leaves an Admin with no exit today.
- **The email stays reserved during grace — as a decision, not as code.** `EmailExistsAsync` goes
  through the soft-delete filter, so a closing account's address is re-registerable right now. The
  same hole predates this work: an admin-deleted account's address was always immediately reusable.
  Signup needs a third answer — free, taken, and *reserved by a pending closure* — that doesn't leak
  whether a particular address once had an account.
- **The reminder email** a few days before the window closes. Thirty days is long enough to forget,
  and that mail is the last moment recovery is possible.
- **Login doesn't say it cancelled anything.** The closure is silently undone. It fails in the safe
  direction, but the person should be told; that needs a field on `AuthResponseDTO`.

---

## 7. Related

- [`../adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md`](../adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md) — the decision
- [`../adr/0011-system-accounts-are-protected-rows.md`](../adr/0011-system-accounts-are-protected-rows.md) — why root and guest can never enter this flow
- [`user-role-management.md`](user-role-management.md) §1.1 — administrative deletion, the other operation
- [`../development/testing.md`](../development/testing.md) §4E — why the login test doesn't mock
