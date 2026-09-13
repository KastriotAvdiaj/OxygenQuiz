# 0013 — A closing account keeps its email; an admin-deleted one does not

**Date:** 2026-09-13
**Status:** Accepted
**Supersedes:** nothing. Extends [`0012`](0012-account-deletion-is-anonymisation-after-a-grace-period.md).

## Context

Closure (ADR 0012) soft-deletes the account for thirty days and restores it if the person signs in.
`EmailExistsAsync` — the whole of signup's answer to "is this address taken?" — ran through the
global `!IsDeleted` filter, so **the address read as free the moment its owner closed the account**.

That is not merely untidy. Signing in finds a closing account *by email*. If someone else registers
that address during the grace period, the lookup finds their row instead, and the recovery the whole
grace period exists to provide is gone — silently, and for the person least able to diagnose it.

The same gap predated closure: an admin-deleted account's address was also immediately reusable.
Fixing one raised the question of the other, and the two turn out to want different answers.

## Decision

**An address is unavailable to signup when its account is live, or closing** — `DeletionRequestedAt`
set and `AnonymisedAt` null. An **admin-deleted** row does not hold its address.

**Signup says one thing for both cases it refuses:**

> Email is already in use. If this is your account, log in to recover it.

## Why

**Why closing accounts hold the address.** Without it the grace period is a promise the system can
break on someone else's behalf. Nobody re-registering an address intends this; they simply take one
that looks free.

**Why admin-deleted accounts do not.** Nothing ever anonymises those rows — the sweep only touches
closures — so counting them would take the address out of circulation *permanently*, with no
mechanism to release it. One mistaken delete would burn an address until someone edited the
database. And the reuse grants nothing: the new account is a new row, with none of the old one's
history, roles, or content. The asymmetry is not an inconsistency; it tracks a real difference
between a hold that ends by itself and one that would never end.

**Why the hold needs no release step.** Anonymisation rewrites the address to
`deleted-{guid}@deleted.invalid`, so the scrub frees the email as a side effect of doing its job.
There is nothing to remember to clean up.

**Why one message for both.** The two refusals are indistinguishable, so signup reveals nothing
about who once had an account. The second sentence is safe precisely because it is shown for a live
account too — and it is the only actionable thing to say to the person it belongs to, since logging
in is the recovery. There is no email-availability endpoint anywhere in the API, so submit is the
only place this question can be asked at all: a single bit, for one address at a time, behind the
signup form.

## Alternatives rejected

**Every soft-deleted row holds its address.** One rule instead of two, and simpler to state. It
permanently burns the address of any admin-deleted account, because nothing anonymises those. A
deletion made in error would cost that person their email address as well as their account.

**A distinct message for a closing account** ("this account is being closed — log in to restore
it"). Kinder to the person recovering, and an "is X leaving?" oracle for every address anyone cares
to type. Closure is exactly the kind of thing people do not announce.

**Release the address at deletion instead of at anonymisation**, by scrubbing the email immediately
and keeping the rest. That is anonymisation with extra steps, and it destroys the only value the
grace period has: the person's ability to sign in *with that address* and get their account back.

## Consequences

- Someone who closes their account and then tries to sign up again with the same address is
  refused, and told to log in — which works, and restores everything.
- An address re-registered after a closure was cancelled behaves normally: cancelling clears
  `DeletionRequestedAt`, so the row is simply live again.
- Two accounts can still exist for one address if an admin deletes one and someone registers it
  again. That is accepted, and it is not new.
- `ExternalSignupAsync` and password signup share `EmailExistsAsync`, so both paths are covered by
  the same rule. External *login* never reaches it — a provider-verified email that matches a
  closing account links to it and restores the account instead.

Behaviour: [`../auth/account-closure.md`](../auth/account-closure.md) §8.
Tests: `QuizAPI.Tests/Users/EmailReservationTests.cs`, one per state.
