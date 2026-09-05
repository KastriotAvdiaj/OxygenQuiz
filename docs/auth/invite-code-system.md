# Invite-Code Signup Gate

> **What it does:** Restricts account creation to people holding a valid single-use invite code.
> A pool of hashed codes lives in the database; redeeming one consumes it; once the pool is spent,
> signup is closed. The whole feature is behind a config flag, so it can be turned off for a public
> launch with **no code change and no migration**.

This document describes the system **as implemented**. For the original design rationale and the
trade-offs that were weighed, see [invite-code-system-plan.md](invite-code-system-plan.md).

---

## 1. How it works at a glance

1. An admin mints a batch of codes (`POST /api/admin/invite-codes`). The plaintext codes are
   returned **once** in that response; the database only ever stores their SHA-256 hashes.
2. The admin hands codes out to testers.
3. A tester enters their code on the signup form. The form checks it up front against a public,
   rate-limited endpoint (advisory only) so a bad code is rejected on the first step. On final
   submit the backend re-validates it and **atomically consumes** it in the same transaction that
   creates the user — that submit-time check is the source of truth.
4. A code is spent only on a **successful** signup. A duplicate-email/username failure, or losing a
   concurrent race for the same code, never burns it.
5. When all codes are consumed (or revoked), no one else can sign up.
6. Flip `Signup:RequireInviteCode` to `false` to reopen public signup instantly.

A code can also **carry a role** — redeem an Admin code and the new account is an Admin. That turns
a code into a second way to hand out a privileged role, so minting one is gated by the same
escalation rule as changing a user's roles, and such codes carry extra rails. See §7.

The feature mirrors the existing `EmailVerificationToken` pattern (hashed, single-use, consumable
bearer secret with a thin repository), so it should read as familiar to anyone who has worked on the
auth code.

---

## 2. The feature flag

`Signup:RequireInviteCode` (bool) controls everything. It lives in `appsettings.json` (non-secret)
and defaults to **`false`** so local dev and an open launch need no code at all.

| Environment | Value | Effect |
|---|---|---|
| Local dev / open launch | `false` (default) | Signup ignores invite codes entirely. |
| Gated test deployment | `true` | Signup requires a valid, unused code. |

Override per-environment with the standard double-underscore env var:

```bash
Signup__RequireInviteCode=true
```

The frontend reads the flag through a small public endpoint (below) so the invite field is shown and
required only when the gate is on — there is nothing to hide manually at launch.

---

## 3. Data model

**`Models/InviteCode.cs`** — table `InviteCodes` (migration `AddInviteCodes`):

| Field | Type | Notes |
|---|---|---|
| `Id` | `int` (identity) | PK |
| `CodeHash` | `string(128)` | SHA-256 (hex) of the normalized code. **Unique index.** |
| `Label` | `string(256)?` | Optional admin note (`"for Alban"`, `"batch 1"`) |
| `CreatedAt` | `DateTime` | UTC |
| `ExpiresAt` | `DateTime?` | Null = never expires |
| `ConsumedAt` | `DateTime?` | Null = still unused (the single-use marker) |
| `ConsumedByUserId` | `Guid?` | FK → `User`, set on redemption (audit: who used it) |
| `RevokedAt` | `DateTime?` | Admin-revoked without being used |
| `GrantedRoleId` | `int?` | Role granted on redemption, **on top of** `User`. Null = plain invite. FK → `Role`, `OnDelete(Restrict)` |
| `IntendedEmail` | `string(256)?` | Lowercased address the code is bound to. Null = anyone may redeem. Indexed |

```
IsRedeemable  ⟺  ConsumedAt IS NULL
               AND RevokedAt IS NULL
               AND (ExpiresAt IS NULL OR ExpiresAt > now)
```

EF config (`ApplicationDbContext.OnModelCreating`):
- `CodeHash` has a **unique** index.
- `ConsumedByUserId` is an optional FK with `OnDelete(SetNull)` — deleting a user keeps the code row
  (and the audit trail) intact rather than cascading it away.
- `GrantedRoleId` is an optional FK with `OnDelete(Restrict)` — **not** `SetNull`. Silently
  downgrading a pending Admin invite to a plain one because someone deleted the role would be a
  surprise in the wrong direction; revoke the outstanding codes first.
- `IntendedEmail` is indexed: redemption filters on it alongside the hash, and admins look up
  "who did I invite".

> **Why store a hash, not the plaintext?** Invite codes are bearer secrets, exactly like the
> refresh and email-verification tokens this app already stores hashed. A leaked database then
> exposes no usable codes. The cost: an admin can't re-read a code later — it's shown once at
> generation. If a code is lost before hand-out, revoke it and mint a new one.

---

## 4. Code generation & hashing

**`Services/Invitations/InviteCodeGenerator.cs`** (interface `IInviteCodeGenerator`, registered as a
singleton — it's stateless) owns three responsibilities so generation and redemption can never
drift:

- **`Generate()`** — a cryptographically-random (`RandomNumberGenerator`, not `System.Random`)
  10-character code over an unambiguous alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789` — no `0/O`,
  `1/I/L`), grouped for readability: e.g. `K7QM-3FXP-9T`.
- **`Normalize(raw)`** — trims, uppercases, and strips dashes/spaces, so a user can't trip on
  formatting when typing a code back in.
- **`Hash(raw)`** — normalizes, then SHA-256 → hex (same scheme as `TokenService.HashToken`). This
  is the value stored in `CodeHash` and looked up at redemption.

Because **both** the admin controller (storing codes) and `AuthenticationService` (redeeming them)
hash through this one helper, a code generated one way and checked another can never silently fail
to match.

---

## 5. Repository

**`IInviteCodeRepository` / `InviteCodeRepository`** — a thin class over `ApplicationDbContext`,
registered `Scoped` in `Program.cs` next to the other repositories.

The interesting method is the atomic consume:

```csharp
public Task<int> TryConsumeAsync(
    string codeHash, Guid userId, string normalizedEmail, CancellationToken ct = default) =>
    _context.InviteCodes
        .Where(c => c.CodeHash == codeHash
                 && c.ConsumedAt == null
                 && c.RevokedAt == null
                 && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow)
                 && (c.IntendedEmail == null || c.IntendedEmail == normalizedEmail))
        .ExecuteUpdateAsync(s => s
            .SetProperty(c => c.ConsumedAt, DateTime.UtcNow)
            .SetProperty(c => c.ConsumedByUserId, userId), ct);
```

This is a **single conditional `UPDATE`** guarded by `ConsumedAt IS NULL`. It returns the number of
rows affected: **1 = success**, **0 = already used / revoked / expired / wrong email / lost a
concurrent race**. This is what truly guarantees the cap — two people submitting the same code at
the same instant can never both get a `1`.

The email binding lives in this same `WHERE` clause, not only in the service's early check, so it
can't be lost to a race any more than the cap can. `GetRedeemableByHashAsync` also `Include`s
`GrantedRole`, because the signup path reads the granted role off that entity to build the new
user's role set.

`GetConsumerUsernamesAsync` resolves redeemers' usernames for the admin list in one round-trip
(`IgnoreQueryFilters()` so a code stays attributable after its account is soft-deleted). It lives on
the repository rather than in the controller, where the equivalent query used to sit against a
directly-injected `DbContext`.

---

## 6. Signup flow

`AuthenticationService.SignupAsync` gained the gate. The ordering matters:

1. **Read the flag.** `Signup:RequireInviteCode`. If off, the entire invite path is skipped and
   signup behaves exactly as before (backwards compatible).
2. **Early-validate the code** (flag on only): reject a missing code, then hash it and look it up
   with `GetRedeemableByHashAsync`. A null result → `AppValidationException("Invalid or
   already-used invite code.")`. This gives fast, friendly feedback **before any writes**. The
   returned entity is kept — it carries the granted role and the email binding.
2b. **Check the email binding.** If the code names an `IntendedEmail`, the signup's email must match
   it (both lowercased), or `AppValidationException("This invite code was issued for a different
   email address.")`. Said plainly rather than folded into "invalid code": the holder is the
   intended recipient using the wrong address, and telling them so is the difference between a
   fixable mistake and a dead end.
3. **Existing guards, unchanged:** email exists → username taken → default role present.
4. **Open a transaction**, create the user, and `SaveChangesAsync` (so we have `user.Id`). The
   user's roles come from `BuildRolesForNewUser(defaultRole, redeemedCode)` — always `User`, plus
   the code's granted role if it has one and it isn't already `User`.
5. **Atomically consume** with `TryConsumeAsync(hash, user.Id)`. If it returns anything other than
   `1`, **roll back** and throw the same validation error. This covers the race where someone else
   spent the code between steps 2 and 5 — the just-created user is rolled back, so the cap is never
   exceeded and no half-state is persisted.
6. **Commit.** Only then do the side effects run: the verification email, the welcome notification,
   the `UserSignedUp` audit, and an `InviteCodeRedeemed` audit. A rolled-back signup sends nothing.

> **Why reading the role in step 2 is safe.** `TryConsumeAsync` uses `ExecuteUpdateAsync`, which
> can't return the row it updated, so the granted role has to come from the earlier read. That read
> and the update match on `CodeHash`, which is **uniquely indexed** — so they provably address the
> same row, and a code's role never changes after minting. The advisory nature of step 2 only
> concerns whether the code is *still* spendable, which step 5 re-decides.

**`ExternalSignupAsync` (Google/Microsoft) carries the identical contract** — same flag, same early
validation, same transactional consume, same role grant. One ordering difference: the email binding
is checked *after* the signup ticket is validated, because on that path the address comes from the
provider rather than a form field.

```
flag off ─────────────────────────────────► normal signup (no invite touched)

flag on ─► validate code ─► user guards ─► [TX: create user → consume code] ─► commit ─► side effects
                  │                                          │
            reject early                              0 rows → rollback + reject
```

> **Why the transaction?** It lets us have it both ways: validate early for UX, but only *commit*
> the spent code together with the new user. Either both happen or neither does.

### Advisory up-front check (non-consuming)

`AuthenticationService.IsInviteCodeRedeemableAsync(code)` is a **read-only** companion to the
consume path. It normalizes + hashes the code through the same `IInviteCodeGenerator` and looks it
up with `GetRedeemableByHashAsync` — exactly the step-2 early check above, but with **no writes and
no transaction**. It returns a bare `bool` (blank code → `false`), and never calls `TryConsumeAsync`.

It exists purely so the signup form can fail a bad code on step 1 instead of after the user has
filled in username, email, and password. It is deliberately **advisory**: a code that returns
`true` here can still lose the race at submit (someone else spends it in between), which is why the
transactional consume in `SignupAsync` remains the authority. Exposed via:

```
GET /api/Authentication/validate-invite-code?code=K7QM-3FXP-9T   ->   { "valid": true }
```

`[AllowAnonymous]` (the signup form is pre-auth) but `[EnableRateLimiting(AuthPolicy)]` — the same
strict per-IP policy as login/signup/refresh. That matters: an anonymous "is this code good?" oracle
is an enumeration surface, so it's rate-limited and returns **only** a boolean — it never reveals
*why* a code failed (unknown vs. used vs. revoked vs. expired all read as `valid: false`).

### A note on the `ApplicationDbContext` dependency

`AuthenticationService` now also takes `ApplicationDbContext` directly, purely to own the signup
transaction (`Database.BeginTransactionAsync`). All the repositories share that same scoped context,
so the transaction correctly wraps their writes. This is consistent with other parts of the codebase
that inject the context directly (e.g. `PermissionsController`).

---

## 7. Codes that grant a role

A code may name a role. Redeem it and the new account holds that role **in addition to** `User` —
additive, not replacing, because an account missing `User` would surprise every path that assumes
every account has it, and an Admin who is also a User is exactly what the admin Users table
produces today.

### The escalation guard (the point of the whole section)

Granting a role is otherwise done through `PUT /api/Users/{id}/roles`, which enforces: **only a
SuperAdmin may grant or remove SuperAdmin** (see [user-role-management.md](user-role-management.md)).
An invite code that carries a role is a *second* way to hand one out. If minting were gated only on
the controller's coarse `Admin,SuperAdmin`, an Admin could mint themselves a SuperAdmin code, redeem
it, and walk straight around that rule.

So minting enforces the same rule, the same way: the **controller** reads `User.IsInRole("SuperAdmin")`
off the validated JWT and passes it down; the **service** owns the decision and throws
`ForbiddenException` → `403`. The set of restricted roles now lives in one place —
`Services/Roles/RoleRules.cs` — because two copies of "which roles are privileged" is exactly the
pair that drifts apart and leaves the forgotten copy open.

| Caller | May mint `User` codes | May mint `Admin` codes | May mint `SuperAdmin` codes |
|---|---|---|---|
| **Admin** | ✅ | ✅ | ❌ → `403` |
| **SuperAdmin** | ✅ | ✅ | ✅ |

### The rails on an elevated code

A plain tester invite is a low-value bearer secret: worst case a stranger gets an ordinary account.
A code granting Admin is a different object, so `InviteCodeService.ValidateRails` refuses to mint one
unless all three hold:

| Rail | Why |
|---|---|
| **`count` must be 1** | You mint 200 tester codes; you never mint 200 Admin invites. |
| **`expiresAt` required** | A leaked elevated code has to stop working on its own. |
| **`intendedEmail` required** | Binds it to one address, so a leaked code is useless to whoever finds it. |

Two rules apply to every code, elevated or not: an `expiresAt` in the past is rejected (minting
something already dead is never what was meant), and `intendedEmail` with `count > 1` is rejected
(only the first of those codes could ever be redeemed).

`intendedEmail` on a *plain* code is optional and perfectly useful — it's how you note who a single
invite went to, which the per-batch `Label` can't express.

### Where the rules live

`Services/Invitations/InviteCodeService.cs` is new. Minting was previously done inline in the
controller, which was correct while it had no rules beyond a range check — per the backend
conventions in `CLAUDE.md`, "add the service the day a rule appears". The rule has appeared. Moving
it also let the controller drop its direct `ApplicationDbContext` dependency (the username lookup
moved to the repository, where data access belongs).

---

## 8. Admin endpoints

`Controllers/Admin/InviteCodesController.cs`, route `api/admin/invite-codes`,
`[Authorize(Roles = "Admin,SuperAdmin")]`. The controller is thin: it reads the caller's SuperAdmin
claim and delegates to `IInviteCodeService`.

| Method & route | Body | Returns | Audit |
|---|---|---|---|
| `POST /api/admin/invite-codes` | `{ count, label?, expiresAt?, role?, intendedEmail? }` (`count` capped 1–200) | `{ codes: [...] }` — **plaintext, once** | `InviteCodesGenerated` |
| `GET /api/admin/invite-codes` | — | status rows (label, timestamps, `consumedByUsername`, `grantedRole`, `intendedEmail`, `isRedeemable`) — **never plaintext** | — |
| `POST /api/admin/invite-codes/{id}/revoke` | — | `204`; `400` if already consumed; idempotent if already revoked | `InviteCodeRevoked` |

Generate can also return `403` (an Admin naming a SuperAdmin role), `409` (unknown role name), and
`400` (a rail broken — see §7).

Generation and revoke audits attribute to the **admin** (pulled from the request context by
`IAuditService`); redemption is audited against the **new user**.

---

## 9. Frontend

Signup is a multi-step flow under `src/pages/UserRelated/Signup/`.

- **`src/lib/auth-config.ts`** — `useAuthConfig()` calls the public
  `GET /api/Authentication/auth-config` and returns `{ requireInviteCode, google, microsoft,
  isLoading }`. **Supersedes the deleted `api/signup-config.ts` / `useSignupConfig()`**, which
  called `signup-config` and returned only `{ requireInviteCode }`; the flag now rides along with
  the social-login config (see [social-login.md](./social-login.md)).

  (The older `GET /api/Authentication/signup-config` endpoint it replaced is still on the server,
  marked "kept for compatibility", but nothing calls it — see
  [known-issues.md](../deployment/known-issues.md).)

  It **fails closed**: anything other than an explicit `false` from the server means "show the
  gate". Earlier this defaulted to *not* required, on the reasoning that the server enforces the
  real rule at submit — true, but it meant an unreachable config walked the user through the whole
  form to a rejection. The server remains the authority either way. The call is also fetched at
  most once per page load; social-login.md explains why that matters.
- **`api/check-availability.ts`** — alongside the username/email availability hooks,
  `useInviteCodeValidity(code)` is a debounced check against
  `GET /api/Authentication/validate-invite-code`. It only fires once the code reaches its full
  normalized length (10 chars, matching `InviteCodeGenerator`), uses `throwOnError: false` so a
  background failure never hits an error boundary, and returns `{ isValid, isInvalid, isChecking,
  isError, longEnough }` — the same shape convention as the other two.
- **`SignupComponents/InviteGate.tsx`** — the gate is now its **own stage ahead of the whole
  flow**, not a step prepended inside `SignupForm`. It owns the entire first screen: the
  invite-only note, one input, Continue. Nothing signup-related — including the Google/Microsoft
  buttons — is reachable before a code, so an external signup can't start without one.
  `SignupFlow.tsx` sequences the stages (`invite → method → manual | external`).

  Continue is gated on `useInviteCodeValidity`, mirroring how the username/email steps gate on
  their availability checks: a spinner while checking, an inline error for an invalid/used code,
  "Invite code accepted" on success. That check is **advisory** — if it can't be reached it does
  *not* hard-block, since the authoritative submit-time check still applies and a validated code
  can still lose the consume race.
- **`SignupForm.tsx`** — the email/password steps. It no longer contains an invite step; it
  receives the gate's code as a prop, numbers itself `Step 2 of 5` when gated (`1 of 4` when
  open), sends the code on submit, and bounces back to the gate via `onBadInviteCode` if the
  server rejects it.

  Its error routing checks for `"different email"` **first**. An email-bound code fails with a
  message naming both the invite and the email, and that one belongs on the email step — the code
  is fine, the address is wrong, and sending the user back to re-type a code that was never the
  problem is a dead end.
- **`SignupSteps.tsx` / `SignupProgressDisplay.tsx`** — accept the prepended step / `offset`.
- **`src/lib/Auth.tsx`** — `registerInputSchema` gained an optional `inviteCode`.

### Admin page

`src/pages/Dashboard/Pages/InviteCodes/` adds an **Invite Codes** tab to the admin dashboard
(`/dashboard/invite-codes`, gated to `Admin`/`SuperAdmin` via the nav config and route). It's the
UI over the admin endpoints in §8, so minting no longer requires Swagger/curl:

- **Generate** — a dialog takes a **role**, a count (1–200), optional label, optional intended
  email, and optional expiry, calls `POST /api/admin/invite-codes`, and renders the returned
  plaintext codes **once** with a "Copy all" button and a warning that they can't be re-read.
  Closing the dialog clears them.

  The role select is data-driven from `GET /Roles` via `useRoles()`, minus `SuperAdmin` when the
  caller isn't one — the same filter `change-user-role.tsx` applies, for the same reason (the UI
  shouldn't offer a grant the backend will refuse). Choosing anything above `User` is derived
  during render into `isElevated`, which makes the expiry and email fields required, with the copy
  explaining why. All of it mirrors `InviteCodeService.ValidateRails`; none of it *is* the rule.

  A second derived flag, `isSingleCode`, hides the count field — for an elevated code, and also
  whenever an address is typed into **Issued to**, whatever the role. The dialog used to accept
  "10" and an address together and only reject the pair on Generate, which reads as the form
  changing its mind; the count now disappears the moment an address is entered, because only the
  first of ten codes bound to one address could ever be redeemed. The count field sits *below*
  the email input so it vanishes from under the caret rather than shifting the field being typed
  in upwards.
- **Track** — a status table (from `GET /api/admin/invite-codes`) shows each code's derived status
  (**Available / Used / Revoked / Expired**), what it **grants**, label, who it was **issued to**,
  created/expiry dates, and — for used codes — who redeemed it and when. Summary cards total the
  available/used/inactive counts.
- **Revoke** — still-redeemable rows get a Revoke action (`POST .../{id}/revoke`).

The three api modules mirror the existing react-query conventions (`get-invite-codes` query,
`generate-invite-codes` + `revoke-invite-code` mutations that invalidate the list on success). The
status DTO shape is duplicated as a TS type in `get-invite-codes.ts`.

---

## 10. Auditing

New verbs in `Services/Audit/AuditActions.cs`:

- `InviteCodeRedeemed` — logged with the new user's id on a successful gated signup, against the
  code's **`Id`** and carrying `{ grantedRole }`. It used to record the code *hash* as its
  `entityId`, which no other invite audit uses, so a redemption couldn't be joined to the row it
  spent. The granted role rides along because an elevated grant that arrived this way never passes
  through `UserRolesChanged` and would otherwise appear nowhere in the audit trail.
- `InviteCodesGenerated` — logged with the admin's id and
  `{ count, label, expiresAt, role, intendedEmail, ids }`. The **ids** are what make a batch
  traceable to its rows; the count alone said a batch happened but not which codes it was.
- `InviteCodeRevoked` — logged with the admin's id and the code id.

---

## 11. Tests

`QuizAPI.Tests/Auth/AuthenticationServiceTests.cs` (Moq + an in-memory `ApplicationDbContext` whose
only job is to provide the no-op signup transaction):

- Flag on + missing code → rejected, **no user created**.
- Flag on + unknown code → rejected, no user created, code never consumed.
- Flag on + valid code → user created **and** `TryConsumeAsync` called exactly once, redemption
  audited.
- Flag on + `TryConsumeAsync` returns `0` (lost race) → rejected and **no side effects** (no email,
  notification, or `UserSignedUp` audit).
- Flag off → signup proceeds **without touching the invite repository** (backwards compatible).
- `IsInviteCodeRedeemableAsync`: blank/whitespace code → `false` **without querying** the repo;
  unknown code → `false`; redeemable code → `true` — and in every case the code is **never
  consumed** (`TryConsumeAsync` not called).
- Role-granting code → the new user holds `User` **and** the granted role; a code naming `User`
  doesn't duplicate the row (the `UserRoles` unique index would reject it).
- Email-bound code: wrong address → rejected with no user created and no consume attempt; right
  address → succeeds, and the **normalized** address is passed into `TryConsumeAsync` (it is
  re-checked inside the `UPDATE`, so it has to get there).

`QuizAPI.Tests/Auth/ExternalAuthenticationTests.cs` covers the same contract on the external path:
missing code, unknown code, valid code consumed once, lost consume race with no side effects, flag
off never touching the repository, role granted on top of `User`, and a code bound to another
address rejected.

`QuizAPI.Tests/Auth/InviteCodeServiceTests.cs` (new) covers minting:

- **Escalation:** an Admin minting a SuperAdmin code → `ForbiddenException`, nothing stored; a
  SuperAdmin minting one → succeeds; an Admin minting an Admin code → succeeds; an unknown role
  name → `ConflictException`.
- **Plain codes are unaffected:** `null` / `""` / `"User"` / `"user"` all mint an ordinary batch of
  25 with no grant, no expiry and no email — and 25 distinct hashes.
- **Rails:** an elevated code with no expiry, no intended email, or a count above 1 → rejected. A
  past expiry, or an intended email on a batch, → rejected for any code. The intended email is
  lowercased at mint time (redemption compares inside a SQL `WHERE`, which is case-sensitive on
  Postgres).
- **Revoke:** already consumed → rejected; missing → `NotFoundException`; already revoked →
  idempotent, writing and auditing nothing.

> **Not covered by automated tests:** the true concurrent race against `ExecuteUpdateAsync` — EF's
> in-memory provider doesn't support it. The unit tests exercise the service logic (consume returns
> `1` then `0`); the real atomicity rests on the SQL `WHERE ConsumedAt IS NULL`. A Postgres
> Testcontainers test firing two simultaneous redemptions would close that gap if desired.

---

## 12. Operational runbook (for the test)

1. Set `Signup__RequireInviteCode=true` on the server.
2. Log in as admin → open **Dashboard → Invite Codes** → **Generate codes** (count 25) →
   **copy them now** (they can't be re-read). Or hit `POST /api/admin/invite-codes { "count": 25 }`
   directly if you prefer.
3. Hand them out, one per tester.
4. Watch the Invite Codes table (or `GET /api/admin/invite-codes`) to see who's joined; once all are
   consumed, signup is closed.
5. Need more? Generate another batch. Someone leaked a code? Revoke it from the table (or
   `POST .../{id}/revoke`).
5b. **Onboarding a fellow admin.** Pick their role in the Generate dialog, give it their email and
   an expiry, and hand them the single code it returns. They sign up with that address and the
   account is an Admin from its first login — no second trip to the Users table. Only a SuperAdmin
   can do this for the SuperAdmin role.
6. **Going public later:** set `Signup__RequireInviteCode=false`. The frontend hides the field
   automatically. No code change, no migration.

---

## 13. File map

**Backend — new**
- `Models/InviteCode.cs`
- `Repositories/Interfaces/IInviteCodeRepository.cs`, `Repositories/InviteCodeRepository.cs`
- `Services/Invitations/IInviteCodeGenerator.cs`, `Services/Invitations/InviteCodeGenerator.cs`
- `Services/Invitations/IInviteCodeService.cs`, `Services/Invitations/InviteCodeService.cs` — mint rules, escalation guard, rails
- `Services/Roles/RoleRules.cs` — the default role and the SuperAdmin-only set, shared with `UserService`
- `DTOs/Invitations/InviteCodeDTOs.cs`
- `Controllers/Admin/InviteCodesController.cs`
- `Migrations/<timestamp>_AddInviteCodes.cs`, `Migrations/<timestamp>_AddInviteCodeRoleGrant.cs`

**Backend — edited**
- `Data/ApplicationDbContext.cs` — `DbSet` + indexes/FKs (including `GrantedRoleId` and `IntendedEmail`)
- `DTOs/Authentication/SignupDTO.cs`, `DTOs/Authentication/ExternalSignupDTO.cs` — `InviteCode`
- `Services/AuthenticationService/{IAuthenticationService,AuthenticationService}.cs` — gate + transactional consume on **both** `SignupAsync` and `ExternalSignupAsync`, role grant, email binding, plus the non-consuming `IsInviteCodeRedeemableAsync`
- `Controllers/Users/Services/UserService.cs` — `SuperAdminOnlyRoles` now comes from `RoleRules`
- `Controllers/Authentication/Authentication.cs` — public `auth-config` (and the superseded `signup-config`) + rate-limited `validate-invite-code` endpoints
- `Services/Audit/AuditActions.cs` — three new actions
- `Program.cs` — register repository + generator + service
- `appsettings.json` / `appsettings.example.json` — `Signup:RequireInviteCode`

**Frontend — new/edited**
- `src/lib/auth-config.ts` — `useAuthConfig()`, which carries `requireInviteCode` alongside the social-login config. It **replaced** an earlier `Signup/api/signup-config.ts`; that file no longer exists.
- `src/pages/UserRelated/Signup/api/check-availability.ts` — `useInviteCodeValidity` up-front check
- `src/pages/UserRelated/Signup/SignupComponents/{InviteGate,SignupFlow,MethodChoice,ExternalSignupForm,SignupForm,SignupSteps,SignupProgressDisplay}.tsx` — the gate is its own stage ahead of the flow
- `src/lib/Auth.tsx`
- `src/pages/Dashboard/Pages/InviteCodes/InviteCodes.tsx` (new) — admin page, incl. the role picker and email binding
- `src/pages/Dashboard/Pages/InviteCodes/api/{get-invite-codes,generate-invite-codes,revoke-invite-code}.ts` (new)
- `src/pages/Dashboard/Components/dashboardNavConfig.ts` — "Invite Codes" nav button
- `src/routes/Router.tsx` — `/dashboard/invite-codes` route

**Tests**
- `QuizAPI.Tests/Auth/AuthenticationServiceTests.cs`
- `QuizAPI.Tests/Auth/ExternalAuthenticationTests.cs`
- `QuizAPI.Tests/Auth/InviteCodeServiceTests.cs` (new)

---

## 14. Not implemented (optional, from the plan)

- **Guest-play disable** (`Guest:Enabled`) — §6 of the plan; lower priority, omitted.
- **Dev/test seed batch** (`Seed:InviteCodeCount`) — §5; the admin endpoint is the durable tool.
- **Postgres concurrency integration test** — see §11.
