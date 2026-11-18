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

`src/pages/Quiz/QuickPlay/` — `QuickPlay` (queries and the pick) over `QuickPlayView`, drawn
over `quick-play-scene.tsx`.

1. **Where to?** A signpost with one board per category that has a quiz to hand out, the
   fullest first, each with its quiz count. On top, when more
   than one category has quizzes, *Surprise me* — any category, marked with a **?**.
2. **How hard?** The same post, re-boarded: *Any difficulty* (**?**) and one board per
   difficulty **that category has quizzes at**, easiest first, with its count. A category with
   one difficulty shows only *Any difficulty*. That press starts the quiz.

Nothing is offered unless a quiz stands behind it, so the two presses can't end on an empty
result. *Rather choose yourself? Browse all quizzes* sits on the hill under the post, on both
steps.

### The signpost

Since 2026-11-18; the first version (2026-11-15) was a grid of category cards. A grid of cards is
what the catalogue already is, so a visitor met *another list to choose from* — the step quick
play exists to remove — and tiles of uneven width wrapped wherever they fit, with no order to
read. A signpost says *pick a direction and go*; both steps become the same object asked twice,
and one board per line gives the page a top-to-bottom order.

- **The scene** is the post on a hill, and nothing else — the post is the picture. (A sun or
  moon, stars, a forest and two mountain ranges were drawn the same evening and taken out: they
  competed with the post, and the mountains, scaled to cover a wide screen, lost their peaks and
  read as a flat ridge.) **Two colours and the wood:** the page's own background, the primary
  for the hill, and the wood of the boards and pole as the one accent — no category colours, not even as
  pins. Theme tokens only, so light and dark follow the theme. The first version that evening
  was a pink dusk with violet mountains and a coloured pin per board; it was the one place in
  the app that wasn't black, white and blue, and it was taken back the same day.
  The hill is in the page's flow under the boards, so the post always stands in it however
  many boards it carries.
- **A board** points away from the post, alternating sides, hung a few degrees off true
  (never the same tilt twice in a row). Its point is a `clip-path` and its raised edge a
  `drop-shadow` on a wrapper — a drop-shadow follows the clipped shape — so it lifts on hover and
  drops when pressed like a `LiftedButton`, and its focus outline (four more drop-shadows) follows
  the point. Plain `<button>`s, not `LiftedButton`s: they are the drawing's own pieces. The page's
  real actions (*Try again*, *Play one again*) are `LiftedButton`s.
- **Motion:** on each step, including the first load, the post rises out of the hill (220ms)
  and the boards swing on from it as it finishes, staggered down it (first settled by ~400ms,
  the ninth and later by ~650ms); the steps cross-fade. Under reduced motion the post and boards
  only fade, the boards already at their tilt. The step switcher is not `initial={false}` —
  framer-motion passes that down to every motion element inside, which is how the first load
  came to have no entrance at all.
- **A long post** — a dozen categories — makes a tall page that scrolls; there is no second post
  and no paging. Worth revisiting past about fifteen categories.

Stories: `Quiz/QuickPlayView` (`Categories`, `ManyCategories`, `HowHard`, …) — check both themes.

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
