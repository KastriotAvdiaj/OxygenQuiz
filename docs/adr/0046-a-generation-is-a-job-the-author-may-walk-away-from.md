# 46. A generation is a job the author may walk away from

Date: 2026-11-14
Status: Accepted

## Context

Generating a quiz was one HTTP request, held open for the 10–40 seconds the model takes
([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md) §3). Everything
awkward about the wait followed from that:

- **The tab had to stay.** A Back click, a refresh or a closed tab spent the quota slot and
  returned nothing, so a dialog (`LeaveGenerationDialog`, armed by `useNavigationGuard`) stood
  in the doorway and the card said "leaving now cancels it".
- **The progress was invented.** The client could not know what the server was doing, so the
  card showed a typewriter and five status lines paced from a clock, worded carefully to claim
  nothing.
- **Cloudflare's ~100 s proxy timeout bounded a generation**, which is why the question cap
  stayed at 15, and why broad topics (ADR 0045) — a planning call, up to ten lookups, then the
  model — made the budget tighter.

The author asked for the obvious thing: start it, go and do something else, be told when it is
done.

Options:

1. **Streaming (the plan's slice 2.2):** NDJSON over the same request, questions appearing as
   they are written. Real progress, but still one connection that must stay open — it fixes the
   blindness and none of the rest.
2. **A background job on Hangfire,** which is already in the app and durable across restarts.
   Its PostgreSQL storage polls for work every 15 seconds by default: up to a quarter of a
   typical generation would pass before it began, with the author watching a card that says
   "Queued".
3. **A background job on an in-process queue:** a channel and a hosted worker. Starts at once;
   loses whatever is in flight when the process stops.

For telling the author, two ways to know they have gone: the browser says so on its way out, or
the server notices the polls have stopped.

## Decision

**Option 3.** `POST /quiz/ai-jobs` writes an `AiGenerationJobs` row, puts its id on an in-process
channel and answers 202. `AiGenerationJobWorker` runs the same `GenerateAsync` the synchronous
endpoint calls and stores its outcome as the body that endpoint would have returned. The wizard
polls the job while its card is on screen and takes the outcome in the shapes it always has.

**The server decides whether to notify, from the polls.** A job that ends with no poll in the
last 6 seconds notifies at once; one that was being watched gets 25 seconds to be collected
first. Nothing depends on the browser announcing that it is leaving — a closed tab, a dead
battery and a dropped connection never do.

**Leaving is allowed, not confirmed.** The leave dialog and the navigation guard are removed
from the wizard, and the card offers *Keep browsing*.

## Consequences

- **A restart loses generations in flight.** They are ended as a failure the author can read
  ("the server restarted… nothing was used"), at start-up and by the recurring sweep, and the
  quota slot is released as an abandoned request's always was. Acceptable on one small server
  with rare deploys; **wrong for two instances**, where a job could be accepted by one and
  polled on the other — fine, the row is in the database — but its "is anyone watching" memory
  and its queue are per process. Moving the queue out of process is the change to make first.
- **A new table holding generated content.** Each row has the request, the questions and the
  source text, tied to the user (deleted with the account) and swept after
  `Ai:JobRetentionDays`. Until now a generation left nothing on the server but its ledger row.
- **The proxy timeout no longer bounds a generation**, only each short call. The question cap
  can be reconsidered on cost and the model's limits alone.
- **Progress is real but coarse:** two stages, reported as they start. Per-question progress
  still needs streaming (option 1), which is now independent of this and smaller — it would
  write partial results to the job row.
- **The author is passed explicitly** through grounding to the topic plan, because a job has no
  request to read the user from. Anything added to generation later that reaches for
  `ICurrentUserService` will find nobody there.
- **`ai-generate` is kept** and unused by the app. Two entry points to one operation is a cost;
  it is paid to keep the tools and tests written against the synchronous one, and can be
  removed when they move.
- **Notifications gained a link** (`Notification.Link`, a path inside the app, checked on both
  sides), which other notifications can now use.
- Rejected: option 1 as the answer to *this* problem (it keeps the tab hostage); option 2 for
  its start delay; a "leaving" beacon from the browser as the trigger for notifying (it is
  never sent in exactly the cases that matter).
