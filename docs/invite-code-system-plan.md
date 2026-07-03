# Implementation Plan — Invite-Code Signup Gate

> **Status: implemented (2026-06-28).** This is the original design plan, kept for the rationale and
> trade-offs behind the decisions. For the system **as built** — the actual files, endpoints, and
> operational runbook — see [`invite-code-system.md`](invite-code-system.md). Code comments point
> here for the "why"; that doc is the "what is."

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
Gate the requirement behind `Signup:RequireInviteCode` (bool). Test deployment sets it `true`;
flipping it `false` opens public signup with no redeploy of logic.

**1.6 Reuse the existing patterns.**
New `InviteCode` entity + `IInviteCodeRepository` mirror `EmailVerificationToken`. No new
architectural concepts; a future reader recognizes it instantly.

---

## 2. Data model

**Entity `Models/InviteCode.cs`** (table `InviteCodes`):

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

**EF config:** unique index on `CodeHash`; optional FK `ConsumedByUserId` with
`OnDelete(SetNull)`. Migration runs at startup like the others.

---

## 3. Repository

`IInviteCodeRepository` / `InviteCodeRepository`, mirroring `EmailVerificationTokenRepository`. The
key method is the atomic consume — a single conditional `UPDATE` guarded by `ConsumedAt IS NULL` via
`ExecuteUpdateAsync`, returning rows affected (1 = success, 0 = already used / lost a race). That is
what guarantees the cap.

---

## 4. Signup flow

Slots into `SignupAsync`:
1. Read `Signup:RequireInviteCode`; if off, skip the whole path (backwards compatible).
2. Early-validate the code (hash + `GetRedeemableByHash`), reject before any writes.
3. Existing guards (email/username/role) unchanged.
4. Open a transaction, create the user, `SaveChanges`.
5. Atomically consume; if rows != 1, roll back and reject (covers the race).
6. Commit, then run side effects (verification email, welcome notification, audits) — so a
   rolled-back signup leaves nothing behind.

---

## 5. Code generation

An **admin endpoint** mints batches and returns the plaintext **once** (DB stores only hashes); a
shared `InviteCodeGenerator` owns the CSPRNG + normalize + hash so generation and redemption can't
drift. (An optional dev seed was considered but the endpoint is the durable tool.)

---

## 6. Disable guest play during the test (optional)

A `Guest:Enabled` flag in the guest-session path so random visitors can't use the free guest quiz.
Lower priority — omitted from the initial build.

---

## 7. Frontend

An invite-code step is prepended to the multi-step signup when the flag is on (read via a public
`signup-config` endpoint), the code is sent as `inviteCode`, and server validation errors bounce
the user back to that step.

---

## 8. Auditing

`InviteCodeRedeemed`, `InviteCodesGenerated`, `InviteCodeRevoked` added to `AuditActions`.

---

## 9. Testing strategy

Unit tests (Moq) cover: flag off bypasses; missing/unknown code rejected with no user created; valid
code creates user and consumes once; `TryConsume` returning 0 (lost race) rejects with no side
effects. **Caveat:** the true concurrent race against `ExecuteUpdateAsync` can't run on the EF
in-memory provider — a Postgres Testcontainers test would close that gap.

---

## 10. Operational runbook

See [`invite-code-system.md` §11](invite-code-system.md) for the as-built runbook (enable the flag,
mint codes, watch redemptions, revoke, reopen public signup).
