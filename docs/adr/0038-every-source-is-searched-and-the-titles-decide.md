# 38. Every source is searched, and the titles decide which one writes

Date: 2026-10-30
Status: Partly superseded by [ADR 0039](0039-microsoft-learn-is-asked-only-when-wikipedia-isnt-sure.md) (same day) — Learn is now asked only when Wikipedia isn't sure; the combining rules below stand

## Context

Grounding writes a Topic quiz from an article ([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md)
§2e). Wikipedia was the only source; Microsoft Learn is the second, for the English technical
topics Wikipedia covers badly ("New features in C# 12 and .NET 8" had no usable article). With two
sources, something has to decide which one a topic is written from.

The proposal ([`../proposals/topic-disambiguation-and-source-tiers.md`](../proposals/topic-disambiguation-and-source-tiers.md)
§4d) planned a fixed order by category — Wikipedia for history and science, official
documentation for programming — "consulted in priority order until one returns a source". Three
ways to do it:

1. **Order by category.** Needs the topic's category before generation. The wizard doesn't have
   one (the model suggests it afterwards), and guessing it — by keyword list or by asking the
   model — is a judgement this work keeps away from a model that is unreliable at exactly that.
2. **Fixed order, first that finds something.** Wikipedia first: Learn would only ever be asked
   when Wikipedia found nothing — but Wikipedia finds *something* for almost any English topic
   ("Azure Functions" → *Microsoft Azure*), so Learn would rarely be reached. Learn first: its
   semantic search answers every query, "Photosynthesis" included (with Azure Quantum).
3. **Search all, compare.** Each source already applies the title rule (`SourceSelection`) and
   says whether it has a clear match; a router combines the answers.

## Decision

**Option 3.** Every source that serves the quiz's language is searched in parallel, and
`SourceRouting` combines their answers: a Wikipedia disambiguation page asks regardless; one
clear match is used; two clear matches are settled by the better title, and a tie asks;
otherwise everything offered is offered together, each row naming its source.

Two rules keep Learn's always-answering search out of the way: its pages are only offered when
they share as many topic words as a confident match needs, and only documentation pages on
learn.microsoft.com are considered at all.

## Consequences

- **No category, no keyword list, no model call** decides the source. Measured on fifteen
  English topics, the router used Wikipedia for the general ones, Learn for *Azure Functions*, and
  asked where both had partial matches (2026-10-30, the flow doc's table).
- **A lookup costs the slower source, not the sum**: 0.5–1.3 s, against 10–40 s in the model. Two
  services are called per English topic, and both are cached.
- **A clear match beats a merely unclear one.** "Entity Framework Core migrations" takes
  Wikipedia's *Entity Framework* (clear by the rule, but more general) over Learn's
  *Migrations Overview* (a better page, offered only as a question). Logged in
  `known-issues.md`; the fix belongs in the title rule, not the router.
- **The answer to "which article?" names its source**: `sourceProvider` with `sourceTitle`, which
  for Learn is the page's URL (titles aren't unique there). The server only fetches Learn URLs.
- A third source is a provider and a registration; the router needs no change.
- Rejected: option 1 (needs a category the request doesn't have), option 2 (either order starves
  one source).
