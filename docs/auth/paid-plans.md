# Paid plans — a plan grants limits, the API enforces each one in one place

How plans work **today**: what Free, Plus and Teacher get, how a user's effective plan is worked
out, where each limit is enforced, and how an admin grants a plan by hand. Nobody can buy a plan
yet. Checkout with Paddle is the next step and is still a proposal:
[`../proposals/paid-plans-and-payments.md`](../proposals/paid-plans-and-payments.md). Why plans
are not roles, and why a downgrade deletes nothing, is
[ADR 0026](../adr/0026-a-plan-grants-limits-never-permissions.md).

> **Status: implemented (2026-10-10)** — plans, entitlements, enforcement, the AI budget split,
> manual grants, the pricing page (checkout says "coming soon"). Not yet: Paddle checkout and
> webhooks, Teachers' unlimited hosted-game history and its export, Reports behind a plan, regional
> prices. Lobby sizes of 20 and 40 are enforced but have not been load-tested — see
> `known-issues.md`.

---

## 1. The plans

| | Free | Plus | Teacher |
|---|---|---|---|
| Display price | €0 | €3.99 / month, €29 / year | €6.99 / month, €49 / year |
| AI quizzes a day | `Ai:DefaultDailyQuota` (2) | 10 | 15 |
| Quizzes you can own | Unlimited | Unlimited | Unlimited |
| Largest lobby | 10 | 20 | 40 |
| Classes | 1 | 1 | Unlimited |

All of it lives in [`PlanCatalog.cs`](../../OxygenBackend/QuizAPI/Services/Billing/PlanCatalog.cs),
in code, not config: a typo in a limit should fail a test, not quietly change the product. The
pricing page renders `GET /api/plans`, which reads the same class, so the page and the rules
can't disagree.

- **Free's AI allowance stays `Ai:DefaultDailyQuota`.** It was a documented config knob before
  plans existed, and turning it down in an incident shouldn't need a deploy.
- **There is no quiz cap.** Decided 2026-10-10: public quizzes are what bring players in, so the
  people making them aren't rationed. The mechanism exists (`MaxOwnedQuizzes`,
  `PlanLimitGuard.EnsureCanCreateQuizAsync`, called by all three create paths), so a cap would be
  one number.
- **Classes: Free gets one.** Before plans there was no limit. A Free host keeps every Class they
  already had (§3); only a second one is refused.
- **Staff** (Admin, SuperAdmin) aren't on a plan. They get Teacher's limits and no daily AI count
  (`PlanCatalog.ForStaff`); the AI budget caps still apply to them
  ([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md) §4a).

## 2. The effective plan is computed, never stored

A user's subscriptions are rows in `UserSubscriptions` (migration `AddBilling`). A user can have
several over time. On every read, [`EntitlementService`](../../OxygenBackend/QuizAPI/Services/Billing/EntitlementService.cs)
takes the best plan among the rows that *count* right now:

| Row | Counts while |
|---|---|
| Active, Trialing, PastDue (from a provider) | Always — a renewal date in the past is the provider's call, and PastDue is the card being retried |
| Canceled or Paused | Until `CurrentPeriodEnd`: you keep what you paid for |
| Manual grant, Active | Until `CurrentPeriodEnd`, or forever if it has none |

No row counting means Free. Nothing runs at period end: the next read simply stops counting the
row. The rule is `EntitlementService.Counts`, and the admin view uses the same method.

**Cached for a minute per user, not put in the JWT.** Every limit check reads entitlements,
including the hub on lobby create, so it can't be a query per call. Subscription writes evict the
cache explicitly. The one-minute lifetime covers the two changes that don't: a period ending, and
a role change making someone staff. A token would carry a stale plan until it refreshed. The
client reads `GET /api/plans/me` instead.

## 3. Where each limit is enforced

| Limit | Enforced in | When refused |
|---|---|---|
| AI quizzes a day | [`EntitlementAiQuotaPolicy`](../../OxygenBackend/QuizAPI/Services/Ai/EntitlementAiQuotaPolicy.cs) (the `IAiQuotaPolicy` seam; it replaced `ConfigAiQuotaPolicy`) | The existing `QuotaExceeded` |
| Quizzes owned | `QuizService.CreateQuizAsync`, `CreateAiQuizAsync`, `AssociationBoardService.CreateAsync` → `PlanLimitGuard` | `PlanLimitReached` 403 |
| Classes | `ClassService.CreateAsync` → `PlanLimitGuard` | `PlanLimitReached` 403 |
| Lobby size | `QuizHub.CreateSession`, clamped to `[2, MaxLobbyPlayers]` | Clamped, not refused |

**Only creating more is refused** (ADR 0026). A Teacher whose plan lapses with five Classes keeps,
edits and hosts from all five. Every check runs before anything is written.

**One refusal shape.** [`PlanLimitException`](../../OxygenBackend/QuizAPI/Exeptions/AppExceptions.cs)
maps in `GlobalExceptionHandler` to a 403 `ProblemDetails` with extensions:

```json
{ "title": "Your plan includes one class. Upgrade to Teacher to keep more.", "status": 403,
  "code": "PlanLimitReached", "limit": "classes", "max": 1, "upgradeTo": "Teacher" }
```

`upgradeTo` is the cheapest plan that raises *that* limit (`PlanCatalog.CheapestAbove`). Plus
doesn't add Classes, so a Class refusal names Teacher. `Api-client.ts` recognises the shape
(`readPlanLimit`) and shows an info toast with a "See the Teacher plan" link to `/pricing`. It
shows the toast even for requests that set `skipErrorToast`, since those callers have no other way
to offer the upgrade.

**The client mirrors limits to warn early, never to decide.** `useMyPlan` feeds the lobby
dialog's stepper, the Classes page (New is disabled at the limit, with the reason and a link) and
the AI quota note. When today's allowance is spent, the note names the next plan's allowance.
`cheapestUpgrade` in `src/lib/api/plans.ts` mirrors `CheapestAbove`.

## 4. Two AI budget pools

`Ai:DailyBudgetUsd` / `Ai:MonthlyBudgetUsd` used to sum every user's spend. With paid plans, free
users exhausting them would switch AI off for the people paying for it. So each usage row records
`PlanAtGeneration`, and spend is budgeted in two pools (`AiSpendPool`):

| Pool | Whose rows | Caps |
|---|---|---|
| Free | Free plan, staff, the category-palette proposer | `Ai:DailyBudgetUsd` (2), `Ai:MonthlyBudgetUsd` (25) |
| Paid | Plus and Teacher | `Ai:PaidDailyBudgetUsd` (6), `Ai:PaidMonthlyBudgetUsd` (60) |

Paid spend is already bounded by quota × paying users × price, so the paid caps are a backstop
against a runaway loop, not rationing. `AiQuotaService.IsOverBudgetAsync(userId)` checks the
pool of the caller's current plan. `GET /quiz/ai-quota`'s `enabled` therefore now depends on the
caller.

## 5. Manual grants

An admin can give a plan away — a teacher worth having on board, a pilot school, a test account
in production. **Dashboard → Users → (row) → Manage plan** calls
`PUT /api/plans/users/{id}/manual` with `{ plan: "Plus" | "Teacher" | null, endsAt?, note? }`
([`ManualPlanService`](../../OxygenBackend/QuizAPI/Services/Billing/ManualPlanService.cs)).

- **Same table, same rule** as a bought plan (`Provider = Manual`), so a granted plan and a paid
  one can't drift apart in what they unlock.
- **One manual row per user**, reused on every regrant. `plan: null` revokes by ending the row
  now, not by deleting it, so the table keeps the history as well as the audit log.
- **Granting Teacher grants the Teacher role** through `IUserService.SetUserRolesAsync` if the user
  can't already host. Revoking never removes the role (ADR 0026).
- **Not for system accounts** (ADR 0011): a plan on the shared guest account would give every
  anonymous visitor its limits. 403.
- Audited `PlanGrantedManually` / `PlanRevokedManually`. The user gets an in-app notification
  when the plan changes.

## 6. Endpoints

| Endpoint | Who | Returns |
|---|---|---|
| `GET /api/plans` | Anyone | The catalogue: tiers, display prices, limits, `checkoutAvailable` (false until a payment provider exists) |
| `GET /api/plans/me` | Signed in | The caller's effective plan, limits, `planEndsAt`, `cancelAtPeriodEnd` |
| `GET /api/plans/users/{id}` | Admin, SuperAdmin | That user's plan plus their manual grant |
| `PUT /api/plans/users/{id}/manual` | Admin, SuperAdmin | Grant, change or revoke |

Screens: `/pricing` (public, `src/pages/Pricing/`), **Plan** in the account panel
(`PlanSection.tsx`), and the admin dialog (`manage-user-plan.tsx`).

## 7. Tests

`QuizAPI.Tests/Billing/` — the effective-plan rule row by row, staff, caching
(`EntitlementServiceTests`); refusals and their `upgradeTo`, and that unlimited costs no count query
(`PlanLimitGuardTests`); the two budget pools (`AiBudgetPoolTests`); the 403 shape
(`PlanLimitResponseTests`); grants, the one-way role, revocation, system accounts
(`ManualPlanServiceTests`). Lobby caps per plan are in `Multiplayer/QuizHubLobbyCapTests`. On the
client, `src/lib/__tests__/plans.test.ts` covers `cheapestUpgrade` and `readPlanLimit`.
