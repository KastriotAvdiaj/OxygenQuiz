# Proposal: quick play — a category, a difficulty, and a quiz starts

**Status: open.** Nothing implemented, nothing decided. Written 2026-11-12.

A visitor lands on the home page wanting to play something. Today they press **Play**, choose
single player, land on a catalogue of cards, pick one, and start it from its overview — four
steps before the first question, and the hardest is the catalogue, where they have to choose
between quizzes they know nothing about. The site was taken offline on 2026-11-12 because
visitors came and didn't stay. Should Play instead ask two things — *which category?* and *how
hard?* — and start a quiz, with the catalogue one link away for people who want to browse?

---

## 1. What happens today

**The path** is fixed by the routes in [`Router.tsx`](../../src/routes/Router.tsx):

```
/  →  /choose-mode  →  /choose-quiz  →  quiz overview  →  /quiz/:quizId/play
```

`/choose-quiz` already opens on a deliberately varied first page
([`../quiz/quiz-discovery.md`](../quiz/quiz-discovery.md)) and can open on one category
(`?category=<name>`). It is still a list to choose from.

**A session is a play of one stored quiz.** [`QuizSession.cs`](../../OxygenBackend/QuizAPI/Models/Quiz/QuizSession.cs):

```csharp
public int QuizId { get; set; }
public virtual Quiz Quiz { get; set; } = null!;
public int QuizVersion { get; set; } = 1;
```

Grading, resume, history, statistics and the multiplayer match all read the session's quiz. **This
is the constraint that splits the options below:** anything that starts an existing quiz is a
small change, and anything that plays questions *without* a quiz row is a change to what a session
is.

**A quiz already carries everything a quick pick needs** — [`Quiz.cs`](../../OxygenBackend/QuizAPI/Models/Quiz/Quiz.cs)
has `CategoryId`, `DifficultyId`, `LanguageId`, `Status`, `Format` and `IsPicked` (the house and
team-chosen half of the catalogue). `GET /api/quiz/search` filters on all of them and is
anonymous.

**A guest gets exactly one quiz** per browser ([`../auth/guest-play.md`](../auth/guest-play.md)),
spent when it starts. So for a signed-out visitor "another one" after a quick-play quiz is the
login prompt, whichever option is chosen.

**Questions exist outside quizzes too.** A `Question` has its own category, difficulty, language
and a `Visibility` of `Public` or `Private`; only staff create Public ones
([`../quiz/question-bank.md`](../quiz/question-bank.md)). That pool is what option B draws from.

## 2. Options

### A. Pick a random existing quiz

Play → a grid of category tiles → Easy / Medium / Hard / Any → the server picks one Picked,
Public, Classic quiz for that category, difficulty and language, and the client goes to
`/quiz/:id/play`.

- **Backend:** one anonymous endpoint, e.g. `GET /api/quiz/quick-pick?categoryId=&difficultyId=&languageId=&exclude=`,
  returning a quiz id — or 404 when the combination is empty. It must apply the same visibility
  rules as every other quiz read (`VisibleTo`, the moderation hold, the released-format check;
  ADR 0019). A second endpoint, or a field on the lookups, says **which combinations have
  quizzes**, so the tiles never offer an empty one.
- **Not repeating:** signed in, exclude quizzes the player has completed (their sessions); a
  guest sends the ids it has seen from `localStorage`. When everything has been played, say so and
  offer the catalogue rather than silently repeating.
- **Frontend:** one new screen (or two steps of one), reusing the category palettes for the
  tiles. `/choose-mode` stays for multiplayer.
- **Nothing changes** in sessions, grading, guest play, history or statistics.
- **Limit:** it is only as good as the catalogue. A category with three quizzes is exhausted in
  three plays.

### B. Assemble a fresh quiz from the public question pool

Same two questions, but the server draws ten random `Public` questions matching the category and
difficulty and plays them.

- **Every play is different**, and it rewards a deep question bank rather than many quizzes.
- **Cost:** a session needs a quiz. Either a hidden, generated `Quiz` row per play (which then
  has to stay out of the catalogue, the sitemap, "my quizzes", analytics and the sweepers), or
  `QuizSession.QuizId` becomes nullable and every reader of it — grading, resume, history,
  statistics, the abandonment walk — learns a second shape.
- **Guest play** stores nothing and replays from the quiz; it would need its own answer.
- **Needs the pool first:** only staff make Public questions, so today the pool is small.

### C. A daily quiz per category

One house quiz per category per day, the same for everyone. Cheap to play (it is option A with a
fixed pick) and gives a reason to come back, but it needs a quiz made every day for every
category — which is a content pipeline, not a feature.

## 3. Recommendation

**A, now.** It is one endpoint and one screen, it changes nothing about what a session is, and it
attacks the actual problem: a visitor who has to choose among unknowns before seeing a single
question. Its limit — the catalogue's depth — is the right thing to be limited by, because it is
fixable with content: broad-topic AI generation
([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md) §2f) exists to let
staff stock a category at each difficulty quickly.

Only offer a tile when its combination has at least a handful of quizzes, default to the
catalogue's language rule (English until the visitor chooses), and keep **Browse all quizzes**
under the tiles.

**B later, if A's repeats become the complaint** — and decide then between a generated quiz row
and a nullable `QuizId` with real numbers on how large the public pool is. **C** is A plus an
editorial commitment; revisit when there is someone to keep it.

Open questions for whoever accepts this: how many quizzes make a combination offerable; whether
"Any" difficulty is the default; whether quick play replaces the Play button's target or sits
beside it; and what a guest sees after their one free quiz.
