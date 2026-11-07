# 39. Microsoft Learn is asked only when Wikipedia isn't sure

Date: 2026-10-30
Status: Accepted — supersedes the "every source, every time" half of [ADR 0038](0038-every-source-is-searched-and-the-titles-decide.md); its combining rules stand

## Context

ADR 0038 searched Wikipedia and Microsoft Learn for every English topic, in parallel, and let
the titles decide. That made Learn a second request on every English generation — for a source
that serves a small share of topics (Microsoft's languages, tools and services). Parallel calls
hide the time, but not the load on a free, unauthenticated service we have no agreement with,
nor the extra failure surface: a Learn outage on "Photosynthesis" would have been reported to the
author as a source being down.

The obvious alternative — analyse the topic first and call Learn only for technical ones — needs
a classifier: a keyword list (which misses "Git branching", "Kubernetes", next year's product
names, and has to be kept up) or a model call (the judgement this work keeps out of the model's
hands, and a round trip). Both decide *before* knowing whether Wikipedia already has the article.

## Decision

**Wikipedia first; Learn only when Wikipedia's answer doesn't settle it.** Settled means a clear
title match, or a disambiguation page (a question another source can't take away —
`SourceRouting.Settles`). Unsure, a stub, nothing, or Wikipedia unreachable: Learn is asked, and
the two answers are combined by ADR 0038's rules. The topic itself is never classified; Wikipedia's
own uncertainty is the signal.

## Consequences

- **A general topic costs one source.** On the fifteen English probe topics (2026-10-30), Learn was
  called for six — C# 12, Azure Functions, SQL Server indexes, Git branching, Python, Azure — and
  not for Photosynthesis, the respiratory system, World War II in the Balkans, Mercury, PowerShell,
  Kubernetes, TypeScript, Visual Studio Code or Entity Framework. Every topic got the same answer
  as under ADR 0038.
- **Topics that reach Learn wait for both, one after the other**: about a second more, on the
  topics that either ask the author anyway or are Learn's.
- **A Wikipedia clear match is never weighed against Learn.** "Entity Framework Core migrations"
  stays on Wikipedia's general article (already the case, `known-issues.md`); under ADR 0038 Learn
  could only have offered its page, never replaced a clear match, so nothing is lost.
- **A Wikipedia outage doesn't block technical topics**: Learn is still asked, and used if sure.
- A future source is ordered by registration in `Program.cs`; the first serving a language is
  always asked.
- Rejected: classifying the topic first (keyword list or model call), for the reasons above.
