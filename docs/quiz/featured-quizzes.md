# Featured quizzes — the quiz home page every database ships with

> **Status: implemented (2026-10-07).** Replaces the catalogue as the page behind `/choose-quiz`;
> the catalogue moved to `/choose-quiz/all` (see [`quiz-discovery.md`](./quiz-discovery.md)).
> The decision to seed the quizzes once and protect them is
> [ADR 0026](../adr/0026-featured-quizzes-are-seeded-once-and-protected.md).

`/choose-quiz` is where the header's **Play** → single player lands, and for a first-time visitor
it is the first real screen of the app. It used to be the full catalogue: a search box, a filter
sidebar and a grid of whatever had been published lately. It is now the **quiz home page**: four
**category panels** — Geography, General Knowledge, Science, History — each a photo-backed card
holding a ladder of four **featured quizzes**, Easy, Medium, Hard and Expert. Anyone who wants more
presses **Browse all** or **Explore more quizzes** and gets the old catalogue.

The sixteen quizzes are part of the app, not of anyone's data: the API seeds them into every
database on startup, so the page looks the same on a laptop, in CI and on oxygenquiz.com.

| Piece | Where |
|---|---|
| Content (16 quizzes × 10 questions) | [`Seed/featured-quizzes.json`](../../OxygenBackend/QuizAPI/Seed/featured-quizzes.json), an embedded resource |
| Seeding | [`FeaturedQuizSeeder`](../../OxygenBackend/QuizAPI/Services/FeaturedQuizzes/FeaturedQuizSeeder.cs), called by `DbSeeder` in every environment |
| Content rules | [`FeaturedQuizContent.Validate`](../../OxygenBackend/QuizAPI/Services/FeaturedQuizzes/FeaturedQuizContent.cs) |
| Who may change one | [`FeaturedQuizRules`](../../OxygenBackend/QuizAPI/Services/FeaturedQuizzes/FeaturedQuizRules.cs), called from `QuizService` and `QuestionsController` |
| Owner account | [`SystemAccount`](../../OxygenBackend/QuizAPI/Services/SystemAccount.cs) — "OxygenQuiz" |
| Read | `GET /api/quiz/featured`, anonymous — `QuizService.GetFeaturedQuizzesAsync` |
| Page | [`src/pages/Quiz/Featured/`](../../src/pages/Quiz/Featured/) — `Featured-Quizzes.tsx`, `category-panel.tsx`, `featured-catalogue.ts` |
| Route + redirect | [`featured-quizzes.loader.ts`](../../src/loaders/featured-quizzes.loader.ts), `Router.tsx` |

---

## 1. How a featured quiz is recognised

**By `Quiz.FeaturedKey`** — `geography-easy`, `general-knowledge-expert` and so on, one per slot,
`<category slug>-<level>`. Null for every other quiz, unique when set (a filtered index, the same
pattern as `ShareToken`).

Not by id, because ids differ between databases. Not by title, because a title is the first thing
an editor changes. The key is the one thing nobody edits — there is no endpoint that writes it —
so the seeder, the API and the page can all find "Science, Hard" in any database.

## 2. What the seeder does

`DbSeeder.SeedAsync` runs on every startup. After the admin and guest accounts it calls
`FeaturedQuizSeeder.SeedAsync`, **in every environment**, which:

1. **Ensures the OxygenQuiz account** — fixed id `…0002`, `IsProtected` (ADR 0011), a random
   password nobody knows. If a real user already holds the name "oxygenquiz" (names share one
   namespace, ADR 0017), the account takes `OxygenQuiz-Official` instead of failing startup.
2. **Ensures the baseline lookups**, by name, case-insensitively:

   | Table | Rows |
   |---|---|
   | Categories | Unspecified, Geography, General Knowledge, Science, History |
   | Languages | Unspecified, English |
   | Difficulties | Unspecified (0), Easy (1), Medium (2), Hard (3), Expert (4) |

   Before 2026-10-07 these existed only in Development (`EnsureSampleDataAsync`); a production
   database had whatever admins had created. Development now adds only its extras on top
   (Technology; Spanish, German, French) and its three sample questions.
3. **Creates each featured quiz whose key is missing** from the JSON: the quiz (Public, Classic,
   English, feedback after every answer, no shuffling, owned by OxygenQuiz), its ten questions
   (Global visibility — a guest must be able to load them — owned by OxygenQuiz, each with its
   explanation) and the join rows with each question's own time limit. The quiz's total time is
   the sum, as the Classic update computes it.

### Create if missing, never overwrite

Every step only adds what is absent. An existing row is never touched:

- **An edited featured quiz stays edited.** The database copy is the live one; the JSON is only
  what a *new* database starts from.
- **A deleted featured quiz stays deleted.** Soft-deleted rows count as present. Deleting one is a
  SuperAdmin decision (§4), and the next deploy must not silently undo it. To bring one back, a
  SuperAdmin restores the row — or it reappears on a database where it never existed.
- **An existing category keeps its own palette and spelling.** See §6.

Why seed-once rather than "the code wins": [ADR 0026](../adr/0026-featured-quizzes-are-seeded-once-and-protected.md).

A quiz the JSON gets wrong is skipped with an error in the log, not seeded half-broken — but the
unit tests (§8) stop such a file reaching a build in the first place.

## 3. The content rules

Agreed when the feature was designed, and enforced by `FeaturedQuizDefinition.Validate` over the
real file in CI:

| Rule | Why |
|---|---|
| **10 questions** per quiz | Long enough to feel like a quiz, short enough to finish on a phone. |
| **4 options** on every multiple-choice question, exactly one right | Three options make guessing too cheap. |
| **No type-the-answer in Easy or Medium** | Typing is the hardest format; the first two steps are for confidence. |
| **No true/false in Expert** | A coin flip has no place at the top of the ladder. |
| **A base time per question**: Easy 20 s, Medium 25 s, Hard 30 s, Expert 35 s | A floor, not a fixed value — a question may get more (type-the-answer gets +5 s), never less. 20 s is the lowest that still plays well. |
| **An explanation on every question** | Shown with the feedback, so a wrong answer teaches something — and writing it forces the fact to be checked. |

And by convention (not machine-checked): Hard and Expert multiple choice uses **close
distractors** — 1066 / 1067 / 1056 / 1076, four neighbouring countries — rather than one right
answer among three silly ones; facts that go stale (populations, "tallest", current office-holders,
recently renamed capitals) are avoided; and the questions of a quiz are ordered so its true/false
and typed questions are spread through it rather than bunched.

The mix shipped in 2026-10:

| Level | Multiple choice | True/false | Type-the-answer |
|---|---|---|---|
| Easy | 7 | 3 | 0 |
| Medium | 8 | 2 | 0 |
| Hard | 6 | 2 | 2 |
| Expert | 6 | 0 | 4 |

**Editing the content:** change `featured-quizzes.json` directly — it is the reviewed source; there
is no generator to keep in sync. Remember that an edit there reaches **new** databases only; on an
existing one, edit the quiz in the app (§4).

## 4. Who can change a featured quiz

The owner is the OxygenQuiz account, which nobody signs in as. So the owner-only rules that govern
every other quiz would make these unchangeable by anyone. Instead:

| Action | Who | Where enforced |
|---|---|---|
| Edit content (questions, title, description) | **Admin and SuperAdmin** | `QuizService.UpdateQuizAsync` lets an admin past the owner check for a featured quiz |
| Unpublish / change status | **SuperAdmin only** — through either the status endpoint or the full update | `FeaturedQuizRules.EnsureCanChangeStatus` |
| Delete | **SuperAdmin only** | `FeaturedQuizRules.EnsureCanDelete` in `QuizService.DeleteQuizAsync` |
| Delete one of OxygenQuiz's questions | **SuperAdmin only** | `FeaturedQuizRules.EnsureCanDeleteQuestion` in `QuestionsController` (a question used in a quiz can't be deleted by anyone anyway) |
| Delete the OxygenQuiz account | **Nobody** | `IsProtected` (ADR 0011) |

Editing stays open because edits are versioned (copy-on-write, [`quiz-editing.md`](./quiz-editing.md)):
fixing a typo loses nothing and breaks no one's history. Unpublishing and deleting take a quiz off
the home page, so they are the owner's call — the SuperAdmin's.

A refusal is a `ForbiddenException` → 403 with a sentence saying who can.

## 5. The page

`/choose-quiz` → `FeaturedQuizzes`. A Back chip to `/choose-mode`; the h1 and its action; the four
panels; a full-width **Explore more quizzes** button for whoever scrolled past all of them.

- **The h1 speaks to the visitor:** "Pick your first quiz" signed out, "Pick a quiz" signed in.
  No description paragraph (CLAUDE.md, page headers).
- **Browse all** (secondary, muted `LiftedButton`) and **Explore more quizzes** (primary) both go
  to `/choose-quiz/all`. The catalogue's Back chip returns here.
- **Picking a tile opens the usual `QuizStartModal`**, and **Start Quiz** goes to
  `quizPlayPath` — the same play flow as the catalogue, guest play included.
- **A guest who has spent their free quiz** ([`guest-play.md`](../auth/guest-play.md)) gets
  `SignUpForMoreDialog` instead — "Sign up to play the rest of the ladder", with Sign up, Log in
  (which returns to the quiz they picked) and Not now. Without it the click would bounce them
  to the login page with no explanation. The check is the existing `GET
  /guest-quiz-sessions/can-play`.

### What the page shows when a quiz is missing

The layout comes from a fixed list in the code (`CATEGORY_PANELS` × `FEATURED_LEVELS` in
`featured-catalogue.ts`), not from the API. The API only fills slots, by `featuredKey`:

- a slot with no quiz (deleted, unpublished, never seeded) is **left out**, and the row closes up;
- a panel with no quizzes at all is left out;
- if the request fails or nothing is featured, a short message sits above **Explore more**.

So a missing quiz is never a broken tile, and the page never depends on what order or how many
the API returns.

### The panel

Each category is its name — a heading in the category colour's small square, then the name — and
under it a rounded card of the category's photo holding the four tiles.

**The name sits above the card, not on it.** The first version cut the card into a folder shape
with a **tab** rising from its top-right corner and the name on the tab (`clip-path: path(...)`,
rebuilt on every resize by a `ResizeObserver`). It was dropped on 2026-10-08 after seeing it in the
app: a plain heading over a plain card reads more cleanly, and the measuring code, the clip path and
its tests went with it. `git show beba94f:src/pages/Quiz/Featured/panel-shape.ts` has it if the idea
comes back.

**The font is the player's.** Nothing on the page sets a font family: it inherits `font-quiz` from
the layout — the quiz font chosen in Settings, DynaPuff by default — like every other play screen.
(The first version used the `font-header` Titillium on the title and tab; it didn't match the rest
of the app.)

**The photo** is softened to stay a backdrop: a 2px blur, saturation 0.85, brightness 0.92, scaled
slightly so the blur's faded edge stays inside the card's rounded corners. **The scrim** is nearly
clear at the top so the photo reads, then fades to the category colour behind the tiles. The card's
lifted edge is that colour too (`quizEdgeColor`), like the quiz cards'.

**Tiles** are 4 in a row from 640px, a 2×2 grid below — four in a row at 360px left ~70px each,
too narrow for a title. Each shows four difficulty pips (filled up to its level), the level, the
title and the question count.

**Images** are `public/assets/categories/<slug>.webp`, 1600px wide (~600 KB for all four), from
Unsplash. The 1–2 MB originals are not in the repo.

## 6. Category colours

Each panel takes its colours from its **category's palette** (`colorPaletteJson`, the same one quiz
cards use), so an admin's palette change reaches the panel too. `featured-catalogue.ts` holds a
copy only for the moment before the quizzes load.

The palettes were picked from the photos so the colour reads as part of the image, then darkened
until white text on the first colour, and the first colour on the second, both clear 4.5:1:

| Category | Palette | From the photo |
|---|---|---|
| Geography | `#0B5CA8` → `#CFE3F5` | the oceans |
| General Knowledge | `#8E3B2F` → `#F2D6CF` | the red book spines |
| Science | `#4652C8` → `#DCDFFA` | the dusk sky, pushed to indigo so it can't be mistaken for Geography's blue |
| History | `#8E5326` → `#F5E1C8` | the Sphinx's sandstone |

**These are what a new database gets.** The seeder never changes an existing category (§2), so on
a database where Geography, Science or History already existed — production included — the old
palette stays until someone sets these values in the admin category editor — a manual step on
production, decided when the feature shipped.

## 7. Routes

| URL | Page |
|---|---|
| `/choose-quiz` | Featured page (this doc) |
| `/choose-quiz/all` | The catalogue — search, facets, every public quiz ([`quiz-discovery.md`](./quiz-discovery.md)) |
| `/choose-quiz?category=…`, `/choose-quiz?shared=…` | Redirected to `/choose-quiz/all` with the query intact |

The redirect is in the route's loader (`catalogueRedirectFor`), so links written before the move —
`categoryListPath`, a share link's landing — keep working. `categoryListPath` and the share route
now build the `/all` URL directly. Every other link to `/choose-quiz` (the 404 page, the stats
panel, "Back to quizzes" after a game) lands on the featured page, which is the intended front
door.

Only single player changed. The multiplayer lobby still picks from its own dialog.

## 8. Tests

| Suite | File | Pins |
|---|---|---|
| Backend | `Featured/FeaturedQuizContentTests.cs` | The shipped JSON breaks no rule, has all 16 keys, no repeated question; each rule is caught. |
| Backend | `Featured/FeaturedQuizSeederTests.cs` | A fresh database gets the 16 quizzes, 160 Global questions with explanations and four options, the lookups and palettes, a protected owner; a second run adds nothing; an existing category, an edited quiz and a deleted quiz are left alone; a hard-deleted one is recreated; a name clash falls back. |
| Backend | `Featured/FeaturedQuizRulesTests.cs` | Admin can't delete or unpublish (either route), SuperAdmin can; admin gets past the owner check to edit, a player doesn't; OxygenQuiz's questions are SuperAdmin-only; the page read returns only live, published, featured quizzes. |
| Unit | `Featured/__tests__/featured-catalogue.test.ts`, `loaders/__tests__/featured-quizzes.loader.test.ts` | Slot placement and the missing-slot rules; which URLs redirect. |
| E2E | `e2e/featured-quizzes.spec.ts` | A guest picks Geography · Easy on the home page and lands on its first question; Explore more reaches the catalogue and an old `?category=` link is redirected. |

## 9. Not done yet

- **"Played / best score" on a tile** for a signed-in player — needs a per-user read, and the page
  works without it. Logged in [`known-issues.md`](../deployment/known-issues.md).
- **Multiplayer** — the lobby's quiz dialog doesn't show featured quizzes.
