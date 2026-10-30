# Proposal: which source a grounded generation reads, and who decides when it is ambiguous

**Status: accepted 2026-10-28, implementation in progress.** Rank 3 (English source → non-English
questions) is **rejected** — see §4d. Built 2026-10-29 for Wikipedia, end to end
(server, wizard, eval) and measured — switched off; how it works is in
[`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md) §2e. **Not built:**
the other tiers of §4d (official documentation, governing bodies), which is all that keeps this
proposal open. **§4a bis is superseded** by a measured rule (below). Written 2026-10-28. Prerequisite for Phase 2 of
[`../quiz/ai-question-accuracy-plan.md`](../quiz/ai-question-accuracy-plan.md), which assumes a
source can be picked automatically. The measurements below say it cannot.

Grounding a generation means putting a source document in the prompt. Phase 2b says: search
Wikipedia, take "the first non-disambiguation hit", generate from it. That rule was written
without data. With data, it picks the wrong document often enough that grounding would make bad
questions *more* convincing rather than fewer — a grounded wrong answer arrives with a citation.

This proposal covers three decisions that have to be made together: how a source is chosen, what
happens when the choice is ambiguous, and what happens when the chosen source is too thin to
support the questions.

---

## 1. What was measured

Six queries per language against the MediaWiki search API on 2026-10-28, `srprop=wordcount`.
Small, and it is search-index behaviour rather than question quality — but it is enough to
rule things out.

**English: the first hit is the wrong article in three of five cases.**

| query | 1st hit | words | better hit, further down |
|---|---|---|---|
| `Mercury` | Mercury | 974 | Mercury (planet) 16,170 · Freddie Mercury 17,329 |
| `Human respiratory system` | Human body | 5,622 | Respiratory system 11,254 |
| `Balkans campaign World War II` | Balkans campaign (WWII) | 1,188 | Balkan Front (**World War I**) 2,625 |
| `Photosynthesis` | Photosynthesis | 11,914 | — correct |
| `C Sharp programming language` | C Sharp (programming language) | 8,550 | — correct |

**Albanian: coverage is uneven, and the highest-interest topic is a stub.**

| query | top article | words | |
|---|---|---|---|
| `Historia e Kosovës` | Historia e Kosovës | **276** | stub |
| `Rilindja Kombëtare` | Rilindja Kombëtare Shqiptare | 6,157 | usable |
| `Kuzhina shqiptare` | Kuzhina shqiptare | 1,843 | usable |
| `Futboll` | Futbolli | 871 | thin |
| `Python` | Python | 8,854 | usable — **but it is the snake** |

sq.wikipedia holds 106,477 articles against en.wikipedia's millions. English *Photosynthesis*
alone is longer than four of those five Albanian articles combined.

## 2. Why the two obvious rules are both wrong

**"First non-disambiguation hit"** fails on `Human respiratory system`, where the first hit is
*Human body* — a real article, not a disambiguation page, and the wrong one. Nothing about it is
detectable as a mistake.

**"Pick the longest article"** — raised only to rule it out, never proposed — fails worse. On
`Balkans campaign World War II` it chooses *Balkan Front (World War I)*: wrong war, more words.
On `Mercury` it chooses *Freddie Mercury* over *Mercury (planet)* by a thousand words.

Both rules are confident and silent when wrong, which is the property that makes them dangerous.

## 3. Disambiguation is detectable — reliably, and for free

`prop=pageprops&ppprop=disambiguation` returns the marker MediaWiki sets from the
`__DISAMBIG__` magic word. Verified 2026-10-28:

| page | flagged |
|---|---|
| `Mercury` (en) | **DISAMBIGUATION** |
| `Mercury (planet)`, `Freddie Mercury`, `Photosynthesis`, `Human body` (en) | article |
| `Python`, `Historia e Kosovës`, `Kuzhina shqiptare` (sq) | article |

This corrects an earlier worry that a page titled plain `Mercury`, with no "(disambiguation)"
suffix, would slip through a title-based check. A title-based check would indeed miss it; the
pageprops check does not. It costs no extra request — `pageprops` rides along with the search.

**The hard case is the one it does not catch.** sq `Python` is a genuine article about the snake.
There is no disambiguation page, no marker, and nothing in the response says the user may have
meant the programming language. Detection has a ceiling, and the design has to survive hitting it.

## 4. Proposed

### 4a. A disambiguation page is a question for the author, not a hit to skip

When the top result carries the disambiguation marker, do not generate. Return the candidate
articles and make the author choose.

The UI for this already exists. `useAiQuizDraft` sets `needsConfirmation` when the model's
category or language fails to resolve, and the wizard renders `ConfirmDetailsCard` instead of the
topic box until it is answered. An unresolved *topic* is the same shape of problem and routes into
the same gate — a list of titles with their first sentence, one of which the author picks.

### 4a bis. A much longer runner-up is also a question

> **Superseded 2026-10-29** by title matching (flow doc §2e). Run against the twelve eval topics
> — phrases, as real topics are, where the nine cases below were title-like — this rule asked on
> seven, called a 28-word stub the best article for Albanian cuisine, and silently used the snake
> for "Bazat e programimit në Python". The replacement picks the hit whose *title* matches the
> topic and asks when the match is weak. Kept below as the record of what was tried.

The disambiguation marker only catches terms the source itself knows are ambiguous. It does not
catch `Human respiratory system` returning *Human body*, or `Balkans campaign World War II`
returning the World War I front — both real articles, both wrong, nothing flagged.

The signal that survives is **length against search rank**: when a lower-ranked article is much
longer than the top hit, the search was not confident. Ask instead of guessing. Against the nine
cases measured on 2026-10-28, a 1.5× ratio matches the human judgement on all nine — it fires on
Mercury, Human body, the Balkans and `Historia e Kosovës`, and stays quiet on Photosynthesis,
C Sharp, the 2024 Olympics, Rilindja and Kuzhina.

**That number is fitted, not validated.** It was derived from those nine cases, so matching them is
circular. What it buys is a conversion of three silent wrong picks into three answerable questions;
whether it holds on unseen topics is a Phase 0 measurement, and the ratio is configurable so it can
be moved when there is data rather than argued about now.

A gate that fires on good results is worse than no gate, because people learn to click through it.
That is the thing to watch in the eval: how often it asks when the top hit was right.

### 4b. Always show which source was used, with a link

Cheaper than any detector and catches more, including every case §3 cannot detect. An author
looking at ten questions under the heading *Python (gjarpër)* spots the mistake in a second; the
same author reading ten questions with no provenance spots nothing. It also discharges CC BY-SA
attribution, which the generation has to do anyway.

This is the only one of the three that helps with the sq `Python` case, which is why it ships
even if the other two are deferred.

### 4c. A source under a minimum length is not a source

A 276-word stub is **worse than no source at all**. It is enough for the pipeline to report
"grounded" and show a Wikipedia link, and not enough to carry ten questions — so the model fills
the gap from memory while every signal in the UI says the questions are sourced. The citation
makes the invented answers more credible, not less.

Below the threshold, fall back to ungrounded Topic mode and say so in the review. The threshold
is a guess until Phase 0 has run; 400 words is a starting point, to be set from the data.

A second effect is worth predicting: a thin source will fail more `sourceQuote` checks, so yield
drops. That is already measured per-stage by the eval harness, so the threshold can be tuned
rather than argued about.

### 4d. Source tiers, not "Wikipedia or the open web"

Albanian coverage is not good enough for Wikipedia-only, and open web search imports the web's
error rate into a product whose whole problem is unverified claims. The middle path is an ordered
allowlist, consulted in priority order until one returns a source that clears §4c:

| rank | category | source |
|---|---|---|
| 1 | any | the author's own material (Source mode — already works server-side) |
| 2 | History, Geography, Science, Entertainment | Wikipedia on the quiz's language domain |
| ~~3~~ | ~~same~~ | ~~Wikipedia on `en`, translated-from disclosed~~ — **rejected, see below** |
| 4 | Programming / tech | official documentation domains (learn.microsoft.com, postgresql.org, docs.python.org) |
| 5 | Sports rules | the governing body (FIFA, UEFA) |
| — | anything else | no source: generate ungrounded and say so |

**Rank 3 is rejected (2026-10-28).** An English source producing Albanian questions is a
translation task wearing a generation task's clothes, and translationese is one of the two
complaints that started this work. Handing that task to the current generator — a free-tier
open-weights model whose non-English prose is the problem being fixed — would make the symptom
worse while the UI showed a citation saying the questions were sourced.

The condition under which it could return is specific: a model genuinely strong at translation.
Until then a language with no Wikipedia domain of its own gets **no Wikipedia source**, and the
generation runs ungrounded and says so — which is honest, rather than grounded-in-the-wrong-language
and silent about it.

This is also why `SourceOptions.LanguageDomains` has no fallback entry. A missing language is a
missing source, not a redirect to English.

## 5. Rejected

**Asking the model whether the topic is ambiguous.** A model unreliable enough to state wrong
answers confidently is unreliable at knowing when it is confused, and in a single call it has
already committed to an interpretation before the question is put. A pre-flight call to ask costs
a round trip inside the 100s Cloudflare window to consult a poor judge about something the search
index answers deterministically and for free. If a model-reported flag is added later it
annotates and never blocks, the same discipline Phase 3 applies to verification.

**Scraping arbitrary "trusted" sites.** Wikipedia is CC BY-SA and a link discharges attribution.
An open crawl of other people's content, reworked into a product's quiz questions, is a different
legal posture — see [`legal-and-compliance-for-launch.md`](./legal-and-compliance-for-launch.md).
The tiered allowlist keeps the set small enough to check deliberately.

## 6. Open questions

- The minimum source length. A guess until Phase 0 runs.
- ~~Rank 3 (English source → Albanian questions)~~ — **rejected 2026-10-28**, see §4d. Revisit only
  with a model strong at translation, and measure it before trusting it.
- ~~The close-contest ratio (§4a bis).~~ Replaced by title matching; its thresholds (coverage ½,
  precision ¾) are fitted the same way, and the eval's ask rate is what tests them.
- Does a grounded generation cost the same quota slot? It is up to two calls instead of one.
- Caching. Two HTTP 429s came back inside a dozen probe requests, so the plan's
  `IMemoryCache` by (language, title) is load-bearing, not an optimisation.
- Does the disambiguation gate apply to the own-AI path? It cannot — that path never reaches
  our server — so the two paths diverge here for the first time. That needs its own answer.
