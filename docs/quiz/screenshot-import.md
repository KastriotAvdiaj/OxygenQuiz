# Screenshot import — admins turn screenshots into questions, a person saves them

An Admin or SuperAdmin adds up to ten images on the admin Questions page — screenshots of a quiz
show, a worksheet photo, a typed list — and a model **copies** the questions on them. A second call
fills in what an image didn't show (the answer, wrong options, other accepted spellings). Nothing is
written until the reviewer saves the rows they keep, through the ordinary create endpoints. It never
generates questions from text on an image and never translates.

> **Status: built, switched off (2026-11-10)** on branch `question-bank-rules-and-image-import`.
> `Ai:ScreenshotImport:Enabled` stays `false` until the test set below passes. Decided in
> [`../proposals/screenshot-import.md`](../proposals/screenshot-import.md).

## How it runs

| Step | |
|---|---|
| Where | admin Questions page → *Add Question* → a fourth card, **From a screenshot**, shown only when `GET /api/questions/screenshot-import/status` says it's on |
| Images | JPEG, PNG or WebP, ≤ 10 MB and ≤ 40 MP each, at most 10 an import — added by choosing, dropping or pasting |
| Per image | `POST /api/questions/screenshot-import/read` (one image per request, three at a time), so each image has its own status, *Try again* and charge |
| The image | through `MediaProcessor.ProcessImage` — format sniffed from the bytes, the header read before any pixel is decoded (the decompression-bomb defence), one frame — shrunk to 1344 px, metadata stripped, sent as WebP, **discarded**. Never stored |
| Call 1: read | the image plus a prompt that says copy, don't invent; **reasoning `none`** (`ReadReasoningEffort`): copying text needs no thinking, and thinking is most of a call's cost |
| Call 2: complete | text only, the vendor's reasoning — only for questions missing an answer, wrong options or alternates. If it fails, what was read is still offered; rows with no answer are dropped |
| Decided by code | `ScreenshotImportService.Build` ([ADR 0003](../adr/0003-the-model-proposes-the-code-decides.md)): category, difficulty and language matched by name to existing rows only, never Unspecified (no match → the reviewer chooses); an `imageQuery` that looks like a link is dropped; the answer is never also a wrong option |
| Duplicates | same wording as a question in the bank → *Possible duplicate of #id*, unticked, never blocked |

## The review list

Each row says where its answer came from — **Answer from the image** or **Answer suggested — check**
(or *Options suggested*) — so the reviewer knows which to look at hardest. *Make them* (Multiple choice
by default, As they appear, Type the answer) sets each row's starting type; a row can switch, because
the reply always carries the answer, three wrong options and alternates. True/false stays true/false.
Rows start **Public**, with a switch. A question whose picture *is* the question ("what is missing
from this flag?") shows greyed out as *Needs its picture — not supported yet*: it would need two
images, the one asked about and the one shown after answering.

## Allowance, cost, record

- **Per image, its own count** (`DailyImagesPerAdmin`, 30); SuperAdmins uncounted. An image that fails
  or has no questions costs nothing from it. The site-wide spending caps apply to every call.
- Usage rows are `AiGenerationMode.ScreenshotImport`. Quiz generation's slots count **only** Topic and
  Source rows (`CountSlotsUsedSinceAsync`) — before 2026-11-10 they counted every succeeded row, so a
  category-palette proposal took one of an Admin's two daily quiz slots.
- Burst guard: its own rate limit, 20 reads a minute (`screenshot`), since `ai`'s six would trip on one
  import.
- One `ScreenshotRead` audit entry **per image** (question count, type choice) — no image, no new
  column. The questions saved are logged as `QuestionCreated`, as any are.
- **Estimated** $0.002–$0.008 a screenshot with thinking on; reading with thinking off should be well
  under that. To be measured, below.

## Before it is switched on

1. **A test set of ~20 real screenshots** — with answers shown, answers missing, duplicates, Albanian
   ones, and a picture-is-the-question one — read with `ReadReasoningEffort` `none` and `low`,
   recording accuracy and real cost from the usage rows.
2. **Checking suggested answers against Wikipedia** (the existing grounding, ADR 0038/0039) was
   decided but **is not built**: suggested answers are only marked *check*. Build it, or decide the
   mark is enough, from what the test set shows. In `known-issues.md`.
3. Development runs it against the fake provider (`Ai:Provider = Fake`), whose canned reply has one
   row of every state.

## Settings — `Ai:ScreenshotImport`

| Key | Default | |
|---|---|---|
| `Enabled` | `false` | also needs `Ai:Enabled` and a vendor entry with `AllowsImages: true` (`openrouter-deepseek` has it) |
| `DailyImagesPerAdmin` | 30 | |
| `MaxEdge` | 1344 | the long edge sent |
| `ReadReasoningEffort` | `none` | blank keeps the vendor's |
| `ReadMaxOutputTokens`, `CompleteMaxOutputTokens` | 3000, 3000 | |
| `MaxQuestionsPerImage` | 15 | |

## Tests and stories

- `QuizAPI.Tests/Ai/ScreenshotImport/ScreenshotImportServiceTests.cs` — every row state, where answers
  came from, type choice, thinking off and WebP on the read, empty images free, the daily allowance,
  off-switches, a non-image refused before any call, and no quiz slot taken.
- `Components/Screenshot-Import/__tests__/review-model.test.ts` — what may be saved and what a save sends.
- `screenshot-review-row.stories.tsx` — from the image, suggested, true/false, possible duplicate,
  needs its picture, missing category.
