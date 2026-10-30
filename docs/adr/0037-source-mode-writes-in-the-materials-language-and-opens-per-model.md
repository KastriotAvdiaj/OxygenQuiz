# 37. Source mode writes in the material's language, and opens per model

Date: 2026-10-29
Status: Accepted

## Context

Source mode makes a quiz from the user's own material: pasted text, or a PDF, Word or text file
the server reads. Two questions had to be settled before it could ship.

**What language are the questions in?** The material has a language; the quiz has a language;
they need not be the same. Translating (an English article into an Albanian quiz) needs a
target-language choice the wizard does not have, and is weak even on strong models — the
questions, the options and the explanation all have to survive it, and the `sourceQuote` check
only works on the untranslated text. The Phase 0 eval measured the current model at 24.6% wrong
answers and 3.12/4 fluency in Albanian *without* translation
([`../quiz/ai-question-accuracy-plan.md`](../quiz/ai-question-accuracy-plan.md)).

**When is it good enough to offer?** On the current model (Groq's free `gpt-oss-120b`) it is
not: the error rate above, and a full 40,000-character source does not fit the free tier's
tokens-per-minute ceiling. But the code is the same whichever model runs it, and the next model
may well be good enough.

## Decision

**Questions are written in the material's own language, and only English and Albanian are
accepted.** The server detects the language deterministically, from function-word frequencies
(`SourceLanguageDetector`), before any quota is reserved, and pins the prompt's language
vocabulary to it. Anything else — German, Serbo-Croatian, an even mix — is refused with
`UnsupportedLanguage` and spends nothing. Translation is deferred until a model is good enough
to measure it.

**Source mode opens per model, in the vendor catalogue.** `Ai:Vendors:<name>:AllowsSourceMode`
defaults to false; the generate and upload endpoints refuse Source mode unless the selected
entry sets it, and `GET /quiz/ai-quota` reports it as `sourceModeEnabled` so the UI shows
"Coming soon". A flat `Ai:SourceModeEnabled` is ignored. The offline stub turns it on so the
flow can be tried locally.

## Consequences

- Choosing a stronger vendor opens the mode with no code change and no frontend release — and a
  vendor swap cannot open it by accident, because the flag travels with the entry.
- A user with a German document is turned away rather than given a German quiz the app has no
  language row for, or an Albanian one translated badly. The wizard says the rule above the box,
  so nobody learns it from the error.
- A wrong language guess costs nothing but a click: refusals happen before quota, and the
  detector is tested against eight languages and against the 120 questions of the Phase 0 run.
- Adding a language means adding it to `SourceLanguageDetector.Supported` (its function words
  are already there for the common neighbours) and having a `QuestionLanguages` row for it.
- Before any entry sets `AllowsSourceMode`, Source mode should be measured the way Topic mode
  was: the eval harness has no source topics yet
  ([`../quiz/ai-quiz-generation-flow.md`](../quiz/ai-quiz-generation-flow.md) §9.16).
