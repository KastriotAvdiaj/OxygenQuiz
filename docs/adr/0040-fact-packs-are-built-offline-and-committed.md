# 40. Fact packs are built offline and committed, and templates are data

Date: 2026-11-01
Status: Accepted

## Context

Fact quizzes ([`../quiz/fact-quizzes.md`](../quiz/fact-quizzes.md)) turn Wikidata facts into
questions with no model. The facts have to come from somewhere at the moment a quiz is built.
Measured 2026-10-30, the Wikidata Query Service limited one server to a request a minute during
an outage, took 29–46 s for class-tree queries, and timed out on others; its data needed
human judgement besides (conflicting values, missing Albanian names, junk aliases, an entity
called "Kingdom of the Netherlands").

Three places the facts could live:

1. **Queried per quiz**, with a cache. Fast when warm, a 30-second or failed quiz when cold or
   throttled — and nobody sees the data before an author does.
2. **A database table**, refreshed by a job or an admin action. Survives deploys, but a refresh
   changes questions with no review, and the table needs a migration, a repository and an admin UI.
3. **Files in the repository**, written by a build script a person runs, reviewed as a diff.

And the wording: question templates in C#, or in the pack file next to the facts.

## Decision

**Option 3, and templates in the pack file.** `npm run facts:build -- <slug>` runs the pack's
query, applies the gates, and rewrites the pack's `facts`; the change is committed and deployed
with the code. The app reads `FactPacks/*.json` once, on first use. Templates, editorial notes and
label overrides are in the same file.

## Consequences

- **A quiz never waits on Wikidata**, and Wikidata being down never stops one.
- **Every fact an author sees was in a reviewed diff.** A capital that changes, or a peak that
  loses its Albanian name, is noticed in a pull request.
- **Facts are as fresh as the last build** — `builtAt` is shown on the page. Capitals and
  elevations change rarely; a pack about something faster-moving would need a cadence.
- **Wording is fixed without a code change**, and a native speaker can fix Albanian phrasing
  in a JSON file.
- **A new pack is a file, a build and a review** — no migration, no endpoint.
- **The data ships in the image.** A few kilobytes per pack; fine for dozens, worth revisiting at
  hundreds.
- Rejected: per-quiz queries (throttling and timeouts, unreviewed data), a table (unreviewed
  refreshes, and a schema for something a file does).
