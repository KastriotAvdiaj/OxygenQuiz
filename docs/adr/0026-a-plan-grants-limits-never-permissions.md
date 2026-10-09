# 26. A plan grants limits, never permissions — and a downgrade never deletes

Date: 2026-10-10
Status: Accepted

## Context

Paid plans ([`../auth/paid-plans.md`](../auth/paid-plans.md)) give some users more: more AI
quizzes a day, bigger lobbies, more Classes. The app already has a mechanism for "this user may do
more" — roles and `resource:action` permissions ([`../auth/user-role-management.md`](../auth/user-role-management.md)).
The obvious build was a `Plus` role and a `Teacher` plan that *is* the Teacher role, with the
permission cache doing the rest.

Two things go wrong with that. A role is binary, but almost every perk is a number (2 AI quizzes
or 10, 10 players or 40), so the numbers would end up hard-coded beside role checks anyway. And a
plan changes for reasons no role does: a card fails, a period ends, a refund happens. Tying
permissions to that means a failed renewal can lock a teacher out of the Classroom section in the
middle of the week. That is a support problem and a data problem too, if anything is keyed to
the role.

The second question is what happens to things made under a plan once it ends. A teacher on the
Teacher plan keeps five Classes, and the plan lapses. Free allows one.

## Decision

**A plan grants limits; a role grants permissions; neither does the other's job.**
`IEntitlementService` resolves a user's effective plan from their subscriptions and returns
`Entitlements`, a record of numbers. Each limit is read at exactly one enforcement point
(`EntitlementAiQuotaPolicy`, `PlanLimitGuard`, the hub's lobby clamp). Roles answer "may this
user host a board at all" and nothing more.

**One exception, and it is one-way:** granting the Teacher *plan* also grants the Teacher *role* if
the user lacks it. A plan that sells unlimited Classes to someone who can't open the Classroom
section would be a refund waiting to happen. Ending the plan never removes the role.

**A downgrade never deletes and never locks.** When a plan ends, everything made under it stays
readable, editable and playable. Only *creating more* above the new limit is refused, with a
`PlanLimitReached` 403. The teacher with five Classes keeps all five and can host from any of them,
but can't make a sixth.

**The effective plan is computed, never stored.** It is derived on read from the subscription
rows and the clock, so a plan lapses with no job running.

## Consequences

- Adding a perk is a number in `PlanCatalog` and one check at the place it's enforced — no
  migration, no role, no permission.
- Permissions never change because of billing. The only role change billing can cause is the
  one-way Teacher grant, which goes through `IUserService.SetUserRolesAsync` like every other
  role change, with the same audit entry.
- Users can sit above their plan's limits indefinitely. Counting endpoints must count, not assume
  ("at most 1 class" is false for a lapsed Teacher), and any UI that says "x of y" has to cope
  with x > y.
- Because nothing is deleted on downgrade, a lapsed plan costs no data — and so there is no data
  to lose by letting a card fail. That is deliberate: losing work is not a billing lever this
  product uses.
- Entitlements are cached for a minute and not put in the JWT, so a purchase or grant is visible on
  the next request rather than on the next token refresh.
