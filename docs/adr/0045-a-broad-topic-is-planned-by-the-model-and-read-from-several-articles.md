# 45. A broad topic is planned by the model and read from several articles

Date: 2026-11-12
Status: Accepted

## Context

Grounding writes a Topic quiz from an article ([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md)
§2e). It finds the article by matching the topic's words against titles — which assumes the topic
names a subject. Two topics typed on 2026-11-12 showed where that ends:

- **"General Knowledge"** is an exact title match for the article *General knowledge*. The quiz
  was about the concept of general knowledge, with a citation.
- **"History's most significant events"** matches no title. The author was offered a list of
  Wikipedia pages for a topic no single page answers.

Both ask for a *selection across* subjects. Whether a phrase names a subject or asks for a
selection is a question about meaning, and no rule over titles, word counts or search rank
answers it — "General knowledge" and "General relativity" are the same shape.

The source-tiers proposal had already ruled on asking a model about a topic
([`../proposals/topic-disambiguation-and-source-tiers.md`](../proposals/topic-disambiguation-and-source-tiers.md)
§5): *rejected* — a model unreliable enough to state wrong answers is unreliable at knowing when
it is confused, and a pre-flight call costs a round trip. It also left "a quiz from several
articles" open (§6), blocked on the free tier's 6,000-character budget.

Options:

1. **A keyword list** of broad phrases ("general knowledge", "trivia", "most significant…").
   Free and deterministic, and wrong the first time someone types a phrase not on it, in either
   language. It also yields no subtopics, so the quiz would still be written from memory.
2. **Give the model a web-search tool** and let it find its own sources. Loses the one check this
   pipeline has against invented facts: the parser can only verify a `sourceQuote` against text
   *we* handed over. Open web content is also a different licence posture from CC BY-SA articles
   (the proposal's §5), and search is billed per request.
3. **A planning call whose output is only names**, each then resolved by the existing lookup.

## Decision

**Option 3.** Before the article is looked for, `TopicPlanner` makes one small model call: is the
topic one subject or a selection across many, and for the second, which article titles should be
read. `QuizGrounding` looks each title up like any topic and reads only the clear, long-enough
matches, together, as one compound source. A broad topic never asks "which article?" — a
subtopic that doesn't resolve is dropped. Fewer than three resolved articles and the quiz is
written from memory and says so.

This does not reopen what §5 rejected. That was asking a model whether a term is **ambiguous**,
to choose between meanings — "Mercury" is still settled by Wikipedia's own disambiguation page,
before and regardless of any plan. The planner is never asked to pick a meaning, and its answer
is never trusted as fact: it is a list of names that code checks one by one
([ADR 0003](0003-the-model-proposes-the-code-decides.md)). What changed since §5 was written is
also the model — it was the free Groq tier then, DeepSeek V4.1 Flash now.

## Consequences

- **A model call now sits in front of every ungrounded-or-grounded Topic generation** that has no
  article picked yet. It is small (about 500 tokens in, under 100 out, reasoning off), cached per
  topic, and written to the ledger as its own `TopicPlan` row so the spending caps see it. It is
  skipped when no generation could follow. It adds its latency to the wait.
- **A wrong "broad" is the new failure.** A single subject planned as broad gets a quiz spread
  over neighbouring articles instead of its own; a broad topic planned as single is today's
  behaviour. The prompt leans to "single" when in doubt, and a failed or unreadable plan is
  "single". This is **unmeasured** as of this ADR — the eval set gained broad topics to measure it.
- **The compound source is one text.** Prompt, quote check, draft storage and the own-AI path see
  an ordinary grounded source; only the review and the prompt's spread rule know about parts.
  The cost is that a question does not carry which article it came from.
- **`ai-prompt` with `ground: true` is no longer model-free.** It still takes no quota slot.
- **Needs a vendor with room.** Eight openings are about 20,000 characters of prompt.
  `Ai:Source:Broad:Enabled=false` restores one-article grounding for a small-allowance vendor.
- Rejected: option 1 (brittle, and gives nothing to read), option 2 (gives up the quote check and
  the licence posture; revisit as a *fetch-then-quote* tier for topics Wikipedia cannot cover,
  where our code does the searching and the model still only reads what it is handed).
