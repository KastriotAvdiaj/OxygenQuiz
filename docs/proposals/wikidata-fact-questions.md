# Proposal: general-knowledge questions built from Wikidata facts

**Status: open.** Nothing implemented, nothing decided. Written 2026-10-30; every number below was
measured against the live Wikidata Query Service that day.

An author wants ten questions on *Kryeqytetet e Evropës* (capitals of Europe). Today the model
writes them from memory, and on the Phase 0 eval it got about a quarter of Albanian answers wrong.
Wikidata knows every one of those capitals, with an Albanian name, as data rather than prose —
and its distractors are free: the wrong options for "the capital of France" are the capitals of
other European countries. The questions this proposal answers: **how do we get the facts, which
facts are worth asking, and what does a question built from one look like?**

---

## 1. What happens today

Grounding is **text in, questions out** ([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md)
§2e): an article goes into the prompt, the model writes questions, and the parser checks each
`sourceQuote` against the article. The payload has three question types, fixed by
`AiPromptBuilder.TypeSpecs`:

```text
MultipleChoice  answerOptions: 2–4 × { text, isCorrect }, allowMultipleSelections
TrueFalse       correctAnswer: boolean
TypeTheAnswer   correctAnswer: string, acceptableAnswers: string[], isCaseSensitive
```

Wikidata is a different shape — **subject, property, value** (*France — capital — Paris*), with
labels per language and a link count per item — so it doesn't slot in as one more article. It is
CC0: no attribution is required, though linking the item is still the honest thing to show.

**The constraint that shapes everything: the facts cannot be queried while a quiz is being
generated.** Measured 2026-10-30:

| Finding | Measured |
|---|---|
| The query service throttles | This server was limited to **1 request a minute**, "created during active wdqs outage"; the Wikidata API answered 429 |
| Queries are slow | 0.5–3 s for a simple one; **29–46 s** for anything walking the class tree (`P279*`); a union of three **timed out** at 60 s |
| Classes are inconsistent | "Cities in Kosovo" by class finds **2** (Prishtina, Han i Elezit) — the rest are modelled as municipalities or other classes |
| Occupations are noisy | The most-linked "Albanian writer" is **Mother Teresa**; an actress's "notable work" is a **TV sitcom** |
| Citizenship is anachronistic | Rilindja writers were Ottoman subjects, so "citizen of Albania" misses Naim Frashëri |
| Values conflict | Lake Shkodër has two areas: **530** and **26,535** (one is in other units) |
| Albanian labels are uneven | Present for 48 of 49 European capitals (Oslo has none); in mixed forms — *Parisi* and *Madridi* are definite, *Romë* and *Londër* aren't |
| Aliases carry junk | Kosovo's include *KOS*, *XK* and 🇽🇰 alongside *Kosova*, *Republika e Kosovës* |
| Albanian coverage is uneven | Literature is thin — **9** author–work pairs with Albanian titles where the work is recorded as literary; geography is good — Albania's peaks have heights and Albanian names, ranked sensibly (Korab, Jezerca, Dajti…) |

So a query is a thing to **build, check and store**, not to run per request — and Wikidata is a
general-knowledge source with patchy Albanian depth, not a replacement for Wikipedia.

## 2. Options

### A. Free-form: resolve the topic to an item, give the model its facts

*"Albania" → Q222 → every statement → the model picks.* Q222 has dozens of properties, the
largest group of them demonyms; most of the rest are identifiers and dates nobody asks about.
The model would choose the trivia, the queries run live, and the noise in the table above flows
straight into questions. This is the "random facts no one cares about" outcome. **Rejected.**

### B. Curated fact sets ("packs")

A **pack** is a small, reviewed definition: one query, the property it asks about, quality
gates, and question templates. Examples: *Capitals of Europe*, *Peaks of Albania*, *Chemical
elements*, *FIFA World Cup winners*. A build step runs the query **offline**, applies the gates,
and writes the result to a data file — a few hundred facts per pack — which the app reads.
Generation never touches Wikidata.

- **Cost:** a pack is written by hand and checked once (its count, a skim of its rows). That is
  the point: a human decides which relation is worth asking.
- **Blast radius:** a new generation mode or a wizard choice, a pack loader, a question builder.
  The payload, parser and review are unchanged — packs produce the same three types.

### C. Entity-anchored, with a property whitelist per class

The topic resolves to an item, and a per-class whitelist (for a country: capital, currency,
official language, highest point, neighbours) picks which statements become questions. More
flexible than packs, but needs a reliable class for the item — the table shows that isn't
given — and live lookups or a large cache. A natural second step once packs work.

## 3. Recommendation

**B, packs.** C later, reusing B's templates and gates.

### Getting the data

- **A build script, not a request path.** `facts:build <pack>` runs the pack's query against the
  query service with a descriptive User-Agent, applies the gates, and writes
  `data/facts/<pack>.json`. Run by hand or monthly, one query per pack, so the throttle never
  matters.
- **The data files are committed.** CC0 allows it, a pack is a few kilobytes, and a refresh shows
  up as a diff a human reads: a capital that changed, a peak that lost its Albanian name.
- **Queries stay simple:** a fixed class or a short list of items (`VALUES`), no class-tree walks
  where a list will do — the slow and timed-out queries above were all tree walks.

### Choosing what is worth asking — three filters

1. **The relation is chosen by a person.** The pack names the property: *capital*, *highest
   point*, *elevation*. The model never picks what to ask about, so demonyms and identifiers
   never become questions.
2. **Popularity ranks the subjects.** Wikidata's sitelink count — how many Wikipedias have an
   article — is a good proxy for "has anyone heard of it": France and Turkey 428, Korab 48,
   Liqeni i Bovillës 15. A pack sets a floor (say 20), and **difficulty falls out of it**: the
   best-known third is Easy, the least-known third Hard. Of 437 people tagged "Albanian writer",
   36 have 20 or more links.
3. **Quality gates drop a fact rather than guess.** A label in the quiz's language is required —
   a missing Albanian name is skipped, never filled with English (§4d of the source-tiers
   proposal). One best-ranked value only: conflicting values (Lake Shkodër) drop the fact.
   Quantities are converted to the pack's unit. Aliases are kept only if they look like words —
   no all-caps codes, no symbols.

### The question formats

Templates per pack, mapped onto the three existing types:

| Type | Built from a fact like *France — capital — Paris* |
|---|---|
| MultipleChoice | "What is the capital of France?" — correct: Paris; wrong: three other capitals **from the same pack**, nearest in popularity, so they are plausible |
| MultipleChoice, reversed | "Paris is the capital of which country?" |
| TrueFalse | Half the time the true pairing, half a sibling's ("Madrid is the capital of France") |
| TypeTheAnswer | correct: the label; `acceptableAnswers`: the filtered aliases (*Prishtina*, *Prishtinë*, *Priština*) |
| Numbers — heights, areas, years | Never typed exactly. "Which is the highest?" over four peaks, or a year question with well-spaced wrong years |

**Albanian needs the model, English doesn't.** An English template is a sentence with slots. An
Albanian one isn't: "Cili është kryeqyteti i {Francë}?" needs the genitive *Francës*, and the
labels arrive in mixed forms anyway (*Parisi*, *Romë*). So in Albanian the model **phrases**
a question whose facts are locked: it gets the fact and the options, writes the sentence, and the
parser checks that the options came back unchanged. The model is the writer, not the source, so
it can't introduce a wrong answer, which is the failure this whole line of work exists to remove.
In English the template can skip the model entirely, so a fact quiz costs no generation quota.

**Provenance.** Each question carries the fact as its `sourceQuote` ("Kryeqyteti i Francës:
Parisi") and the review links the Wikidata item, the same way an article is linked today.

### Which packs first

The measured ones that came back clean: **Capitals of Europe** (49 states, Albanian names for
48), **Peaks of Albania** (heights, Albanian names, sensible ranking). Then packs where Wikidata
is known to be complete: chemical elements, planets, World Cup winners and hosts. **Not**
Albanian literature: 9 rows is not a pack. That belongs to Albanian Wikipedia and Wikisource.

### A side effect worth having

A fact question has an identity — *subject, property, template* — so two authors' "capital of
France" questions are the same question by construction. The duplicate detection discussed for
the question pool needs no similarity search for these: an exact match finds it.

## 4. Open questions

- **Where it lives in the wizard.** A third mode beside Topic and Source ("From facts"), a
  "General knowledge" choice that lists the packs, or the model routing a typed topic to a pack.
  Explicit choice first; routing once there are enough packs to route between.
- **Contested facts.** Wikidata records Kosovo as a sovereign state. A pack's query decides
  what is in it, so each pack's definition is a deliberate choice, reviewed like code.
- **Refresh cadence** — monthly, or on demand from the admin dashboard.
- **Mixing packs and articles in one quiz** — a quiz half from *Capitals of Europe*, half from a
  Wikipedia article. Probably not in the first version.
