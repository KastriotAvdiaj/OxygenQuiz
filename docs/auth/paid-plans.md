# Paid plans — a plan grants limits, the API enforces each one in one place

How plans work **today**: what Free, Plus and Teacher get, how a user's effective plan is worked
out, where each limit is enforced, how an admin grants a plan by hand, and — since Phase 2, §8 —
how a user buys one through Paddle. The full proposal, including what's still Phase 3:
[`../proposals/paid-plans-and-payments.md`](../proposals/paid-plans-and-payments.md). Why plans
are not roles, and why a downgrade deletes nothing, is
[ADR 0026](../adr/0026-a-plan-grants-limits-never-permissions.md); why a webhook only ever
triggers a read-back, never supplies field values itself, is
[ADR 0027](../adr/0027-a-webhook-is-a-ping-the-provider-is-read-back.md).

> **Status: implemented (2026-10-10)** — plans, entitlements, enforcement, the AI budget split,
> manual grants, the pricing page, Paddle checkout + webhooks (Phase 2, §8 below), and — same
> day, as a follow-up — country-localized prices via `PricePreview()`, the overlay/one-page
> checkout variant, and a `/welcome` redirect on success. Not yet: Teachers' unlimited
> hosted-game history and its export, Reports behind a plan, and a real webhook delivery in local
> dev (needs a tunnel — see §8's "Local sandbox setup"). Lobby sizes of 20 and 40 are enforced but
> have not been load-tested — see `known-issues.md`.

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
| `GET /api/plans` | Anyone | The catalogue: tiers, display prices, limits, `checkoutAvailable`, `clientToken`, `environment` |
| `GET /api/plans/me` | Signed in | The caller's effective plan, limits, `planEndsAt`, `cancelAtPeriodEnd`, `provider` |
| `GET /api/plans/users/{id}` | Admin, SuperAdmin | That user's plan plus their manual grant |
| `PUT /api/plans/users/{id}/manual` | Admin, SuperAdmin | Grant, change or revoke |
| `POST /api/billing/checkout` | Signed in | Opens a Paddle transaction for a price; returns `transactionId` for Paddle.js |
| `POST /api/billing/portal` | Signed in | A Paddle customer-portal session URL |
| `POST /api/billing/webhooks/paddle` | Paddle (anonymous, signature-verified) | `200` once synced; `401` on a bad signature; `500` to make Paddle retry a failed sync |

Screens: `/pricing` (public, `src/pages/Pricing/`), **Plan** and **Subscription** in the account
panel (`PlanSection.tsx`, `SubscriptionSection.tsx` — the latter only when `provider === "Paddle"`),
and the admin dialog (`manage-user-plan.tsx`).

## 7. Tests

`QuizAPI.Tests/Billing/` — the effective-plan rule row by row, staff, caching
(`EntitlementServiceTests`); refusals and their `upgradeTo`, and that unlimited costs no count query
(`PlanLimitGuardTests`); the two budget pools (`AiBudgetPoolTests`); the 403 shape
(`PlanLimitResponseTests`); grants, the one-way role, revocation, system accounts
(`ManualPlanServiceTests`); HMAC verification (`PaddleSignatureVerifierTests`); the upsert —new
row, idempotent repeat, Teacher grant once and never revoked, plan change
(`SubscriptionSyncServiceTests`); the concurrent-insert race on a brand-new subscription's
first two events retries as an update instead of surfacing a 500, and a genuine second failure
still throws rather than looping (`SubscriptionRaceTests`); the webhook endpoint's
signature/idempotency/retry contract (`PaddleWebhookControllerTests`). Lobby caps per plan are
in `Multiplayer/QuizHubLobbyCapTests`.
On the client, `src/lib/__tests__/plans.test.ts` covers `cheapestUpgrade` and `readPlanLimit`.

## 8. Buying a plan (Phase 2, shipped 2026-10-10)

The architecture is [the proposal's §5](../proposals/paid-plans-and-payments.md), unchanged by
implementation; this section is what to read to find the code.

- **`IBillingProvider`** (`Services/Billing/`) is the seam: `PaddleBillingProvider` (a typed
  `HttpClient` against `api.paddle.com` / `sandbox-api.paddle.com`, per `BillingOptions.Environment`),
  `FakeBillingProvider` (dev/CI/E2E, refused in Production), `UnavailableBillingProvider`
  (`Billing:Enabled = false` — ADR 0004's "misconfigured turns the feature off"). Selected once in
  `Program.cs`.
- **`ISubscriptionSyncService.SyncAsync(providerSubscriptionId)`** is the only place a
  `UserSubscription` row is written from a provider. It reads the subscription back from
  `IBillingProvider` — never trusts a webhook payload (ADR 0027) — upserts by
  `ProviderSubscriptionId`, evicts the entitlement cache, audits
  (`SubscriptionStarted`/`Changed`/`Canceled`), notifies on a plan change, and grants the Teacher
  role on a Teacher purchase the same one-way way a manual grant does (ADR 0026).
  `PaddleWebhookController`, `BillingReconciliationJob` and `BillingController.Checkout` (for the
  Fake provider only) all call it — one upsert path, three callers. The upsert's check-then-insert
  isn't atomic: two events for a brand-new subscription (`created` and `activated`, typically
  delivered within milliseconds) can both read "no row yet" and both try to insert, so the loser
  hits `IX_UserSubscriptions_ProviderSubscriptionId`'s unique constraint. Caught once and retried
  as the update it should have been — bounded to exactly one retry, so a genuine second failure
  still surfaces rather than looping — found and fixed 2026-10-10, proven in `SubscriptionRaceTests`
  (drives the race deterministically via a mocked repository, not real Postgres timing).
- **`PaddleWebhookController`** (`api/billing/webhooks/paddle`, anonymous) verifies
  `Paddle-Signature` with `PaddleSignatureVerifier` (HMAC-SHA256, constant-time compare, 5-minute
  window) before touching the body. A `BillingWebhookEvent` row tracks each delivery by Paddle's
  own event id; `ProcessedAt` stays null until the sync for that id succeeds, so a failed sync is
  retried on Paddle's own redelivery rather than being dropped as "already seen" (ADR 0027).
- **`BillingController`** (`api/billing`, `[Authorize]`) — `POST checkout` resolves a price id
  from `(plan, interval)` via `BillingPriceCatalog` and opens the transaction with the caller's
  JWT id, never a client-supplied one; `POST portal` looks up the caller's Paddle customer id and
  opens a portal session.
- **`BillingReconciliationJob`** — a daily Hangfire job (`billing-reconciliation-daily`, 3 AM)
  that re-syncs every `Provider = Paddle` subscription, catching a webhook that never arrived.
- **Config** — `Billing:Enabled`, `Billing:Provider` ("Paddle" | "Fake"), `Billing:Environment`
  ("sandbox" | "production"), `Billing:ClientToken` (public), `Billing:Prices:{PlusMonthly,
  PlusYearly,TeacherMonthly,TeacherYearly}` are a validated `BillingOptions` (`ValidateOnStart`).
  `Billing:ApiKey` and `Billing:WebhookSecret` are secrets, read directly off configuration in
  `Program.cs` and never bound onto the options object.
- **Frontend** — `/pricing` loads `@paddle/paddle-js` only when the catalog returns a
  `clientToken` (so a Fake-provider box never calls Paddle's CDN), calls `Paddle.PricePreview()`
  once for every price id on the page (country-localized if `GET /plans` returned a
  `countryCode` — Cloudflare's `CF-IPCountry` header, treated as absent on `XX`/Tor's `T1` — else
  Paddle auto-detects from the visitor's IP) and renders only `formattedTotals`, never
  reformatted. `useCheckout()` (`src/lib/api/billing.ts`) opens
  `Paddle.Checkout.open({ transactionId, settings: { displayMode: "overlay", variant: "one-page", successUrl } })`;
  `successUrl` points at `/welcome?plan=...`, so Paddle itself redirects the browser there once
  payment completes — the Fake provider (no overlay) navigates there directly instead, since its
  checkout already upserted synchronously. `/welcome` (`src/pages/Welcome/`) is where the
  post-checkout poll of `GET /plans/me` now lives (moved off `/pricing`), with the same
  30-second "we'll email you" fallback as before. `SubscriptionSection.tsx` in the account panel
  offers "Manage subscription" only when `provider === "Paddle"`.

### Local sandbox setup

`appsettings.Development.json` ships with `Billing:Enabled: false` — it's committed, so turning
billing on there would break every fresh clone's boot the moment `BillingOptions.Validate` found
no `ApiKey`/`WebhookSecret`. Turn it on **personally**, with `dotnet user-secrets` (run from
`OxygenBackend/QuizAPI/`), bundling the non-secret values in too so the toggle stays entirely
local:

```
dotnet user-secrets set "Billing:Enabled" "true"
dotnet user-secrets set "Billing:Provider" "Paddle"
dotnet user-secrets set "Billing:Environment" "sandbox"
dotnet user-secrets set "Billing:ClientToken" "<sandbox client-side token>"
dotnet user-secrets set "Billing:Prices:PlusMonthly" "<pri_... Plus monthly>"
dotnet user-secrets set "Billing:Prices:PlusYearly" "<pri_... Plus yearly>"
dotnet user-secrets set "Billing:Prices:TeacherMonthly" "<pri_... Teacher monthly>"
dotnet user-secrets set "Billing:Prices:TeacherYearly" "<pri_... Teacher yearly>"
dotnet user-secrets set "Billing:ApiKey" "<sandbox API key, from Paddle > Developer tools > Authentication>"
```

`Billing:WebhookSecret` has no value yet — it's returned when a webhook *destination* is created
(dashboard, or `client.notificationSettings.create` with `type: "url"`), and a destination needs
a URL Paddle's servers can reach. `localhost` isn't one; a tunnel (ngrok) or a deployed URL is.
Until then, `PaddleWebhookControllerTests` and `SubscriptionSyncServiceTests` exercise that path
without a real delivery, and `BillingReconciliationJob` is the eventual catch-up once a
destination exists.
