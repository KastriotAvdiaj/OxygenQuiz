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

```
IsRedeemable  ⟺  ConsumedAt IS NULL
               AND RevokedAt IS NULL
               AND (ExpiresAt IS NULL OR ExpiresAt > now)
```

EF config (`ApplicationDbContext.OnModelCreating`):
- `CodeHash` has a **unique** index.
- `ConsumedByUserId` is an optional FK with `OnDelete(SetNull)` — deleting a user keeps the code row
  (and the audit trail) intact rather than cascading it away.

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
public Task<int> TryConsumeAsync(string codeHash, Guid userId, CancellationToken ct = default) =>
    _context.InviteCodes
        .Where(c => c.CodeHash == codeHash
                 && c.ConsumedAt == null
                 && c.RevokedAt == null
                 && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow))
        .ExecuteUpdateAsync(s => s
            .SetProperty(c => c.ConsumedAt, DateTime.UtcNow)
            .SetProperty(c => c.ConsumedByUserId, userId), ct);
```

This is a **single conditional `UPDATE`** guarded by `ConsumedAt IS NULL`. It returns the number of
rows affected: **1 = success**, **0 = already used / revoked / expired / lost a concurrent race**.
This is what truly guarantees the cap — two people submitting the same code at the same instant can
never both get a `1`.

---

## 6. Signup flow

`AuthenticationService.SignupAsync` gained the gate. The ordering matters:

1. **Read the flag.** `Signup:RequireInviteCode`. If off, the entire invite path is skipped and
   signup behaves exactly as before (backwards compatible).
2. **Early-validate the code** (flag on only): reject a missing code, then hash it and look it up
   with `GetRedeemableByHashAsync`. A null result → `AppValidationException("Invalid or
   already-used invite code.")`. This gives fast, friendly feedback **before any writes**.
3. **Existing guards, unchanged:** email exists → username taken → default role present.
4. **Open a transaction**, create the user, and `SaveChangesAsync` (so we have `user.Id`).
5. **Atomically consume** with `TryConsumeAsync(hash, user.Id)`. If it returns anything other than
   `1`, **roll back** and throw the same validation error. This covers the race where someone else
   spent the code between steps 2 and 5 — the just-created user is rolled back, so the cap is never
   exceeded and no half-state is persisted.
6. **Commit.** Only then do the side effects run: the verification email, the welcome notification,
   the `UserSignedUp` audit, and an `InviteCodeRedeemed` audit. A rolled-back signup sends nothing.

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

## 7. Admin endpoints

`Controllers/Admin/InviteCodesController.cs`, route `api/admin/invite-codes`,
`[Authorize(Roles = "Admin,SuperAdmin")]`:

| Method & route | Body | Returns | Audit |
|---|---|---|---|
| `POST /api/admin/invite-codes` | `{ count, label?, expiresAt? }` (`count` capped 1–200) | `{ codes: [...] }` — **plaintext, once** | `InviteCodesGenerated` |
| `GET /api/admin/invite-codes` | — | status rows (label, timestamps, `consumedByUsername`, `isRedeemable`) — **never plaintext** | — |
| `POST /api/admin/invite-codes/{id}/revoke` | — | `204`; `400` if already consumed; idempotent if already revoked | `InviteCodeRevoked` |

The list view resolves consumer usernames in one round-trip (and `IgnoreQueryFilters()` so a code is
still attributable even if that account was later soft-deleted).

Generation and revoke audits attribute to the **admin** (pulled from the request context by
`IAuditService`); redemption is audited against the **new user**.

---

## 8. Frontend

Signup is a multi-step flow under `src/pages/UserRelated/Signup/`.

- **`api/signup-config.ts`** — `useSignupConfig()` calls the public
  `GET /api/Authentication/signup-config` and returns `{ requireInviteCode }`. It defaults to *not*
  required until the call resolves, so the form stays usable even if that anonymous call hiccups
  (the server still enforces the real rule on submit).
- **`api/check-availability.ts`** — alongside the username/email availability hooks,
  `useInviteCodeValidity(code)` is a debounced check against
  `GET /api/Authentication/validate-invite-code`. It only fires once the code reaches its full
  normalized length (10 chars, matching `InviteCodeGenerator`), uses `throwOnError: false` so a
  background failure never hits an error boundary, and returns `{ isValid, isInvalid, isChecking,
  isError, longEnough }` — the same shape convention as the other two.
- **`SignupForm.tsx`** — when `requireInviteCode` is true, an **invite-code step is prepended** and
  every content step shifts down by one (`offset`). Step numbers are computed from `offset`, not
  hard-coded. The code is uppercased as the user types, sent as `inviteCode` in the register
  payload, and a bad-code error from the server bounces the user back to the invite step. The
  invite step's **Continue button is gated on `useInviteCodeValidity`** (mirroring how the
  username/email steps gate on their availability checks): it shows a spinner while checking, an
  inline error for an invalid/used code, and "Invite code accepted" on success. If that advisory
  call can't be reached it does *not* hard-block — the user can proceed and the authoritative
  submit-time check still applies.
- **`SignupSteps.tsx` / `SignupProgressDisplay.tsx`** — accept the prepended step / `offset`.
- **`src/lib/Auth.tsx`** — `registerInputSchema` gained an optional `inviteCode`.

### Admin page

`src/pages/Dashboard/Pages/InviteCodes/` adds an **Invite Codes** tab to the admin dashboard
(`/dashboard/invite-codes`, gated to `Admin`/`SuperAdmin` via the nav config and route). It's the
UI over the admin endpoints in §7, so minting no longer requires Swagger/curl:

- **Generate** — a dialog takes a count (1–200), optional label, and optional expiry, calls
  `POST /api/admin/invite-codes`, and renders the returned plaintext codes **once** with a
  "Copy all" button and a warning that they can't be re-read. Closing the dialog clears them.
- **Track** — a status table (from `GET /api/admin/invite-codes`) shows each code's derived status
  (**Available / Used / Revoked / Expired**), label, created/expiry dates, and — for used codes — who
  redeemed it and when. Summary cards total the available/used/inactive counts.
- **Revoke** — still-redeemable rows get a Revoke action (`POST .../{id}/revoke`).

The three api modules mirror the existing react-query conventions (`get-invite-codes` query,
`generate-invite-codes` + `revoke-invite-code` mutations that invalidate the list on success). The
status DTO shape is duplicated as a TS type in `get-invite-codes.ts`.

---

## 9. Auditing

New verbs in `Services/Audit/AuditActions.cs`:

- `InviteCodeRedeemed` — logged with the new user's id on a successful gated signup.
- `InviteCodesGenerated` — logged with the admin's id and `{ count, label, expiresAt }`.
- `InviteCodeRevoked` — logged with the admin's id and the code id.

---

## 10. Tests

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

> **Not covered by automated tests:** the true concurrent race against `ExecuteUpdateAsync` — EF's
> in-memory provider doesn't support it. The unit tests exercise the service logic (consume returns
> `1` then `0`); the real atomicity rests on the SQL `WHERE ConsumedAt IS NULL`. A Postgres
> Testcontainers test firing two simultaneous redemptions would close that gap if desired.

---

## 11. Operational runbook (for the test)

1. Set `Signup__RequireInviteCode=true` on the server.
2. Log in as admin → open **Dashboard → Invite Codes** → **Generate codes** (count 25) →
   **copy them now** (they can't be re-read). Or hit `POST /api/admin/invite-codes { "count": 25 }`
   directly if you prefer.
3. Hand them out, one per tester.
4. Watch the Invite Codes table (or `GET /api/admin/invite-codes`) to see who's joined; once all are
   consumed, signup is closed.
5. Need more? Generate another batch. Someone leaked a code? Revoke it from the table (or
   `POST .../{id}/revoke`).
6. **Going public later:** set `Signup__RequireInviteCode=false`. The frontend hides the field
   automatically. No code change, no migration.

---

## 12. File map

**Backend — new**
- `Models/InviteCode.cs`
- `Repositories/Interfaces/IInviteCodeRepository.cs`, `Repositories/InviteCodeRepository.cs`
- `Services/Invitations/IInviteCodeGenerator.cs`, `Services/Invitations/InviteCodeGenerator.cs`
- `DTOs/Invitations/InviteCodeDTOs.cs`
- `Controllers/Admin/InviteCodesController.cs`
- `Migrations/<timestamp>_AddInviteCodes.cs`

**Backend — edited**
- `Data/ApplicationDbContext.cs` — `DbSet` + index/FK
- `DTOs/Authentication/SignupDTO.cs` — `InviteCode`
- `Services/AuthenticationService/{IAuthenticationService,AuthenticationService}.cs` — gate + transactional consume, plus the non-consuming `IsInviteCodeRedeemableAsync`
- `Controllers/Authentication/Authentication.cs` — public `signup-config` + rate-limited `validate-invite-code` endpoints
- `Services/Audit/AuditActions.cs` — three new actions
- `Program.cs` — register repository + generator
- `appsettings.json` / `appsettings.example.json` — `Signup:RequireInviteCode`

**Frontend — new/edited**
- `src/pages/UserRelated/Signup/api/signup-config.ts` (new)
- `src/pages/UserRelated/Signup/api/check-availability.ts` — `useInviteCodeValidity` up-front check
- `src/pages/UserRelated/Signup/SignupComponents/{SignupForm,SignupSteps,SignupProgressDisplay}.tsx`
- `src/lib/Auth.tsx`
- `src/pages/Dashboard/Pages/InviteCodes/InviteCodes.tsx` (new) — admin page
- `src/pages/Dashboard/Pages/InviteCodes/api/{get-invite-codes,generate-invite-codes,revoke-invite-code}.ts` (new)
- `src/pages/Dashboard/Components/dashboardNavConfig.ts` — "Invite Codes" nav button
- `src/routes/Router.tsx` — `/dashboard/invite-codes` route

**Tests**
- `QuizAPI.Tests/Auth/AuthenticationServiceTests.cs`

---

## 13. Not implemented (optional, from the plan)

- **Guest-play disable** (`Guest:Enabled`) — §6 of the plan; lower priority, omitted.
- **Dev/test seed batch** (`Seed:InviteCodeCount`) — §5; the admin endpoint is the durable tool.
- **Postgres concurrency integration test** — see §10.
