# Quick play: a category, a difficulty, and a quiz starts

> Built 2026-11-15. **Not yet tried in a browser**, and only as good as the catalogue: with few
> picked quizzes there are few tiles. Accepted from a proposal written 2026-11-12; the options
> that were not taken are at the end.

A visitor who wants to play something used to press **Play**, choose single player, land on a
catalogue of cards, pick one and start it from its overview — four steps before a question, the
hardest being the catalogue, where they had to choose between quizzes they knew nothing about.
The site was taken offline on 2026-11-12 because visitors came and didn't stay.

Quick play is two taps: **which category**, **how hard** — and a quiz the server chose starts.
The catalogue is one link away on both steps (*Browse all quizzes*).

```
/  →  /choose-mode  →  /quick-play  →  /quiz/:quizId/play
                         │
                         └─ Browse all quizzes → /choose-quiz
```

*Single Player* on `/choose-mode` goes here since 2026-11-15; it used to open the catalogue.
Everything else that links to `/choose-quiz` (results, the 404 page, the stats panel) still does.

## What a player sees

`src/pages/Quiz/QuickPlay/` — `QuickPlay` (queries and the pick) over `QuickPlayView`.

1. **Pick a category.** One tile per category that has a quiz to hand out, the fullest first,
   each in its category's colour with its quiz count. First, when more than one category has
   quizzes, *Surprise me* — any category.
2. **How hard?** *Any difficulty* (the primary button, in the category's colour) and one muted
   button per difficulty **that category has quizzes at**, easiest first, with its count. A
   category with one difficulty shows only *Any difficulty*. The tap starts the quiz.

Nothing is offered unless a quiz stands behind it, so the two taps can't end on an empty result.
The two steps swap in place rather than the difficulties opening under the grid: on a phone that
row would open below a screenful of tiles, out of sight of the tap that opened it.

**When the player has had them all** the page says so — *You've played every quiz here* — and
offers *Play one again* or the full list. It never repeats silently.

**Language** follows the catalogue ([`quiz-discovery.md`](quiz-discovery.md), "Starting in
English"): the languages the visitor chose there, else English; and when English was our choice
and has nothing, every language.

**A signed-out visitor** gets their one free quiz this way too: quick play only navigates to the
play route, and that route decides guest, resume or log in ([`../auth/guest-play.md`](../auth/guest-play.md)).
After the free quiz, the next tap ends at the login prompt, as it would from the catalogue.

## The two endpoints

`QuickPlayController` → `QuickPlayService` → `IQuizRepository`. Both anonymous; neither returns
anything about a quiz but its id.

| | |
|---|---|
| `GET /api/quick-play/options?languageIds=2,3` | `[{ categoryId, difficultyId, count }]` — every pair with at least one quiz. The client joins it to the lookups it already has. |
| `GET /api/quick-play/pick?categoryId=&difficultyId=&languageIds=&exclude=4,9&allowRepeats=` | `{ quizId, exhausted }`, or **404** when nothing matches at all. Every parameter is optional; a missing category or difficulty means any. |

### Which quizzes may be handed out

Narrower than the catalogue, and the same for every caller, an admin included:

- **Public**, not held by moderation, a released format — the rules every read of quizzes applies
  ([ADR 0019](../adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md), ADR 0034);
- **Classic** — a board has its own play route and is still in preview;
- **Picked** ([`../media/moderation.md`](../media/moderation.md) §5). In the catalogue a visitor
  opts into community quizzes behind a switch and a notice. Here nobody chose the quiz — the site
  did — so it chooses from what the team has vouched for.

### Which one

Random among the matches this player hasn't had:

- the ids the client lists in `exclude` — the browser remembers the last 200 it was handed
  (`localStorage`, `oxygen.quick-play-seen`), which is all a guest has;
- for a signed-in player, also every quiz they have a session of, finished or not.

When that leaves nothing the answer is `exhausted: true` with no quiz. *Play one again* asks with
`allowRepeats=true`, which ignores what was played and avoids only the ids it is sent — the page
sends the one quiz most recently handed out, so "again" isn't the same quiz twice in a row unless
it is the only one.

## What limits it

- **The catalogue's depth.** A category with three picked quizzes is exhausted in three plays.
  That is the right limit to have, because content fixes it: broad-topic AI generation
  ([`ai-quiz-generation-flow.md`](ai-quiz-generation-flow.md) §2f) and the difficulty slider
  exist to let staff stock a category at each level. A quiz has to be **picked** to count.
- **"Played" for a signed-in player is any session**, so a quiz started and abandoned is not
  handed out again until they ask for repeats.
- **A guest's memory is one browser's.**

## Not taken

- **Assemble a fresh quiz from the public question pool.** Every play different, but a session is
  a play of one stored quiz (`QuizSession.QuizId`): it needs either a hidden generated quiz row per
  play, kept out of the catalogue, the sitemap, analytics and the sweepers, or a nullable `QuizId`
  that grading, resume, history and statistics all learn. And only staff make Public questions,
  so the pool is small. Revisit if repeats become the complaint, with real numbers on the pool.
- **A daily quiz per category.** Quick play with a fixed pick, plus a quiz made every day for
  every category — a content commitment, not a feature.
