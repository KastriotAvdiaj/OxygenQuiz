# Changing a User's Role

> **What it does:** Lets an admin change which roles a user holds, from the admin **Users** table.
> Backed by a single endpoint that replaces the user's role set, with a privilege-escalation gate so
> the SuperAdmin role can only be granted or removed by a SuperAdmin.

---

## 1. Authorization rules

The endpoint is `Admin,SuperAdmin` only. On top of that coarse gate, the service enforces the
fine-grained policy:

| Caller | May grant/remove `User`, `Admin` | May grant/remove `SuperAdmin` |
|---|---|---|
| **Admin** | ✅ | ❌ → `403 Forbidden` |
| **SuperAdmin** | ✅ | ✅ |

Two extra guards:

- **Lockout guard.** The last remaining SuperAdmin can't be demoted — the change is rejected with a
  `400` ("assign the role to another account first"). This prevents locking the whole org out of the
  most privileged surface.
- **Idempotent no-op.** If the requested set equals the user's current set, the call returns quietly
  with no audit entry and no cache eviction.

The escalation decision is split cleanly: the **controller** reads the caller's `SuperAdmin` claim
from the validated JWT (`User.IsInRole("SuperAdmin")`) and passes it down; the **service** owns the
actual rule (it's the layer that knows the current-vs-desired diff). The service throws
`ForbiddenException` → `403` when an Admin's change would touch the SuperAdmin role.

---

## 2. API

```
PUT /api/Users/{id}/roles
[Authorize(Roles = "Admin,SuperAdmin")]
Body:  { "roles": ["Admin"] }
204 No Content   — applied (or no-op)
400 Bad Request  — empty list, or removing the last SuperAdmin
403 Forbidden    — Admin tried to grant/remove SuperAdmin
404 Not Found    — no such user
409 Conflict     — unknown role name
```

The body is the **desired end-state** set, not a delta: whatever roles it names become the user's
roles, and any current role it omits is removed. Names match the seeded roles case-insensitively.

The role picker reads `GET /api/Roles`, which was **relaxed from SuperAdmin-only to
`Admin,SuperAdmin`** (an Admin needs the list to populate the picker). This is applied per-method on
`RolesController`: the two read endpoints allow `Admin,SuperAdmin`, while role CRUD
(`POST`/`PUT`/`DELETE`) stays **SuperAdmin-only**, so the privilege-escalation surface is unchanged.

---

## 3. Backend implementation

- **`IUserService.SetUserRolesAsync(userId, dto, callerIsSuperAdmin, callerId, ct)`** in
  `UserService`. It loads the user tracked (with roles), validates the requested names, diffs against
  the current set, applies the escalation + lockout guards, then mutates the tracked `UserRoles`
  collection in place (recording `AssignedByUserId`/`AssignedAt` on each new grant), bumps
  `ConcurrencyStamp`, and saves.
- **Role resolution is shared.** The name→`Role` lookup (with "unknown role" rejection) was extracted
  from `CreateUserAsync` into one private `ResolveRolesAsync`, so account creation and role changes
  validate identically and can't drift.
- **Cache + token propagation.** After a successful change the user's cached permission set is evicted
  (`IPermissionService.InvalidateCache`), so server-side permission checks are correct on the next
  request. Their **existing JWT still carries the old role claims until it refreshes** — role *claims*
  update on the next silent refresh / re-login, which is expected, not a bug.
- **Audit.** Logged as `UserRolesChanged` with the old and new role sets and the acting admin's id.
- **`ForbiddenException`** was added to `Exeptions/AppExceptions.cs` and mapped to `403` in
  `GlobalExceptionHandler` (the app previously had no 403 domain exception).

---

## 4. Frontend

In the admin **Users** table (`src/pages/Dashboard/Pages/User/`):

- **`Components/change-user-role.tsx`** — a dialog opened from the row actions menu (it replaced the
  dead "Edit User" placeholder). It uses a **multi-select** (roles are many-to-many), pre-populated
  with the user's current roles, and sends the full selected set. Options are **data-driven** from
  `GET /Roles` via `useRoles()`, minus `SuperAdmin` when the caller isn't a SuperAdmin — so the UI
  can't even offer a grant the backend would reject. At least one role must stay selected (matches the
  DTO's `MinLength(1)`). Server-side rules are the real enforcement; this just keeps the UI honest.
  Success/failure surface as toasts, and the failure message prefers the server's `ProblemDetails`
  text (so the 403/400 reasons show through).
- **`api/get-roles.ts`** — `useRoles()`, a cached `GET /Roles` query feeding the picker.
- **`api/update-user-roles.ts`** — `useUpdateUserRoles`, a `PUT /Users/{id}/roles` mutation that
  invalidates the `["users"]` query (prefix-invalidating the paginated search) so the table's Roles
  column refreshes immediately. Mirrors the existing create/delete-user mutation conventions.

**Row-level gating** (`Components/columns.tsx`): the Change Role action is disabled when the row is
**your own account** (no self-demotion / lockout footgun) or when an **Admin is looking at a
SuperAdmin** (only a SuperAdmin may manage a SuperAdmin). Both mirror the backend rules — the disabled
item shows the reason via `title`. The backend still enforces all of this regardless of the UI state.

---

## 5. Tests

`QuizAPI.Tests/Users/UserServiceRoleTests.cs` — a real `UserRepository`/`RoleRepository` over an
in-memory context (so the lockout count query runs for real), mocking only audit + permission cache:

- Admin grants Admin to a User → succeeds, cache evicted, audit written.
- Admin grants **or** removes SuperAdmin → `ForbiddenException`, nothing changes.
- SuperAdmin grants SuperAdmin → succeeds.
- Demoting the **last** SuperAdmin → rejected; demoting one when another exists → succeeds.
- No-op (same roles) → no audit, no cache eviction.
- Unknown role name → `ConflictException`.

---

## 6. File map

**Backend**
- `Controllers/Users/UsersController.cs` — `PUT {id}/roles`
- `Controllers/Users/Services/{IUserService,UserService}.cs` — `SetUserRolesAsync` + shared `ResolveRolesAsync`
- `DTOs/User/SetUserRolesDTO.cs` (new)
- `Exeptions/AppExceptions.cs` — `ForbiddenException`; `Middleware/GlobalExceptionHandler.cs` — 403 mapping
- `Services/Audit/AuditActions.cs` — `UserRolesChanged`
- `Controllers/Roles/RolesController.cs` — per-method authz (reads `Admin,SuperAdmin`, CRUD `SuperAdmin`)

**Frontend**
- `src/pages/Dashboard/Pages/User/Components/change-user-role.tsx` (new; multi-select, data-driven), `columns.tsx` (wired + gated action)
- `src/pages/Dashboard/Pages/User/api/update-user-roles.ts` (new), `api/get-roles.ts` (new)

**Tests**
- `QuizAPI.Tests/Users/UserServiceRoleTests.cs` (new)

---

## 7. Known limitations / follow-ups

- **`GET /api/Roles` returns full `Role` entities.** The picker only needs `{ id, name }`, but the
  endpoint serialises whole rows. Harmless today (no navigations loaded → no cycle or leak), but a
  small `RoleDTO` projection would be a cleaner contract now that Admins can read it. Tracked in
  [known-issues.md](../deployment/known-issues.md) (Code quality / cleanup, **P3**).
- **Role-claim propagation lag.** As noted in §3, a changed user keeps their old role *claims* in the
  current JWT until it refreshes. If an immediate cut-off is ever required (e.g. revoking Admin from a
  compromised account), that needs a token-revocation / "log out everywhere" mechanism — see the
  refresh-token reuse-detection work listed in [authentication.md](authentication.md).
- **No dedicated "manage roles" permission.** Access is role-based (`Admin`/`SuperAdmin`) rather than
  gated on a fine-grained permission from the permissions matrix. Fine while the role set is small;
  revisit if role management should be delegable independently of the Admin role.
