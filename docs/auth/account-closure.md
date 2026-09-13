# Account closure

> **What it does:** Lets a person close their own account. The account disappears immediately and
> becomes recoverable for 30 days; after that its personal data is scrubbed and the row is kept, so
> every foreign key still resolves and nobody else's history changes.
>
> **Status: built, reachable and finished** — nothing in this flow is outstanding. The decision and
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
2. **Grace, 30 days** — the account is gone from every read. Signing in cancels the closure and
   restores the account outright — **by any method the person has**, password or Google/Microsoft;
   so does `DELETE /api/Users/me/closure` for someone still holding a session.
3. **Warning, day 27** — the `account-closure-reminder-sweep` Hangfire job, hourly, mails everyone
   three days out (§6). Once each.
4. **Anonymisation** — the `account-anonymisation-sweep` Hangfire job, hourly.

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

## 3. Signing in is the recovery path — on every sign-in path

Recovery is a property of **signing in**, not of `LoginAsync`. Each path loads its user past the
global `!IsDeleted` filter and then hands the row to one shared decision,
`AuthenticationService.AdmitOrRejectDeletedAsync`:

| Path | Widened lookup |
|---|---|
| Password | `GetByEmailIncludingDeletedAsync`, after BCrypt verifies |
| External, identity already linked | `GetByIdIncludingDeletedAsync` on the link's `UserId` |
| External, first contact, verified email matches an account | `GetByEmailIncludingDeletedAsync` |

The order matters and is asserted:

1. Identity is proven **first**, always — the password verified, or the provider's ID token
   validated. A wrong password on a closing account changes nothing; otherwise anyone could keep a
   stranger's account alive by guessing at it.
2. Then the row's state is read. Anonymised, or soft-deleted with no closure request → the same flat
   `Invalid credentials` as a wrong password. Widening a lookup must not make account state
   probeable, and it must not re-open accounts an admin removed.
3. Only then does a pending closure get cancelled.

**And the response says so.** `AuthResponseDTO.ClosureCancelled` is true on the one sign-in that
undid a closure, false on every ordinary one, and the client turns it into a "welcome back, your
account is no longer scheduled for deletion" notice (`announceClosureCancelled` in `lib/Auth.tsx`,
called from every path that adopts a session). Without it the restore is invisible: the only way to
find out it worked would be to close the account again and watch what happens. The flag is safe to
send — it reaches only someone who has just proven they own the account, and tells them nothing they
did not do themselves.

**A path that skips step 1's widened lookup breaks recovery silently.** External sign-in shipped
resolving its user through the filtered `GetByIdAsync`, so a closing account came back as null and a
returning Google user was told `Invalid credentials` — with no route back in at all for an account
that never had a password. `AccountClosureExternalLoginTests` covers each external branch;
`AccountClosureLoginTests` covers the password one. A new sign-in method needs its own.

---

## 4. Configuration

```jsonc
"AccountClosure": {
  "GracePeriodDays": 30,     // how long recovery stays possible
  "SweepBatchSize": 200,     // most one sweep will scrub or mail; a backlog drains over later runs
  "ReminderDaysBefore": 3    // warning email this many days before the scrub; 0 turns it off
}
```

All three have working defaults; the section is optional. `ReminderDaysBefore` at or above
`GracePeriodDays` sends nothing rather than sending late — see §6.

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

## 6. The reminder is the last warning

`ClosureReminderSweeper` → `IAccountClosureService.SendClosureRemindersAsync`, registered as
`account-closure-reminder-sweep`, also `Cron.Hourly()`. Three days before the scrub (
`ReminderDaysBefore`), everyone still closing gets one email: *"Your Oxygen Quiz account is about to
be deleted"*, with a button to the login page — **logging in is the recovery, so the link carries no
token and nothing in the mail is worth stealing.** It is the only mail in this flow nobody asked
for, and the last moment recovery is possible.

Four decisions hold it together:

- **`ClosureReminderSentAt` is a column, not a computed window.** The sweep runs hourly and the
  window is three days wide; without a stamp, the same person gets about seventy copies. Cleared by
  `CancelClosureAsync`, so someone who comes back, leaves again and stays away is warned the second
  time too.
- **Send, then stamp, one row at a time.** A crash between the two costs a duplicate email; the other
  order costs someone their only warning. One `SaveChanges` per person, so a batch that fails on its
  last address doesn't un-stamp the fifty already sent.
- **A failed send is left unstamped** and retried next hour. A permanently bad address retries until
  the scrub removes the row — noisy in the log, which is where "we cannot reach this person" belongs.
- **It is a separate job from the scrub.** They read the same rows, but this one depends on an email
  provider that can be down or throttled, and a mail outage must not take the scrub — the promise —
  down with it.

Out-of-range `ReminderDaysBefore` (0, negative, or ≥ `GracePeriodDays`) sends nothing: a warning
after the data is gone is not a warning. `Users/ClosureReminderTests.cs` pins all of the above.

---

## 7. The UI

`CloseAccountSection`, at the bottom of the account overlay's **My Account** panel
(`AccountOverlay/panels/`). It is the only way a person can leave, and therefore an Admin's only
exit, since the Users dashboard refuses self-deletion on purpose.

Three frictions, each earning its place:

- **You type your username to confirm.** A destructive action reached in two clicks gets reached by
  accident.
- **"Recoverable for 30 days" is stated before you commit**, not in the toast afterwards. It is the
  single fact that makes the decision reversible, so it belongs where the decision is made.
- **Success signs you out immediately.** The account is soft-deleted the moment the request
  succeeds, so every authenticated read starts 404-ing; staying put would show a broken app instead
  of a clean goodbye. It also means the client never needs to render a "closing" state — there is no
  session in which to see one.

The section renders nothing at all for a protected account: the API would refuse, so offering the
button would only produce a 403.

`ConfirmationDialog` grew an optional `children` slot for this — it previously took only a string
`body`, which cannot hold a confirmation input.

## 8. The address is held for the grace period

`EmailExistsAsync` counts a row as owning its address when the account is live **or** closing
(`DeletionRequestedAt` set, `AnonymisedAt` null). It is the whole of signup's answer, on both the
password and external paths.

Why it has to: sign-in finds a closing account **by email**. Let someone re-register that address
and the person who closed the account loses the recovery the grace period exists to give them — the
lookup now finds a stranger's row. The window used to be open: the check ran through the global
`!IsDeleted` filter, so an address read as free the instant its owner closed the account.

Three consequences worth keeping straight:

- **The hold releases itself.** Anonymisation rewrites the address to
  `deleted-{guid}@deleted.invalid`, so a scrubbed account frees its email with no release step and
  no admin action.
- **An admin-deleted row does NOT hold its address**, deliberately. Nothing ever anonymises those,
  so counting them would burn the address permanently — and re-registering it grants nothing, since
  the new account is a new row with none of the old one's history or roles.
- **Signup says one thing for both cases**: *"Email is already in use. If this is your account, log
  in to recover it."* ("log in", not "sign in" — next to a **Sign up** button the two read as the
  same word.) Naming the closing case would turn signup into an "is X leaving?" oracle for
  any address. The hint is safe because it is shown for a live account too, and it points a
  returning person at the one action that actually works. There is no email-availability endpoint,
  so submit is the only place to ask.

`Users/EmailReservationTests.cs` pins all four states. The reasoning, and the two alternatives it
rejected, are in
[`../adr/0013-a-closing-account-keeps-its-email-a-deleted-one-does-not.md`](../adr/0013-a-closing-account-keeps-its-email-a-deleted-one-does-not.md).

---

## 9. Related

- [`../adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md`](../adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md) — the decision
- [`../adr/0013-a-closing-account-keeps-its-email-a-deleted-one-does-not.md`](../adr/0013-a-closing-account-keeps-its-email-a-deleted-one-does-not.md) — who owns an address, and for how long
- [`../adr/0011-system-accounts-are-protected-rows.md`](../adr/0011-system-accounts-are-protected-rows.md) — why root and guest can never enter this flow
- [`user-role-management.md`](user-role-management.md) §1.1 — administrative deletion, the other operation
- [`../development/testing.md`](../development/testing.md) §4E — why the login test doesn't mock
