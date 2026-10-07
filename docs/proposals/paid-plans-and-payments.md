# Proposal: paid plans, and how the money is taken

**Status: open — provider decided (Paddle, 2026-10-07), tiers and prices not.** Nothing
implemented. Written 2026-10-07. What has to exist *around* a paid launch (terms, privacy, cookies,
age) is a separate proposal:
[`legal-and-compliance-for-launch.md`](./legal-and-compliance-for-launch.md).

A teacher in Prishtina has hosted three Associations boards for her class on the free account. She
wants a fourth Class, more than two AI generations a day, and the history of every game. Today
there is nothing she can pay for. And if she could, OxygenQuiz has no way to take the money:
Stripe does not onboard businesses in Kosovo. This proposal covers both halves. What each plan
gets and costs (§3). How payment works, as a provider and as code (§4–§7).

---

## 1. What happens today

**One commercial seam exists, and it was built for exactly this.**
[`IAiQuotaPolicy`](../../OxygenBackend/QuizAPI/Services/Ai/IAiQuotaPolicy.cs) answers "how many
generations today" and says in its own doc comment that paid plans are "a second implementation
reading a subscription, with no caller and no schema touched". It is registered once, in
`Program.cs`:

```csharp
builder.Services.AddScoped<QuizAPI.Services.Ai.IAiQuotaPolicy, QuizAPI.Services.Ai.ConfigAiQuotaPolicy>();
```

```csharp
public async Task<int?> GetDailyLimitAsync(Guid userId, CancellationToken ct = default)
{
    var user = await _users.GetByIdAsync(userId, tracked: false, ct);
    var isStaff = user?.UserRoles
        .Any(ur => ur.Role is not null && UnlimitedRoles.Contains(ur.Role.Name)) == true;
    return isStaff ? null : Math.Max(0, _options.DefaultDailyQuota);   // 2
}
```

The wizard already reads the limit from `GET /quiz/ai-quota` and renders "N of M left today", so
the frontend learns a new limit with **no change**.

Everything else a plan might limit has no seam yet:

| Lever | Where it is decided today | Server-enforced? |
|---|---|---|
| AI generations / day | `ConfigAiQuotaPolicy` → `Ai:DefaultDailyQuota` = **2** | Yes |
| Questions per AI generation | `Ai:MaxQuestionsPerGeneration` = 15 (global) | Yes |
| AI spend | `Ai:DailyBudgetUsd` = 2, `Ai:MonthlyBudgetUsd` = 25, **global across all users** | Yes |
| Quizzes a user may own | **No limit** | — |
| Lobby size | [`create-lobby-dialog.tsx`](../../src/pages/Quiz/Multiplayer/components/create-lobby-dialog.tsx) clamps 2–10 | **No** — see below |
| Hosting a board, Classes | `RoleRules.HostRoles` (Teacher, SuperAdmin), role granted on approval | Yes, as a role |
| Students per Class | `Class.MaxStudents` = 40 in [`ClassService`](../../OxygenBackend/QuizAPI/Services/Classroom/ClassService.cs) | Yes |
| Classes per Teacher | No limit | — |
| Upload sizes | Constants in `FileService` (image 5 MB, audio 20 MB, video 100 MB) | Yes |
| Signup | `Signup:RequireInviteCode` = **true** in `appsettings.json` | Yes |

**The lobby cap is a client-side suggestion.**
[`QuizHub.CreateSession`](../../OxygenBackend/QuizAPI/Hubs/QuizHub.cs) passes the caller's
`maxPlayers` straight into the session manager. The only check is in
[`InMemoryQuizSessionManager`](../../OxygenBackend/QuizAPI/Services/QuizSessionServices/InMemoryQuizSessionManager.cs):
`session.MaxPlayers > 0 && Participants.Count >= MaxPlayers`. So a crafted hub call with `0`
makes a lobby with no limit at all. Under a paid plan this becomes "lobby size is a paid feature
anyone can take for free". Fix it first (also logged in `known-issues.md`).

**Quiz creation has one chokepoint.** Three paths create a quiz:
`QuizService.CreateQuizAsync` (manual), `QuizService.CreateAiQuizAsync` (AI import), and
`AssociationBoardService` (a board). All three persist through `QuizRepository.AddAsync`. A
count of owned quizzes is therefore one check in each of the three services, with one shared
helper.

**The constraint that shapes the payment half: the business is in Kosovo.** As far as we know,
Stripe has no account for a Kosovo-based business. Dodo Payments lists Kosovo as unsupported, and
Lemon Squeezy does not list it for bank payouts. The usual indie route of "Stripe Checkout plus a
webhook" is therefore closed. Whatever takes the money also has to be the **Merchant of Record**.
Selling to EU consumers means charging and filing EU VAT per buyer country. A Merchant of Record
does that for you.

**The constraint that shapes the AI half: you cannot sell quota on a free vendor tier.** Groq's
free tier has a daily request limit for the whole account, so every user shares it. A paid user
promised 15 generations a day can be refused because free users drained the vendor first. The
same is true of Gemini's free tier. As far as we know, Gemini's terms also require the paid tier
for apps serving EEA/UK users. Check this before switching vendor. Paid plans that include AI
need a paid vendor tier first.

---

## 2. Options

### 2.1 What to sell

| Option | Sells | Cost |
|---|---|---|
| **A. Usage only** — AI quota packs | Generations | Lowest build cost, but AI costs us ~$0.003 a generation, so there is little to charge for. |
| **B. One "Pro" plan** | Everything | Simple. But a quiz-night host and a teacher want different things. |
| **C. Plans by audience** — Free / Plus / Teacher (School later) | Capacity and workflow | One more price to keep. Matches who actually pays in this market: teachers. |

### 2.2 Who takes the money — decided: Paddle

| Provider | Kosovo seller? | Merchant of Record? | Fee | Verdict |
|---|---|---|---|---|
| Stripe | No | No | ~1.5% + €0.25 (EU cards) | Not available |
| Stripe via a company abroad | Yes, as that company | No — you file VAT | Stripe + €50–150/month accounting | Only worth it at a few thousand €/month in revenue |
| A friend's Stripe account | — | — | — | Rejected: against Stripe's identity rules, and the balance can be frozen for up to ~120 days |
| Kosovo bank card gateway | Yes | No — you file EU VAT (non-Union OSS) | ~1.5–3%, ask your bank | Possible later, for local cards only |
| **Paddle** | **Yes** — not on its unsupported list | **Yes** | **5% + $0.50**, no monthly fee | **Chosen** |
| Lemon Squeezy / Dodo / Polar | No or doubtful | Yes | ~5% + $0.50 | Payout risk |

Paddle's fee is flat, so it hurts small prices. It takes about 34% of €1.50, 16% of €3.99, and
6–7% of €19–49. That is why §3 leans on annual billing.

---

## 3. Recommendation: the tiers

### 3.1 Two rules first

- **Free keeps what a free user has today, except where noted in §3.3.** Paid plans add on top.
  Taking things back from the first users loses them, and spoils the portfolio story too.
- **A downgrade never deletes.** When a plan ends, everything made under it stays readable,
  editable and playable. Only *creating more* above the free limit is blocked. A user who lapses
  with 40 quizzes keeps all 40 but can't make a 41st until they delete some. No expiry job and no
  data loss, so a lapsed card is never an emergency.

### 3.2 The plans

| | **Free** | **Plus** | **Teacher** |
|---|---|---|---|
| For | Everyone | Quiz-night hosts, creators | Teachers running a class |
| Monthly | €0 | **€3.99** | **€6.99** |
| Annual | €0 | **€29** (≈ 40% off) | **€49** (≈ 42% off) |
| Western Balkans (annual only) | €0 | **€19** | **€29** |
| AI generations / day | 2 | 10 | 15 |
| Quizzes you can own | 25 *(see §3.3)* | Unlimited | Unlimited |
| Lobby size | 10 | 20 | 40 |
| Host mode (boards for a class) | Approved Teachers | Approved Teachers | ✓ — role granted on purchase (§5.1) |
| Classes | 1 | 1 | Unlimited |
| Hosted-game history | Last 10 | Last 10 | All, with CSV export |
| Reports + export (CSV/XLSX) | — | ✓ | ✓ |

How ready each perk is:

| Perk | Effort | Why |
|---|---|---|
| AI quota (10 / 15 a day) | **Trivial** | A second `IAiQuotaPolicy`; the UI already shows the limit |
| Quiz limit | **Small** | One counting helper, called from the three create paths |
| Lobby size | **Small server, medium UI** | Hub clamp is a few lines; the roster UI and SignalR are only proven at ≤10, so 20/40 needs a layout pass and a load test |
| Classes limit | **Small** | One count in `ClassService` |
| Reports | **Small** | Built but unshipped ([`reports.md`](../quiz/reports.md)) — a route change plus a gate |
| Hosted-game history limit + export | **Medium** | New query limit and export; the export framework (`IDataExportService`) exists |

**Why these numbers.** Competitors' annual teacher plans cluster at €35–€65: Quizlet Plus for
Teachers about $36, Blooket Plus and Gimkit Pro about $60, Kahoot's entry tier about $36. At the
current Groq rates and a full `MaxOutputTokens`, one generation costs at most about $0.003. A
Teacher using all 15 every day costs ~$1.35 a month, against ~€3.84 net of fees on the annual
price. Regional prices are annual-only because Paddle's $0.50 would take a quarter of a €1.99
month.

### 3.3 The one place Free would lose something: a quiz cap

There is no limit on quizzes today, so "unlimited quizzes" can only be a paid perk if Free gets a
cap. That breaks the first rule in §3.1, so it needs a deliberate call:

- **For a cap:** it's the perk people understand most easily, and it stops one account filling
  the database.
- **Against:** quizzes are what fill the public catalogue, so capping the people who create them
  caps the content that brings players in.
- **If capped:** make it generous (25) and count **owned, non-deleted** quizzes. Existing users
  over the cap keep everything (§3.1); they just can't add more. Soft-deleting a quiz frees a
  slot. Staff are exempt.

My recommendation is to launch **without** the cap and add it only if storage or abuse becomes
a real problem. It's a one-line `PlanCatalog` change at any time.

### 3.4 Not at launch

Free trials (the Free tier is the trial), coupons, lifetime deals, and **School** plans (seats,
invoicing, a school admin). Build School when a school asks. Until then, a pilot school gets
manually granted Teacher plans (§5.2, `Provider = Manual`).

**Staff** (Admin, SuperAdmin) keep today's behaviour: no daily AI count, every budget cap still
applies, and no plan needed.

---

## 4. Answer to "how hard is it to give a paying user more?"

**Not hard. Most of the work is the payment plumbing, not the perks.** Once one
`IEntitlementService` exists (§5.1), each perk is a lookup at a single, already-known place:

```csharp
// AI: the whole perk — replaces ConfigAiQuotaPolicy's registration in Program.cs
public async Task<int?> GetDailyLimitAsync(Guid userId, CancellationToken ct)
    => (await _entitlements.GetAsync(userId, ct)).AiDailyGenerations;

// Quizzes: one helper, called by CreateQuizAsync, CreateAiQuizAsync and AssociationBoardService
var limit = (await _entitlements.GetAsync(userId, ct)).MaxOwnedQuizzes;
if (limit is int max && await _quizzes.CountOwnedAsync(userId, ct) >= max)
    throw new PlanLimitException(PlanLimit.Quizzes, max);

// Lobby: in QuizHub.CreateSession, before the session manager
var cap = (await _entitlements.GetAsync(GetUserId())).MaxLobbyPlayers;
maxPlayers = Math.Clamp(maxPlayers, 2, cap);
```

Rough effort, in focused working days for one developer who knows this codebase:

| Work | Days |
|---|---|
| Phase 0 — lobby clamp, signup readiness | 1 |
| Phase 1 — entitlements, perks enforced, manual grants, upgrade prompts | 4–6 |
| Phase 2 — Paddle: checkout, webhook, read-back, portal, reconciliation | 5–7 |
| Phase 3 — Teacher-on-purchase, closure handling, reports, lobby UI for 20/40 | 3–5 |
| Legal pages, footer, signup consent ([separate proposal](./legal-and-compliance-for-launch.md)) | 2–3 |
| **Total** | **≈ 3–4 weeks** |

Paddle's account approval runs in parallel and needs the legal pages live first.

---

## 5. Architecture

### 5.1 Plans grant entitlements, not roles

A plan answers "how much". A role answers "who may". The quota seam already makes that split
(its doc comment calls modelling quota as a role "a pricing decision in the permissions system").
This proposal extends the split to every lever:

```csharp
public enum PlanTier { Free, Plus, Teacher }

public sealed record Entitlements(
    PlanTier Plan,
    int?     AiDailyGenerations, // null = no daily count (staff)
    int?     MaxOwnedQuizzes,    // null = unlimited
    int      MaxLobbyPlayers,
    int?     MaxClasses,         // null = unlimited
    int?     HostedGameHistory,  // null = all
    bool     CanExportReports);

public interface IEntitlementService
{
    Task<Entitlements> GetAsync(Guid userId, CancellationToken ct = default);
    void Evict(Guid userId);     // on every subscription change
}
```

- **The limits live in code.** One `PlanCatalog` class maps each tier to its `Entitlements`.
  They are product decisions and need tests. Paddle price ids live in config.
- **Cached per user in `IMemoryCache`**, like the permission cache, and evicted by the webhook
  path.
- **Not in the JWT.** A token would carry a stale plan until it refreshed, so a purchase would
  "not work" for up to a token lifetime. The client reads `GET /api/me/entitlements`.
- **Staff** get `AiDailyGenerations = null` and the highest caps, from the same service. That
  keeps "who is staff" inside the one implementation.

**The one exception:** buying Teacher **grants the Teacher role** if the buyer doesn't have it. It
goes through `IUserService.SetUserRolesAsync`, like an approved request, and is audited as
`TeacherAccessGrantedByPurchase`. It is **one-way**: cancelling does not remove the role, so
permissions never change because a card failed. A lapsed Teacher falls back to the free Teacher
limits.

### 5.2 Data model (migration `AddBilling`)

```
UserSubscription
  Id                      Guid PK
  UserId                  FK → Users
  Plan                    Plus | Teacher
  Status                  Trialing | Active | PastDue | Paused | Canceled
  Provider                Paddle | Manual | Fake
  ProviderCustomerId      string?
  ProviderSubscriptionId  string?   unique
  ProviderPriceId         string?
  Interval                Month | Year | None (manual)
  CurrentPeriodEnd        DateTime?  (null = manual grant with no end)
  CancelAtPeriodEnd       bool
  GrantedByUserId         Guid?      (manual grants)
  UpdatedFromProviderAt   DateTime

BillingWebhookEvent
  EventId      string PK   -- Paddle's event_id: idempotency
  EventType    string
  OccurredAt   DateTime
  ReceivedAt   DateTime
  ProcessedAt  DateTime?
  Error        string?

AiGenerationUsage
  + PlanAtGeneration  PlanTier   -- §5.6
```

`Provider = Manual` lets an admin grant a plan from the Users table. This is useful from day one:
for testing in production, for teachers you want on board, and for a school pilot.

### 5.3 The effective plan is computed, never stored

```
effective plan = Plan  if Status ∈ {Active, Trialing, PastDue}
                       or (Status = Canceled and now < CurrentPeriodEnd)
                       or (Provider = Manual and (CurrentPeriodEnd is null or now < it))
                 Free  otherwise
```

Nothing has to run at period end for a plan to lapse. `PastDue` keeps its entitlements while
Paddle retries the card, so dunning runs on Paddle's schedule.

### 5.4 Checkout: the server opens the transaction, so the user id can't be forged

```mermaid
sequenceDiagram
    participant U as Browser (/pricing)
    participant A as API
    participant P as Paddle
    U->>A: POST /api/billing/checkout { plan, interval }
    A->>P: POST /transactions { items:[priceId], custom_data:{ userId }, customer email }
    P-->>A: transaction id
    A-->>U: { transactionId }
    U->>P: Paddle.Checkout.open({ transactionId })
    P-->>U: checkout.completed  (UI only; grants nothing)
    U->>A: poll GET /api/me/entitlements (≈30s, then "we'll email you")
    P->>A: webhook (subscription.created / transaction.completed)
    A->>A: verify → record event → read subscription back → upsert → evict cache → audit
    A-->>U: entitlements now Plus/Teacher
```

The API creates the transaction with the caller's id from the JWT. If the browser put
`customData.userId` on the checkout itself, anyone could attach their payment to another
account. The webhook reads `custom_data.userId` and **never** matches on email: the email at
Paddle can differ, and an email match is how one account's payment unlocks another's.

### 5.5 A webhook is a "something changed" ping; Paddle is read back

`POST /api/billing/webhooks/paddle`, anonymous, with its own rate-limit policy:

1. **Verify the signature.** `Paddle-Signature: ts=…;h1=…` is HMAC-SHA256 over `"{ts}:{rawBody}"`
   with the endpoint secret. Compare in constant time and reject a stale `ts`. Read the raw body
   (`EnableBuffering`) before any model binding.
2. **Insert the `BillingWebhookEvent`.** A duplicate `EventId` means it was already handled, so
   return 200.
3. **Fetch the subscription from Paddle's API** and upsert `UserSubscription` from *that*, not from
   the payload.
4. `Evict(userId)`, audit (`SubscriptionStarted` / `Changed` / `Canceled`), and an in-app
   notification.

Step 3 is the whole design. Webhooks arrive late, twice, and out of order. Reading back current
state makes every event idempotent and every order correct, for one API call. A **daily Hangfire
job** (`BillingReconciliationJob`, registered beside the existing recurring jobs) does the same
read-back for every non-Free subscription. It catches a webhook that never arrived.

"Manage subscription" in the account panel calls `POST /api/billing/portal`. The API creates a
Paddle customer-portal session and the browser follows the URL. Cancel, card change and invoices
all happen at Paddle.

### 5.6 Where each limit is enforced

| Limit | Enforcement point | Refusal |
|---|---|---|
| AI / day | `EntitlementAiQuotaPolicy : IAiQuotaPolicy`, replacing `ConfigAiQuotaPolicy` in `Program.cs` | Existing `QuotaExceeded` |
| Quizzes owned | `QuizService.CreateQuizAsync`, `CreateAiQuizAsync`, `AssociationBoardService` create | `PlanLimitException` |
| Lobby size | `QuizHub.CreateSession`, clamped to `[2, MaxLobbyPlayers]` | Clamped, not refused |
| Classes | `ClassService` create | `PlanLimitException` |
| History / export | Hosted-games read, export endpoint | `PlanLimitException` |
| Reports | `ReportsController` | `PlanLimitException` |

`PlanLimitException` joins the typed exceptions in `Exeptions/AppExceptions.cs`.
`GlobalExceptionHandler` maps it to **403** with `code: "PlanLimitReached"`, the limit, and the
plan that lifts it. Every endpoint that throws it gets the same response, and the frontend shows
one upgrade prompt from one place. The client mirrors limits from `useEntitlements` only to warn
early. As everywhere else in this repo, the API is the gate.

**Split the AI budget caps by plan.** Today `DailyBudgetUsd` and `MonthlyBudgetUsd` sum the cost
of **every** user's generations. If free users exhaust them, paying users get `FeatureDisabled`.
Using `PlanAtGeneration`, apply the existing caps to **Free** spend only. Give paid spend its own,
higher ceiling (`Ai:PaidMonthlyBudgetUsd`) as a runaway-loop backstop.

### 5.7 Account closure

[`AccountClosureService`](../../OxygenBackend/QuizAPI/Services/AccountClosure/AccountClosureService.cs)
must deal with a live subscription. Closing **schedules cancellation at period end** at Paddle.
Restoring within the 30-day grace period ([ADR 0012](../adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md))
un-schedules it if the period hasn't ended. Anonymisation keeps the `UserSubscription` rows,
because they are financial records, but nothing on them identifies the person. Name, email and
invoices live at Paddle, the Merchant of Record.

### 5.8 Configuration, and a fake provider

```jsonc
"Billing": {
  "Enabled": false,
  "Provider": "Paddle",            // "Paddle" | "Fake" (Fake refused in Production)
  "Environment": "sandbox",        // "sandbox" | "production"
  "ClientToken": "",               // public, sent to the browser for Paddle.js
  "Prices": {                      // Paddle price ids, per plan × interval (× region if used)
    "PlusMonthly": "", "PlusYearly": "", "TeacherMonthly": "", "TeacherYearly": ""
  }
  // ApiKey and WebhookSecret are secrets: env vars / user-secrets only
}
```

`IBillingProvider` has `PaddleBillingProvider` (typed `HttpClient` against `api.paddle.com` or
`sandbox-api.paddle.com`) and `FakeBillingProvider`. With the fake, `/pricing` completes a
"purchase" instantly through the same upsert path as the webhook. Development, CI and the E2E
suite exercise the real entitlement logic with no Paddle account. Following
[ADR 0004](../adr/0004-ai-misconfiguration-disables-the-feature.md), a misconfigured provider
**turns checkout off** (the pricing page says "coming soon"); it does not crash startup.

---

## 6. File-level plan

### Phase 0 — fixes that stand on their own (≈1 day)

- [ ] `QuizHub.CreateSession`: clamp `maxPlayers` to `[2, 10]` (later `[2, MaxLobbyPlayers]`); unit test for `0`, `-1`, `1000`
- [ ] Remove the `known-issues.md` entry for it

### Phase 1 — entitlements, no money (≈4–6 days)

Backend:
- [ ] `Models/Billing/` — `PlanTier`, `SubscriptionStatus`, `UserSubscription`, `BillingWebhookEvent`
- [ ] `ApplicationDbContext` — DbSets and config; migration `AddBilling` (also `AiGenerationUsage.PlanAtGeneration`)
- [ ] `Repositories/ISubscriptionRepository` + implementation (no `DbContext` outside repositories)
- [ ] `Services/Billing/PlanCatalog.cs`, `Entitlements.cs`, `IEntitlementService` + `EntitlementService` (cache, effective-plan rule §5.3)
- [ ] `Services/Ai/EntitlementAiQuotaPolicy.cs`; swap the registration in `Program.cs`; delete `ConfigAiQuotaPolicy` ("replace, don't extend", as its comment says)
- [ ] `PlanLimitException` in `Exeptions/AppExceptions.cs`; mapping in `GlobalExceptionHandler`
- [ ] Enforcement points from §5.6 (quiz count only if §3.3 says yes)
- [ ] `AiQuotaService`: budget caps over Free spend only; record `PlanAtGeneration`
- [ ] `GET /api/me/entitlements`
- [ ] Admin: `PUT /api/admin/users/{id}/plan` (Manual grant/revoke), audit `PlanGrantedManually`

Frontend:
- [ ] `src/lib/query-keys.ts` — `entitlementKeys.all`; `src/lib/api/entitlements.ts` — `useEntitlements`
- [ ] `src/common/PlanLimitNotice.tsx` — the one upgrade prompt; `Api-client.ts` routes a `PlanLimitReached` 403 to it
- [ ] `quota-note.tsx` — "Upgrade for 10 a day" when at the limit
- [ ] `create-lobby-dialog.tsx` — max from `useEntitlements`, not the literal 10
- [ ] Classes page — the count against the limit
- [ ] `/pricing` page (public, linked from landing and account drawer) — Phase 1 shows plans with "coming soon"
- [ ] Admin Users table — plan column and grant dialog

Tests: the effective-plan table row by row; `PlanCatalog`; each enforcement point at the limit
and over it; the `PlanLimitReached` response shape; `EntitlementAiQuotaPolicy` (staff → null).

### Phase 2 — Paddle (≈5–7 days)

- [ ] `Services/Billing/IBillingProvider`, `PaddleBillingProvider`, `FakeBillingProvider`, `BillingOptions` + startup validation
- [ ] `PaddleSignatureVerifier` — tested against a recorded sandbox request
- [ ] `SubscriptionSyncService` — read back, upsert, evict, audit, notify
- [ ] `Controllers/Billing/BillingController` — `POST checkout`, `POST portal`
- [ ] `Controllers/Billing/PaddleWebhookController` — anonymous, raw body, rate-limited
- [ ] `BillingReconciliationJob` — daily Hangfire recurring job
- [ ] Frontend: `@paddle/paddle-js`, loaded **only** on `/pricing` (lazy import); checkout → poll entitlements → success state
- [ ] Account panel: `SubscriptionSection.tsx` beside `TeacherAccessSection` — plan, renews/ends, Manage
- [ ] Paddle sandbox: products, prices, webhook destination; one manual end-to-end run per event type

Tests: duplicate webhook = no-op; out-of-order pair ends in Paddle's state; a bad signature is a
401 and writes nothing. **One E2E journey (Fake provider):** a free user hits the AI limit,
upgrades on `/pricing`, and the quota note shows the new allowance.

### Phase 3 — polish (≈3–5 days, each item independent)

- [ ] Teacher role on purchase (§5.1), audit `TeacherAccessGrantedByPurchase`
- [ ] Account closure ↔ subscription (§5.7)
- [ ] Ship Reports behind `CanExportReports`
- [ ] Hosted-game history limit + CSV export
- [ ] Lobby roster layout for 20/40, plus a SignalR load test at 40
- [ ] Regional prices in Paddle (country overrides)

### Phase 4 — Schools, when asked.

---

## 7. Before go-live: outside the code

- **A legal seller.** Register the business in Kosovo and open a bank account that can receive
  Paddle's payouts. Confirm the payout method for a Kosovo bank with Paddle during onboarding. An
  accountant should confirm how Paddle payouts are taxed locally. This is not legal or tax
  advice.
- **Paddle's onboarding review** checks the live domain. Have the pricing page, Terms, Privacy
  Policy, Refund Policy and contact details live first — see
  [`legal-and-compliance-for-launch.md`](./legal-and-compliance-for-launch.md).
- **Open signup.** Flip `Signup:RequireInviteCode` on purpose, after checking email verification
  and rate limits under public signup.
- **A paid AI vendor tier** (§1), with `Ai:Vendors` costs that match it.

---

## 8. Open questions

- **The free quiz cap (§3.3)** — recommended: no cap at launch.
- **Plus on day one, or Free + Teacher only?** Teachers are the likely payers. Plus costs little
  to add once entitlements exist.
- **Lobby sizes of 20/40** are unverified until load-tested.
- **When Associations leaves preview:** does the Duel stay free? This proposal says yes.

## 9. ADRs this would produce, if accepted

- *Plans grant entitlements, never roles* (with the one-way Teacher grant as the exception).
- *A webhook is a ping; the provider is read back.*
- *A downgrade never deletes.*
- *Paddle as Merchant of Record because the seller is in Kosovo.*
