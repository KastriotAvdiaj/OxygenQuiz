# Fact quizzes — questions built from Wikidata facts, no model

> **Status: built 2026-11-01, live on its branch.** Folds in and replaces the proposal
> `proposals/wikidata-fact-questions.md` (written 2026-10-30, measured against the live Wikidata
> Query Service). The decision to build packs offline and commit them is
> [ADR 0040](../adr/0040-fact-packs-are-built-offline-and-committed.md).

An author picks a **fact pack** — *Capitals of Europe*, *Peaks of Albania* — a language and how
many questions, and gets a quiz in which every answer is a fact from Wikidata and every wrong
option comes from the same pack. No model writes, checks or phrases anything, so it costs no
daily generation and can't invent an answer. It reaches the author the way a generated quiz
does: the same parser, the same review, the same save.

| Piece | Where |
|---|---|
| Pack files (query, gates, templates, facts) | [`OxygenBackend/QuizAPI/FactPacks/*.json`](../../OxygenBackend/QuizAPI/FactPacks/) |
| Build script (Wikidata → facts) | [`scripts/facts/build.mjs`](../../scripts/facts/build.mjs), `npm run facts:build -- <slug>` or `-- --all` |
| Catalogue, builder | [`Services/Facts/FactPackCatalog.cs`](../../OxygenBackend/QuizAPI/Services/Facts/FactPackCatalog.cs), [`FactQuizBuilder.cs`](../../OxygenBackend/QuizAPI/Services/Facts/FactQuizBuilder.cs) |
| Endpoints | `GET /api/quiz/fact-packs`, `POST /api/quiz/fact-quiz` — [`FactQuizController.cs`](../../OxygenBackend/QuizAPI/Controllers/Quizzes/FactQuizController.cs) |
| Page | `…/create-quiz/ai/facts` (admin), `…/create/ai/facts` (user) — `AI-Quiz/fact-quiz.tsx`, `fact-quiz-view.tsx` |
| Entry | The create-quiz dialog's third step, *What should the AI work from?* → **From a set of facts** |

## Why a quiz can't query Wikidata while it is being made

Measured 2026-10-30 against the query service:

| Finding | Measured |
|---|---|
| The service throttles | One server was limited to **1 request a minute**, "created during active wdqs outage"; the Wikidata API answered 429 |
| Queries are slow | 0.5–3 s for a simple one; **29–46 s** walking the class tree; a three-way union **timed out** at 60 s |
| Classes are inconsistent | "Cities in Kosovo" by class finds **2** — the rest are modelled as other classes |
| Occupations are noisy | The most-linked "Albanian writer" is **Mother Teresa**; an actress's "notable work" is a sitcom |
| Citizenship is anachronistic | Rilindja writers were Ottoman subjects, so "citizen of Albania" misses Naim Frashëri |
| Values conflict | Lake Shkodër has two areas, **530** and **26,535** |
| Albanian labels are uneven | 48 of 49 European capitals (Oslo had none); mixed forms — *Parisi*, *Madridi* definite; *Romë*, *Londër* not |
| Aliases carry junk | Kosovo's include *XK*, *KOS* and 🇽🇰; Belgrade's include *Београд* |
| Albanian depth is uneven | Literature: **9** usable author–work pairs. Geography: good — peaks with heights and Albanian names |

So the query runs **offline**, a person reads what it returned, and the app reads a file. And
Wikidata is a general-knowledge source with patchy Albanian depth — Albanian literature belongs
to Albanian Wikipedia and Wikisource, not here.

## A pack is a reviewed definition plus the facts it returned

```jsonc
{
  "slug": "capitals-of-europe",
  "title": { "English": "Capitals of Europe", "Albanian": "Kryeqytetet e Evropës" },
  "editorialNote": "Every sovereign state Wikidata places in Europe, Kosovo included. …",
  "kind": "entity",                    // or "quantity" (a number: an elevation)
  "query": "SELECT ?item ?value ?sitelinks WHERE { … }",
  "minSitelinks": 0,
  "labelOverrides": { "Q585": { "Albanian": "Oslo" } },
  "templates": { "English": { "plain": "What is the capital of {subject}?", … }, "Albanian": { … } },
  "builtAt": "2026-11-01",             // written by the build script
  "facts": [ … ]                       // written by the build script
}
```

Everything above `builtAt` is written by hand and reviewed like code; `builtAt` and `facts` are
written by the build script and reviewed as a diff. A refresh that changes a capital or drops a
peak's Albanian name shows up in the pull request, not in a quiz.

**What the build drops, rather than guesses** (`build.mjs`):

- **Below the pack's `minSitelinks`** — nobody has heard of it. Peaks of Albania: 915 rows, 892
  under 15 Wikipedias, 15 kept.
- **More than one value** for the same item — two peaks with conflicting heights were dropped.
- **Aliases that aren't names** — codes (*XK*, *NOOSL*), symbols, and anything not in Latin script.

A missing label in one language keeps the fact for the other language; it is never filled in
from another language. Only `labelOverrides`, which a person wrote, can supply one — Oslo's
Albanian name, *the Netherlands* for the item Wikidata calls *Kingdom of the Netherlands*.

**Editorial choices are stated, not hidden.** `editorialNote` is shown on the page under the
pack, so "Kosovo counts as a European state" is something the author can see. Wikidata records
Kosovo as a sovereign state; about 110 of 193 UN members recognise it, and the pack follows
Wikidata, which is also what this audience expects. A pack whose contents are disputed says so
the same way.

## Choosing what is asked

1. **A person picks the relation.** The pack names the property — capital, elevation. The
   free-form alternative (resolve "Albania", hand the model every statement) was rejected: Q222's
   largest group of properties is demonyms, the rest mostly identifiers.
2. **Popularity ranks the subjects** — the sitelink count, how many Wikipedias have an article.
   France and Turkey 428, Korab 48. It also gives **difficulty**: the best-known third of a pack is
   Easy, the least-known Hard, named in the app's own difficulty words
   (`FactQuizBuilder.DifficultyFor`, matching *Easy/Medium/Hard* or *E lehtë/Mesatare/E vështirë*,
   else by position).
3. **A question that gives itself away isn't asked.** Monaco, San Marino, Luxembourg, Vatican City
   and Andorra la Vella share their country's name (`NamesOverlap`, including Albanian inflection:
   *Luksemburg* / *Luksemburgu*).

## The question styles

A pack opts into a style by giving it a template; the author's question types narrow it further.
One quiz mixes the styles, round-robin over a shuffle.

| Style | Type | Example | Built from |
|---|---|---|---|
| `plain` | Multiple choice | What is the capital of Latvia? | Wrong options: other capitals, **nearest in popularity** — famous capitals for famous countries |
| `reverse` | Multiple choice | Valletta is the capital of which country? | Other countries |
| `trueFalse` | True / false | The capital of Croatia is Budapest. | True half the time; false uses a neighbour's capital |
| `typed` | Type the answer | What is the capital of Kosovo? Type the city. | Accepted: the filtered aliases (*Prishtina*, *Priština* for Pristina) |
| `amount` | Multiple choice | How high is Jezercë? | Other peaks' heights, at least 2% apart so two can't both be right |
| `highest` | Multiple choice | Which of these peaks is the highest? | Three lower peaks, nearest first. **Once per quiz** — the stem never changes, and the parser drops a repeated stem |
| `compare` | True / false | Gramos is higher than Tomorr. | A neighbour at least 2% different |
| `statement` | — | The capital of Latvia is Riga. | The explanation, and the `sourceQuote` |

Numbers are never typed exactly and carry no thousands separator ("2764 m" reads the same in
English and Albanian).

**Albanian templates avoid inflected slots.** "Cili është kryeqyteti i {Francës}?" needs the
genitive, which a label can't give; the templates use apposition instead — "kryeqyteti i shtetit
{Francë}" — and phrasings that keep the name in the nominative ("{subject} — sa metra lartësi
ka?", "ka lartësi më të madhe se" rather than the gendered "më e lartë"). They are data in the
pack file, so wording is fixed without touching code.

## Why the reply has a model's shape

`POST /quiz/fact-quiz` answers `{ payload, grounding }` — the `payload` is the
`{ title, category, language, questions }` JSON a model returns, and `grounding` is the same DTO a
grounded generation carries, with `provider: "wikidata"`, the pack's title, a link to its query,
and as `text` every fact the questions state. So:

- **The parser's checks run on it** — giveaways, duplicate options, repeats, and every
  `sourceQuote` against the facts. `fact-quiz-replies.test.ts` parses real builder output (every
  pack, both languages, every type) and asserts nothing is dropped; `FactQuizFixtureDump` in the
  C# tests re-records it after a pack or template changes.
- **The review shows the source** (`SourceNote`, "Built from Wikidata facts: …") with no new code.
- **Saving is `ai-import`**, unchanged; the draft lives in its own slot (`quiz-ai-facts`).

The alternative, a fact-specific review, would have duplicated the one part of the AI path that
has been hardened the most.

## What is deliberately not built

- **Model phrasing for Albanian.** The proposal planned for the model to phrase Albanian questions
  around locked facts. The templates read acceptably, cost nothing and can't introduce an error,
  so phrasing waits for a stronger model; mixed definite and indefinite labels (*Parisi*, *Romë*)
  are the visible cost — logged in `known-issues.md`.
- **Clue, superlative-by-coordinates and odd-one-out styles** — they need more than one fact per
  item (rivers, coordinates); the pack format allows it when a pack needs it.
- **Routing a typed topic to a pack.** The author picks the pack. Routing waits until there are
  enough packs to route between.
- **Packs for Albanian literature.** Nine rows is not a pack.
