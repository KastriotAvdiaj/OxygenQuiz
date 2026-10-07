# The Teacher role

> **What it is:** a role, on top of `User`, for people who play Associations with a class: it lets
> them host a board on one screen for 2–4 Teams and keep Classes — something a SuperAdmin can also
> do without the role (§1.1)
> ([`../quiz/classroom-plan.md`](../quiz/classroom-plan.md)). It gives **no authority over other
> accounts** — no admin dashboard, no role or user management.

---

## 1. What Teacher is, and is not

- **Seeded** like the other roles (`RoleSeeder`, Id 4, migration `AddTeacherRole`), held alongside
  `User`.
- **Not elevated.** `RoleRules.IsElevated` is Admin or SuperAdmin only. So an Admin may grant,
  remove and delete Teachers ([`user-role-management.md`](user-role-management.md) §1.1), and a
  Teacher invite code has none of the elevated rails ([`invite-code-system.md`](invite-code-system.md)).
  The old definition — "anything but `User`" — would have made a Teacher undeletable by an Admin.
- `RoleRules.IsExtraRole` is the other question: "does a grant of this add anything?" — every role
  but `User`. Invite codes use it to decide whether a code carries a role at all.

### 1.1 Who may host: Teacher or SuperAdmin, not Admin

Hosting and Classes are open to **`RoleRules.HostRoles` — Teacher and SuperAdmin**. A SuperAdmin
hosts without holding Teacher; an **Admin does not**, and has to be granted Teacher like anyone else
(decided 2026-10-05). Admin is a moderation role, and hosting stays a capability a person is given,
not something that comes with moderating.

- **Server:** `ClassesController` and `HostedGamesController` are
  `[Authorize(Roles = RoleRules.HostRoles)]`; `HostedGameHub.JoinAsController` uses
  `RoleRules.CanHost(ClaimsPrincipal)`. Ownership is unchanged — a SuperAdmin sees only their own
  Classes and games, never a Teacher's.
- **Client:** `HOST_ROLES` / `canHost` in `src/lib/authorization.tsx` mirror it — the Classroom nav
  items, **Host a board** in the account drawer, and **Host for a class** in the start dialog.
- **Nothing to ask for:** a SuperAdmin's `/api/teacher-access/mine` has `canRequest: false`, a
  request is `409` ("You can already host boards."), and the account panel hides *Teacher access*
  for them. `isTeacher` still means "holds the role", so it stays false.

## 2. Getting it

Three ways, all ending in the same role:

1. **An Admin grants it** in the Users table — the existing role editor; the role list is
   data-driven, so Teacher is simply there.
2. **An invite code carries it** (`GrantedRoleId`), minted in bulk if wanted.
3. **The user asks** — *Teacher access* in the account panel (`TeacherAccessSection`), with an
   optional note (school, subject). An Admin answers on **Dashboard → Teacher Requests**.

### 2.1 The request

`TeacherAccessRequest` (Pending → Approved | Declined), `TeacherAccessService`,
`/api/teacher-access` (the user) and `/api/admin/teacher-requests` (Admin, SuperAdmin):

- **One open request at a time**, and none for someone who is already a Teacher — `409`.
- **Approving** grants the role through `IUserService.SetUserRolesAsync`, the Users table's own
  path, so the escalation gate, permission-cache eviction and `UserRolesChanged` audit are the same.
  The user's other roles are kept.
- **Declining** takes an optional reason, shown to the user. They may ask again **30 days** after
  the decline (`RetryAfterDecline`); before that, `409` with the date.
- **The user is notified either way** (in-app notification). A request can be answered once.
- Audited: `TeacherAccessRequested`, `TeacherAccessApproved`, `TeacherAccessDeclined`.

The JWT carries roles, so a newly approved Teacher sees the Classroom section after their token
refreshes; the approval notification says so.

## 3. Teachers and the Associations preview

While Associations is in preview it is visible to Admin, SuperAdmin **and Teacher** — a Teacher
can't host a board they can't see. One flag, `ICurrentUserService.CanSeePreviewFormats`
(`RoleRules.PreviewFormatRoles`), replaces `IsAdmin` at every preview check; the frontend's
`useFormatAvailable` mirrors it. See [`../quiz/associations.md`](../quiz/associations.md) §0.

## 4. Tests

`QuizAPI.Tests/Classroom/TeacherRoleTests.cs` — who may host (Teacher and SuperAdmin, not Admin
or User; a SuperAdmin can't ask for the role), Teacher is not elevated, an Admin may delete one,
Teacher codes mint in bulk without rails, the request lifecycle (one open request, approval keeps
other roles and notifies, the 30-day wait, a Teacher can't ask, the admin list order).
`PreviewFormatAccessTests.ATeacher_SeesTheBoard_InTheCatalogue_SearchAndById`.
