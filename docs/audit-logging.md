# Audit Logging

## Purpose

An append-only trail of important actions: **who did what, to which record, from where, and when.**
Rows are only ever inserted — never updated or deleted. There is intentionally no foreign key to
`User`, so the history survives even if the acting user is deleted. Use it for security-sensitive
and ownership-sensitive actions (not as a general activity log).

## What a row records

`AuditLog` (Models/AuditLog.cs):

| Field | Meaning |
|-------|---------|
| `UserId` | Who acted. Filled automatically from the request; `null` for anonymous/system actions (e.g. a failed login). |
| `Action` | Business verb, e.g. `QuestionUpdated`. Always from `AuditActions` constants. |
| `Entity` / `EntityId` | What was targeted, e.g. `"Question"` / `"42"`. |
| `OldValue` / `NewValue` | JSON snapshots before/after the change. Either may be null. |
| `IpAddress` | Caller IP, filled automatically. |
| `CreatedAt` | When (UTC), filled automatically. |

## How to write one

Inject `IAuditService` and call `LogAsync` **after** the operation has saved:

```csharp
await _auditService.LogAsync(
    AuditActions.QuestionUpdated,   // 1. verb from the constants class
    entity: "Question",             // 2. what was touched
    entityId: id.ToString(),        // 3. its id
    newValue: new { ... });         //    optional snapshot
```

Three rules:

1. **Always use an `AuditActions` constant** (Services/Audit/AuditActions.cs), never a raw string —
   the read API filters by exact `Action` text, so a typo silently breaks searching.
2. **Call it after your primary `SaveChanges`.** `AuditService` shares the request's `DbContext` and
   saves immediately; calling it mid-operation would flush half-finished changes. For an *update*,
   capture the "old" snapshot **before** you mutate the entity.
3. **You don't pass the user or IP** — those come from the current request automatically. The only
   exception is login, which passes `userId` explicitly because the actor isn't authenticated yet.

`LogAsync` never throws: if writing the audit row fails it logs a warning and the original operation
still succeeds. So treat the trail as best-effort, not transactional.

## Where it's used today

| Action | Entity | Written from |
|--------|--------|--------------|
| `UserLoggedIn`, `LoginFailed`, `UserSignedUp` | User | `AuthenticationService` |
| `UserCreated` (incl. roles granted), `UserDeleted` | User | `UserService` |
| `QuestionCreated` / `QuestionUpdated` / `QuestionDeleted` | Question | `QuestionsController` |
| `QuizCreated` / `QuizUpdated` / `QuizDeleted` | Quiz | `QuizController` |
| `RoleCreated` / `RoleUpdated` / `RoleDeleted` | Role | `RolesController` |

For question update/delete the snapshot includes `ByOwner` (and `OwnerId`) — `false` means an admin
acted on **someone else's** content via an `:any` permission, which is the case most worth reviewing.

## What NOT to audit

Reads, settings toggles, and high-frequency events (e.g. individual quiz-session answers). They drown
out the signal. For high-volume flows, log one coarse summary event instead of one row per record.

## How to read it

`GET /api/auditlogs` — **Admin / SuperAdmin only**, read-only. Supports filtering by `userId`,
`entity`, `action`, `from`, `to`, plus `page` / `pageSize`. Returns newest first.
The response gives `UserId` only (no FK to User), so resolve usernames best-effort at read time.

## Adding a new audited action

1. Add a constant to `AuditActions`.
2. Inject `IAuditService` into the controller/service if it isn't already there.
3. Call `LogAsync` after the save, following the three rules above.
