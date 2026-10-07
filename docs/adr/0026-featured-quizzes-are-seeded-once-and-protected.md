# 26. Featured quizzes are seeded once, and only a SuperAdmin removes one

Date: 2026-10-07
Status: Accepted

## Context

The quiz home page (`/choose-quiz`, [`featured-quizzes.md`](../quiz/featured-quizzes.md)) is built
from sixteen featured quizzes: four categories, Easy to Expert. It is a first-time visitor's first
real screen, so it has to look the same — and work — on every database: a fresh dev machine, the
E2E database CI creates from nothing, and production.

Until now the API seeded only accounts in production. Content of any kind existed only if someone
made it, and sample content only in Development. So the quizzes have to be created by the app
itself, and that raises two questions with real alternatives:

1. **Once the app has created them, who owns the content — the code or the database?**
   - *The code wins:* every startup resets each featured quiz to the JSON. Content is always
     exactly what was reviewed, but any fix made in the app is silently undone at the next
     deploy, and deleting one is impossible.
   - *Seed once:* create a quiz only when its key is missing; after that the database copy is the
     live one. Edits stick; the JSON is only what a new database starts from.
2. **Who may take one off the page?** The quizzes belong to a system account nobody signs in as,
   so the usual owner-only rules would leave them unchangeable — while "any admin" would let one
   click empty a slot on the most visible page in the app.

## Decision

**Seed once, by `Quiz.FeaturedKey`, never overwrite.** `FeaturedQuizSeeder` runs in every
environment and creates a featured quiz only when no row — **soft-deleted ones included** — has its
key. The same goes for the baseline categories, languages and difficulties it ensures: found by
name, created if absent, never updated, so an existing category keeps its palette.

**Removing one is SuperAdmin-only; editing is not.** Deleting a featured quiz, changing its status
(by the status endpoint or the full update), and deleting a question owned by the OxygenQuiz
account each require SuperAdmin. Admins may edit the content, because edits are versioned and lose
nothing.

## Consequences

- A fix to the JSON reaches **new** databases only. On an existing one — production — it is made
  in the app. `featured-quizzes.md` §3 says so where someone editing the file will read it.
- A deleted featured quiz stays deleted across deploys: a SuperAdmin's removal is a decision, not
  drift to be repaired. Its slot is simply absent from the page. Bringing it back means restoring
  the row.
- New palettes reach new databases only; production's categories had to be recoloured by hand.
- The page can't be emptied by an Admin by accident, and nothing on it depends on anyone having
  authored content first.
- If the content ever needs to be pushed to existing databases (a factual error found in all of
  them), that is a one-off data migration, deliberately — not a change to this seeder.
