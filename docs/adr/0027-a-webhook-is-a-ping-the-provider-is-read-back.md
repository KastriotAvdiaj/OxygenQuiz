# 27. A webhook is a "something changed" ping; Paddle is always read back

Date: 2026-10-10
Status: Accepted

## Context

Phase 2 of paid plans ([`../proposals/paid-plans-and-payments.md`](../proposals/paid-plans-and-payments.md))
wires Paddle as the payment provider. Paddle notifies the API of subscription changes with a
webhook — `POST /api/billing/webhooks/paddle` — carrying a JSON payload that describes what
changed.

The obvious build reads `UserSubscription`'s fields straight off that payload. Two things make
that the wrong call. Webhooks arrive late, more than once for the same event, and out of order —
a `subscription.canceled` can arrive before the `subscription.updated` that preceded it. Trusting
whichever payload lands last means the stored state depends on network timing, not on what Paddle
actually believes. And the payload is attacker-reachable: anything the API derives from it
(a user id, a plan, a status) has to be independently verified or it becomes something a forged
request could set.

A second, smaller question followed from the first: what does "this event was already handled"
mean, given a sync can itself fail (a transient DB error, Paddle's API timing out) after the event
has been recorded?

## Decision

**A webhook is a signal to re-fetch, never a source of field values.** `PaddleWebhookController`
verifies the `Paddle-Signature` header, then calls `ISubscriptionSyncService.SyncAsync` with only
the subscription *id* taken from the payload. `SubscriptionSyncService` calls
`IBillingProvider.GetSubscriptionAsync` and writes `UserSubscription` from *that* response.
`custom_data.userId` — the only identity the webhook needs to resolve — comes from the
subscription Paddle returns, never from the webhook body. The same `SyncAsync` is the daily
`BillingReconciliationJob`'s read-back and the Fake provider's checkout-time upsert: one upsert
path, three callers, so dev/CI exercises the real entitlement logic with no Paddle account.

**"Already handled" means processed, not merely received.** `BillingWebhookEvent.ProcessedAt` is
null until a sync for that event id succeeds. A duplicate delivery of an already-processed event
id is a no-op (`200 OK`, nothing re-run). A delivery whose sync failed stays unprocessed, so
Paddle's own retry of the same event id tries again rather than being silently swallowed as
"seen before."

**A bad signature writes nothing and answers with a bare 401** — not a thrown exception through
`GlobalExceptionHandler`, which would serialize a response body and confirm to a prober that
something is listening at that path with that shape.

## Consequences

- Webhook handling has no ordering requirement to get right. `subscription.canceled` arriving
  before `subscription.updated` converges on the correct state anyway, because each one triggers
  the same read-back rather than applying its own payload.
- Every sync costs one extra call to Paddle's API, on every webhook and once a day per live
  subscription in the reconciliation sweep. Accepted: Paddle's webhooks are the common case and
  the reconciliation job runs once a day, so the added API traffic is small next to the
  correctness it buys.
- A subscription this app has never heard of (first webhook for a brand-new purchase) upserts a
  new `UserSubscription` row the same way an update does — `SyncAsync` doesn't need to know in
  advance whether the row exists.
- The reconciliation job is a true safety net, not a workaround for ordering bugs: it exists only
  to catch a webhook that never arrived at all (a delivery failure on Paddle's side, an outage).
