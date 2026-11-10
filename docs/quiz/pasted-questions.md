# Paste questions — bring questions from your own AI into the builder

Any signed-in author can paste questions into a quiz they're building: they ask their own AI (ChatGPT,
Gemini, anything) for questions in our format, paste its reply, and get draft questions in the
builder's list to check and edit like any other. This is the own-AI path for questions only, and
the one AI-shaped help normal users have — the generation wizard and its copy-paste page are for
Admins, SuperAdmins and Teachers ([`ai-quiz-two-paths.md`](./ai-quiz-two-paths.md)).

> **Status: implemented (2026-11-10)** on branch `question-bank-rules-and-image-import`. Decided in
> [`../proposals/screenshot-import.md`](../proposals/screenshot-import.md).

## Where it is

- **Desktop builder:** a muted **Paste questions** button beside *Add a question* in the builder's
  header — the secondary action beside the primary (CLAUDE.md, button rank).
- **Quiz overview** (phones, and review): a *Paste questions* item in the *Add a question* menu,
  because the overview's bottom bar has room for one button beside Publish
  ([ADR 0026](../adr/0026-the-quiz-overview.md)).

Both open one dialog (`components/paste-questions/`): three steps — **copy the format**, write or
ask for questions in your AI under it, **paste the whole reply** — and *Add questions*.

## What it does

| | |
|---|---|
| Format | built in the browser (`paste-format.ts`) — JSON with one example of each type, the rules, and the live difficulty names. Nothing is fetched; no AI of ours is involved |
| Parser | `parseAiOutput`, the own-AI path's: each question is checked on its own, and a bad one is dropped with a reason while the rest survive |
| Result | new draft questions appended to the list, **Private**, each marked *Pasted — check* until the builder is left |
| Category, language | not read from the reply — filed under the quiz's own at save, like every builder question (`inherit-quiz-classification.ts`) |
| Difficulty | from the reply if it names a real one; Unspecified otherwise |
| Limits | 30 questions and 60,000 characters a paste (`MAX_PASTED_QUESTIONS`, `MAX_PASTE_CHARS`); extra questions are left out and the notice says how many |
| Pictures | ignored — a pasted `imageQuery` is not searched |

- **Creation only.** A paste never updates an existing question — there are no ids in the format.
  Editing a question someone else owns still edits a copy
  ([ADR 0030](../adr/0030-the-builder-edits-a-saved-question-as-a-copy.md)).
- **No new API.** Pasted drafts are saved with the quiz, through the same calls as hand-written ones,
  so the server's rules apply unchanged.
- **The mark is session-only.** *Pasted — check* asks for a first look; a restored draft
  ([`quiz-draft-persistence.md`](./quiz-draft-persistence.md)) has been in front of its author
  already, so it doesn't carry the mark.

## Why the format is built in the browser

The wizard's own-AI page fetches its prompt from the server, because that prompt carries the topic,
the counts, the categories and a grounding instruction. A paste has none of those: the user brings
the questions, and the format only says how to write them down. Building it client-side keeps the
feature free of any AI endpoint — which is what lets it be open to everyone without a quota.

## Tests and stories

- `components/paste-questions/__tests__/paste-format.test.ts` — the format's own example parses,
  one question of each type, into Private drafts; difficulty names are the real ones.
- `paste-questions-view.stories.tsx` — empty, copied, clipboard blocked, nothing readable, no JSON.
