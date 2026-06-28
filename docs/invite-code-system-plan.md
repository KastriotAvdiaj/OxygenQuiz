# Implementation Plan — Invite-Code Signup Gate

> **Goal:** Restrict access to a controlled group during the test deployment by capping how many
> accounts can be created. A pool of single-use invite codes lives in the database; redeeming a
> code consumes it; once all codes are spent, no one else can sign up. The whole feature is behind
> a config flag so it can be turned off for a public launch with no code change.

This plan is written to match the existing codebase conventions:
- **`EmailVerificationToken`** is the direct template — a hashed, single-use, consumable token
  (`ConsumedAt`, `ExpiresAt`) with a thin repository (`IEmailVerificationTokenRepository`).
- **`AuthenticationService.SignupAsync`** already does ordered guard clauses
  (`EmailExists` → `UsernameExists` → role lookup → create) and writes an audit log.
- Repositories are thin classes over `ApplicationDbContext`, registered `Scoped` in `Program.cs`.
- Admin-only endpoints exist behind the permission/role system.

---

## 1. Design decisions (and why)

These are the "best practice" choices worth making up front.

**1.1 Store a hash of each code, not the plaintext.**
Invite codes are bearer secrets, exactly like the email-verification and refresh tokens this app
already stores **hashed** (`TokenHash`). We mirror that: persist `CodeHash` (SHA-256 of the
normalized code), never the raw string. A leaked database then exposes no usable codes.
- *Trade-off:* the admin can't re-read a code from the DB later — the **generation endpoint returns
  the plaintext once**, and the admin saves/distributes it then. Listing afterwards shows only
  status (used/unused, who, when). For 20–30 test codes this is fine; if a code is lost before
  hand-out, revoke and regenerate.
- *Simpler alternative (if you'd rather re-list plaintext):* store the code in plaintext and keep
  the table admin-only. Acceptable given codes are single-use and capped, but less consistent with
  the app's existing token handling. **Recommendation: hash it.**

**1.2 Redemption must be atomic.**
To truly guarantee the cap, two people submitting the same code at the same instant must not both
succeed. We consume the code with a single conditional update guarded by `ConsumedAt IS NULL`
(EF Core 8 `ExecuteUpdateAsync`) inside the signup transaction, and treat "0 rows affected" as
"already used / lost the race." This is the one genuinely tricky part; everything else is routine.

**1.3 A code is only spent on a *successful* signup.**
Validate the code early (fast, friendly rejection), but only **consume** it after the user row is
created, in the **same transaction**, so a failed signup (duplicate email/username) never burns a
code.

**1.4 Cryptographically-random, human-friendly codes.**
Generate with `RandomNumberGenerator` (CSPRNG), not `System.Random`. Use an unambiguous alphabet
(no `0/O`, `1/I/l`), ~10 chars, grouped for readability (e.g. `K7QM-3FXP-9T`). Normalize on input
(trim, uppercase, strip dashes) before hashing so users can't trip on formatting.

**1.5 Feature flag, not a hard-coded rule.**
Gate the requirement behind `Signup:RequireInviteCode` (bool, default depends on environment). Test
deployment sets it `true`; flipping it `false` opens public signup with no redeploy of logic.

**1.6 Reuse the existing patterns.**
New `InviteCode` entity + `IInviteCodeRepository` mirror `EmailVerificationToken`. No new
architectural concepts; a future reader recognizes it instantly.

---

## 2. Data model

**New entity — `Models/InviteCode.cs`:**

| Field | Type | Notes |
|---|---|---|
| `Id` | `int` (identity) | PK |
| `CodeHash` | `string` | SHA-256 of normalized code; **unique index** |
| `Label` | `string?` | Optional note ("for Alban", "batch 1") set at generation |
| `CreatedAt` | `DateTime` | UTC |
| `ExpiresAt` | `DateTime?` | Optional; null = no expiry |
| `ConsumedAt` | `DateTime?` | Null = still valid (the single-use marker) |
| `ConsumedByUserId` | `Guid?` | FK → `User`, set on redemption (audit: who used it) |
| `RevokedAt` | `DateTime?` | Admin-revoked without being used |

A code is **redeemable** when `ConsumedAt IS NULL AND RevokedAt IS NULL AND (ExpiresAt IS NULL OR ExpiresAt > now)`.

**EF config (in `ApplicationDbContext.OnModelCreating`):**
- `modelBuilder.Entity<InviteCode>().HasIndex(c => c.CodeHash).IsUnique();`
- Optional FK: `HasOne<User>().WithMany().HasForeignKey(c => c.ConsumedByUserId).OnDelete(DeleteBehavior.SetNull);`
- Add `public DbSet<InviteCode> InviteCodes { get; set; }`.

**Migration:** `dotnet ef migrations add AddInviteCodes`. Runs automatically at startup like the
others (fine while single-instance).

---

## 3. Repository

**`Repositories/Interfaces/IInviteCodeRepository.cs`** and **`Repositories/InviteCodeRepository.cs`**,
mirroring `EmailVerificationTokenRepository`:

```csharp
public interface IInviteCodeRepository
{
    Task AddRangeAsync(IEnumerable<InviteCode> codes, CancellationToken ct = default);

    /// Returns the redeemable code row for this hash, or null.
    Task<InviteCode?> GetRedeemableByHashAsync(string codeHash, CancellationToken ct = default);

    /// Atomically marks the code consumed IFF it is still redeemable.
    /// Returns rows affected (1 = success, 0 = already used/revoked/expired/lost a race).
    Task<int> TryConsumeAsync(string codeHash, Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<InviteCode>> ListAsync(CancellationToken ct = default);  // admin status view
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```

`TryConsumeAsync` is the atomic primitive:

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

Register `Scoped` in `Program.cs` next to the other repositories.

---

## 4. Signup flow changes

**4.1 DTO — `DTOs/Authentication/SignupDTO.cs`:** add

```csharp
[MaxLength(64)]
public string? InviteCode { get; set; }
```

(Kept nullable at the DTO level; whether it's *required* is enforced in the service based on the
feature flag, so the same DTO works in both invite-only and open modes.)

**4.2 `AuthenticationService` dependencies:** inject `IInviteCodeRepository`, `ITokenService`
(already present — reuse its hashing, or add a small `HashInviteCode` helper), and read
`IConfiguration` (already injected) for `Signup:RequireInviteCode`.

**4.3 New ordering inside `SignupAsync`** (transactional):

1. **Normalize + early-validate the code** (only when `RequireInviteCode` is true):
   - If the flag is on and `InviteCode` is null/blank → `AppValidationException("An invite code is required.")`.
   - Normalize (trim/upper/strip dashes), hash, `GetRedeemableByHashAsync`. If null →
     `AppValidationException("Invalid or already-used invite code.")`. *(Fast feedback before any writes.)*
2. **Existing guards unchanged:** email exists → username taken → default role present.
3. **Open a transaction.** Create the user and `SaveChangesAsync` (so we have `user.Id`).
4. **Atomically consume:** `rows = await _inviteCodes.TryConsumeAsync(hash, user.Id, ct);`
   - If `rows != 1` → **roll back** and throw `AppValidationException("Invalid or already-used invite code.")`.
     (Covers the race where someone else spent it between steps 1 and 4.)
5. **Commit.** Then continue with the existing post-create work (verification email, welcome
   notification, audit log, reload-with-roles).
6. **Audit:** `AuditActions.InviteCodeRedeemed` with the user id (add the constant to `AuditActions`).

> Note: the email-verification/notification/audit calls currently run after `SaveChanges`. Keep
> them *after commit* so a rolled-back signup sends nothing. Wrap user-create + consume in the
> transaction; do the side-effects after `CommitAsync`.

---

## 5. Generating codes

**Primary: an admin endpoint** (best to live with — mint and audit without DB access).

New `Controllers/Admin/InviteCodesController.cs` (follow the existing admin controller +
permission-attribute convention):
- `POST /api/admin/invite-codes` — body `{ count, label?, expiresAt? }`. Generates `count` codes,
  stores their hashes, **returns the plaintext codes once** in the response. Caps `count` (e.g. ≤ 200).
  Audit `InviteCodesGenerated`.
- `GET /api/admin/invite-codes` — returns status rows (label, createdAt, consumedAt,
  consumedByUsername, revoked) — **no plaintext**.
- `POST /api/admin/invite-codes/{id}/revoke` — sets `RevokedAt` (can't revoke an already-consumed one).

A tiny `InviteCodeGenerator` helper holds the CSPRNG + alphabet + formatting and the
`Normalize`/`Hash` functions (shared by generation and redemption so they can't drift).

**Optional: dev/test seed.** In `DbSeeder`, behind a flag like `Seed:InviteCodeCount`, generate N
codes on first startup **only if the table is empty**, and log them once. Handy for spinning up the
test environment, but the admin endpoint is the durable tool. *(Recommendation: ship the endpoint;
add the seed only if you want zero-click test setup.)*

---

## 6. Disable guest play during the test (optional, recommended)

So random visitors can't even use the one free guest quiz:
- Add `Guest:Enabled` (bool, default true).
- In the guest-session creation path (`/api/guest-quiz-sessions`, the guest service — exact file to
  be confirmed at implementation), return `403`/`AppValidationException` when disabled.
- Test deployment sets `Guest__Enabled=false`; flip back for launch.

*(Lower priority than the invite gate; include if you want the test fully sealed.)*

---

## 7. Frontend

Signup is a multi-step flow under `src/pages/UserRelated/Signup/`
(`Signup.tsx`, `SignupComponents/SignupForm.tsx`, `SignupSteps.tsx`, `api/`).

- Add an **Invite code** input (first step is natural, so an invalid code fails before they fill
  everything else). Normalize/uppercase on input for UX.
- Include `inviteCode` in the register request payload/type in the signup `api/` module.
- Surface the backend's validation message ("Invalid or already-used invite code") inline.
- Drive visibility from config too: expose `RequireInviteCode` via the existing public-config/env
  mechanism (or simply always show it during the test) so the field can be hidden at public launch.

---

## 8. Auditing

Add to `Services/Audit/AuditActions.cs`:
- `InviteCodeRedeemed = "InviteCodeRedeemed"`
- `InviteCodesGenerated = "InviteCodesGenerated"`
- `InviteCodeRevoked = "InviteCodeRevoked"`

Log redemption with the new user id, and generation/revoke with the admin id — consistent with the
existing `UserSignedUp` / `LoginFailed` audit calls.

---

## 9. Testing strategy

Mirror the existing `AuthenticationServiceTests` (Moq) and the EF-InMemory `AnswerGradingServiceTests`.

**Unit (service, mocked repos):**
- Flag **on** + missing code → `AppValidationException`.
- Flag **on** + unknown/expired/revoked code → rejected, **no user created** (verify `AddAsync` not called).
- Flag **on** + valid code → user created **and** `TryConsumeAsync` called once.
- `TryConsumeAsync` returns 0 (lost race / already used) → signup throws and no side-effects fire.
- Flag **off** → signup proceeds without touching invite repo (backwards compatible).

**Concurrency / atomicity (the important one):**
- `ExecuteUpdateAsync` is **not supported on the EF InMemory provider**, so the atomic path can't be
  exercised by the existing in-memory tests. Cover it with an **integration test against real
  Postgres** (Testcontainers) — fire two concurrent redemptions of one code and assert exactly one
  succeeds. If you'd rather not add Testcontainers now, at minimum unit-test the service logic by
  mocking `TryConsumeAsync` to return 1 then 0, and rely on the SQL `WHERE ConsumedAt IS NULL`
  guarantee for the real race.

**Admin endpoint:** generation returns the requested count once; listing never leaks plaintext;
revoke blocks an already-consumed code.

---

## 10. Operational runbook (for the test)

1. Set `Signup__RequireInviteCode=true` (and optionally `Guest__Enabled=false`) on the server.
2. Log in as admin → `POST /api/admin/invite-codes { count: 25 }` → copy the 25 codes.
3. Hand them out (one per tester).
4. Watch `GET /api/admin/invite-codes` to see who's joined; once all are consumed, signup is closed.
5. Need more? Generate another batch. Someone leaked a code? Revoke it.
6. **Going public later:** set `RequireInviteCode=false` (and `Guest__Enabled=true`), hide the
   frontend field. No code change, no migration.

---

## 11. File-by-file checklist

**Backend — new**
- `Models/InviteCode.cs`
- `Repositories/Interfaces/IInviteCodeRepository.cs`
- `Repositories/InviteCodeRepository.cs`
- `Services/Invitations/InviteCodeGenerator.cs` (CSPRNG + normalize + hash)
- `Controllers/Admin/InviteCodesController.cs`
- `Migrations/<timestamp>_AddInviteCodes.cs` (generated)
- Tests under `QuizAPI.Tests/Auth/` (+ optional `Integration/` for the Postgres concurrency test)

**Backend — edited**
- `Data/ApplicationDbContext.cs` — `DbSet` + index/FK config
- `DTOs/Authentication/SignupDTO.cs` — `InviteCode`
- `Services/AuthenticationService/AuthenticationService.cs` — gate + transactional consume
- `Services/Audit/AuditActions.cs` — new actions
- `Program.cs` — register `IInviteCodeRepository`, generator
- `appsettings.example.json` / docs — document `Signup:RequireInviteCode`, `Guest:Enabled`
- (optional) `Services/DbSeeder.cs` — seed batch; guest-session path for the `Guest:Enabled` gate

**Frontend — edited**
- `src/pages/UserRelated/Signup/...` — invite-code field + payload + error display

---

## 12. Effort & sequencing

Roughly **half a day to a day**, in this order (each step builds on the last):

1. Entity + DbContext config + migration (~45 min)
2. Repository with atomic `TryConsumeAsync` (~45 min)
3. `InviteCodeGenerator` + admin endpoints (~1–1.5 h)
4. `SignupAsync` gate + transactional consume + DTO + flag (~1 h)
5. Frontend field (~45 min)
6. Audit actions + config docs (~20 min)
7. Tests (unit ~1 h; optional Postgres concurrency test ~1 h)
8. Optional: guest-play disable flag (~30 min)

Steps 1–4 give a working invite gate; 5 makes it usable in the UI; 6–8 are the polish that keeps it
clean and trustworthy.
