# 19. Quiz visibility is enforced at each entry point, not by a global query filter

Date: 2026-09-22
Status: Accepted

## Context

[`quiz-visibility.md`](../quiz/quiz-visibility.md) described the discovery rule as an EF Core global
query filter on `Quiz`: a quiz loads only when it is Public, owned by the caller, or the caller is an
admin. `ApplicationDbContext` declared it — and then, about 250 lines further down, declared a
second filter on the same entity for soft delete (`DeletedAt == null`).

**In EF Core 8 an entity has exactly one query filter, and a second `HasQueryFilter` call replaces
the first.** It does not combine with it. So the visibility filter never ran, from the day soft
delete was added (`20260615120000_AddQuizSoftDelete`) onwards. Reproduced on 2026-09-22 in isolation
(EF Core 8.0.20: a Draft row, both calls in this order, an unfiltered query returns it) and inside
this codebase's own test suite.

Nobody noticed because nothing depended on it. Every entry point already checks access itself:

| Entry point | Its own check |
|---|---|
| Public catalogue, list and search | `Status == Public` (`QuizService`) |
| `GET /api/quiz/{id}`, `/{id}/questions` | Draft → owner or admin only; Unlisted readable by id by design |
| My quizzes, admin lists | `UserId ==` the caller / role-gated endpoint |
| Update, status, share link, delete | owner (or admin for delete) in `QuizService` |
| Starting a session | `IsPlayAuthorized` (Public, owner, or valid share token), over an explicitly unfiltered read |
| Guest session | `Status == Public` |
| Share-link resolve | token lookup, Draft refused |
| Hosting in a lobby | `CanHostQuizAsync` |
| Owner analytics | ownership clamp in `ReportService` |

## Decision

**Remove the dead visibility filter. `Quiz`'s only global filter is soft delete.** Visibility
stays where it is actually enforced: explicitly, at each entry point, as in the table above.

The code now says so where the filter used to be, and
`QuizAPI.Tests/Visibility/QuizQueryFilterTests.cs` pins it: it fails if a visibility filter is
added back.

## Why not make the filter work instead

That was the first plan (it was logged as a P2 fix, and was Phase 0 of the Associations plan). It
was tested before being done — the filter combined with soft delete into one working
`HasQueryFilter` — and three things broke:

1. **Query filters apply to included navigations.** A signed-in player who played someone else's
   **Unlisted** quiz through its share link owns that session. Loading it with its `Quiz` — which
   the results page, the history list, the review screen and the stats all do — no longer
   returned a session with its quiz under the working filter
   (`StrangersSession_OnAnUnlistedQuiz_StillLoadsItsQuiz` fails). This is the exact failure shape of the 2026-08-19
   `QuestionBase` bug ([`quiz-visibility.md`](../quiz/quiz-visibility.md), "The bug this rule
   shipped with"), and it would have hit every Unlisted play by anyone but the owner.
2. **Background work has no current user.** The Hangfire sweeps (`AbandonedSessionSweeper`) and the
   multiplayer match loop run with `_current.UserId == null` and `IsAdmin == false`, so under a
   working filter any of their reads that go through `Quiz` would silently skip every non-Public
   quiz. Each such read would need `IgnoreQueryFilters()`,
   which also switches off soft delete, which then needs `DeletedAt == null` restated by hand —
   more places to forget than the filter would save.
3. **It would add nothing.** Every entry point that serves a quiz already refuses the caller who
   shouldn't have it (the table above). A filter would be a second copy of that rule, one that
   disagrees with it about Unlisted (readable by id by design, hidden by the filter).

A global filter is the right tool when *every* read of an entity should see the same subset. Soft
delete is that. Visibility is not: who may see a quiz depends on *how* they reached it — catalogue,
id, share token, lobby, their own history — and only the entry point knows that.

## Consequences

- **A new endpoint that returns a quiz must check access itself.** There is no safety net, and
  there never was one. `CLAUDE.md` states this in one line so it is in context before anyone
  writes such an endpoint.
- **`IgnoreQueryFilters()` on `Quiz` means "include soft-deleted"**, nothing else. Call sites that
  use it to "bypass discovery" were only ever bypassing soft delete, and all of them restate
  `DeletedAt == null`; their comments were corrected.
- **EF Core 8 allows one filter per entity.** Adding a second concern to `Quiz` later means
  extending the one predicate, never a second `HasQueryFilter` call — the comment at the filter
  says so, because that is how this happened.
- The `QuestionBase` filter is unaffected: its rule 4 reads `qq.Quiz.Status` itself.
