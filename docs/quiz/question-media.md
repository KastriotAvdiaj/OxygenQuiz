# Question media — what a question carries and where it is shown

A question may have **one** optional image or audio clip. This doc is about the question side: the
fields, the wire shape and every screen that renders it. How the file is uploaded, checked, stored,
charged and swept is [`../media/media-pipeline.md`](../media/media-pipeline.md).

> **Status: images and audio implemented end to end (2026-10-24).** Video is designed for (the enum
> value exists) but not accepted by the pipeline yet. This doc used to describe an editor that
> uploaded images through the old `/ImageUpload` endpoint and a `/api/files` route for the other
> kinds; both are gone.

---

## 1. On the question

[`QuestionBase`](../../OxygenBackend/QuizAPI/Models/Questions/Question.cs):

| Field | What it is | Who writes it |
|---|---|---|
| `MediaAssetId` | The attached `MediaAsset`, or null | `MediaAttachmentService`, from the save's `mediaAssetId` |
| `MediaUrl` | Copy of the asset's public URL | the same service, together with the id |
| `MediaType` | `None` / `Image` / `Audio` (`Video` reserved) | the same service, from the asset's kind |
| `MediaCountedAt` | When it was charged to the saver's daily quota; null when free | the same service |

**A client sends `mediaAssetId` and nothing else** — no URL, no type
([ADR 0032](../adr/0032-media-is-attached-by-id-and-the-server-writes-the-url.md)). The URL and type
are copied onto the row so every read path works without a join. The legacy `ImageUrl` column was
dropped in the `AddMediaPipeline` migration, with the fallbacks that read it.

## 2. On the wire

- **Read** (`QuestionBaseDTO` and subtypes): `mediaAssetId`, `mediaUrl`, `mediaType` — the editor
  sends `mediaAssetId` back unchanged on save.
- **Play** (`CurrentQuestionDto`, the multiplayer `RoundQuestionView`, `UserAnswerDto` on the results
  screen): `mediaUrl`, `mediaType` only.
- **Write** (`QuestionBaseCM`/`UM`, `AiImportQuestionCM`): `mediaAssetId`. The read projections are
  translated to SQL, so `MediaType` is emitted with a ternary, not `enum.ToString()` (CLAUDE.md).

## 3. Where it renders

Through the shared [`QuestionMedia`](../../src/common/QuestionMedia.tsx) (`<img>` / `<audio controls>`)
everywhere a saved question is shown:

| Screen | File |
|---|---|
| Single-player play | `src/pages/Quiz/Sessions/components/quiz-taking-process/question-display.tsx` |
| Multiplayer play | `src/pages/Quiz/Multiplayer/components/game/multiplayer-question-view.tsx` — until 2026-10-24 the round sent only the legacy image column, so audio and every newer image never reached a lobby |
| Results review | `src/pages/Quiz/Sessions/components/quiz-results/question-review.tsx` |
| Dashboard question cards and the "test question" preview | `src/pages/Dashboard/Pages/Question/Components/…` |
| Builder: review list | `…/Create-Quiz-Form/components/overview/question-review-card.tsx` |
| Builder: saved-question cards | `…/existing-display-quiz-question-card/display-quiz-question-image-preview.tsx` (hover preview for an image, a small player for a clip) |

Editors attach media with [`MediaPicker`](../../src/features/media/components/media-picker.tsx) — the
six dashboard question forms and the three builder question cards; a builder copy of a saved question
(ADR 0030) keeps pointing at the same file, which costs nothing against the quota.

## 4. Adding a kind

Video, when it comes: accept it in `MediaProcessor` (and decide transcoding), add a `MediaKind`, map it
in `MediaAttachmentService` to `QuestionMediaType.Video`, and `QuestionMedia` already renders
`<video controls>`.
