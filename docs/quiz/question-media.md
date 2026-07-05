# Question media (images, audio, video)

How a question carries an optional media attachment, where it is stored, and how it
travels from creation through to the quiz-taking screen.

> Status: **backend implemented**. **Frontend: images work end-to-end** — upload in the
> question editor, dashboard cards, and both quiz-taking screens (single-player + multiplayer)
> render the attachment via a shared `QuestionMedia` component. Remaining: the answer-**review**
> screen (needs media on the `UserAnswer` DTO) and a dedicated audio/video upload path. See
> [Frontend](#7-frontend).

---

## 1. The big picture

A question may have **one** optional media attachment of a single kind:

| Kind  | Examples                          |
|-------|-----------------------------------|
| Image | jpg, png, gif, webp, svg          |
| Audio | mp3, wav, ogg, m4a, aac           |
| Video | mp4, webm, mov, m4v               |

Two things are stored on a question:

- `MediaUrl` — the URL the browser loads.
- `MediaType` — an enum (`None` / `Image` / `Audio` / `Video`) telling the client
  whether to render an `<img>`, `<audio>`, or `<video>`.

The bytes themselves live in the **generic file entity** (`FileRecord` + `FileService`),
not the older image-only entity. The question just keeps the resulting URL.

### Why the file entity and not the image entity?

There are two storage systems in the codebase:

- **Image entity** (`ImageAsset` + `ImageService` + `ImageUploadController`) — older,
  image-only (validates with ImageSharp), talks to `DbContext` directly. Cannot handle
  audio/video.
- **File entity** (`FileRecord` + `FileService` + `FilesController`) — newer, generic,
  polymorphic (`Entity` + `EntityId`), repository-based. This is the one we extended.

The legacy `ImageUrl` column on questions is **kept** so existing image questions keep
working with no data migration; everything new flows through `MediaUrl` / `MediaType`.
On read, a question that only has the old `ImageUrl` is reported as `MediaType = "Image"`.

---

## 2. Data model

### `QuestionBase` (`Models/Questions/Question.cs`)

```csharp
public enum QuestionMediaType { None, Image, Audio, Video }

public abstract class QuestionBase
{
    public string? ImageUrl { get; set; }   // legacy, retained for back-compat
    public string? MediaUrl  { get; set; }   // new: URL of the attachment
    public QuestionMediaType MediaType { get; set; } = QuestionMediaType.None;
    // ...
}
```

### `FileRecord` (`Models/FileRecord.cs`)

Gained `ContentType` (the MIME type, e.g. `video/mp4`):

```csharp
[MaxLength(100)]
public string? ContentType { get; set; }
```

---

## 3. The storage pipeline (`FileService`)

`Controllers/Files/Services/FileService.cs` is where uploads are validated and saved.

- **Allowlists** are grouped by kind (`ImageExtensions`, `AudioExtensions`,
  `VideoExtensions`, `DocumentExtensions`). Adding a new supported extension is a
  one-line change in the relevant set.
- **Per-kind size limits** (`MaxBytesFor`): image 5 MB, audio 20 MB, video 100 MB,
  document 10 MB.
- The MIME type from the upload is saved to `FileRecord.ContentType`.
- `FileDTO` exposes `ContentType` plus a derived `Kind` (`"image"` / `"audio"` /
  `"video"` / `"file"`), computed by `KindFromContentType`, so the frontend can pick the
  right player without parsing the URL.

Files are written to `wwwroot/uploads/files/{guid}.{ext}` and served statically at
`/uploads/files/...`. Static serving supports HTTP range requests, which audio/video
seeking needs.

`Controllers/Files/FilesController.cs` raises the per-request ceiling to 100 MB
(`[RequestSizeLimit(100 * 1024 * 1024)]`). The actual per-kind cap is enforced in the
service. **Note:** Kestrel’s global body limit must also be raised for video — see
[Deployment](#6-deployment-notes).

---

## 4. Request flow

### Creating / editing a question

```
Question editor (frontend, planned)
  1. POST /api/files   (multipart: file, entity="Question", entityId)
       → FileService validates kind + size, stores bytes, returns FileDTO { url, kind, contentType }
  2. POST/PUT the question with MediaUrl = FileDTO.url, MediaType = FileDTO.kind
       → QuestionService → mappers persist MediaUrl + MediaType on the question row
```

DTO carriers: `MediaUrl` + `MediaType` were added to `QuestionBaseDTO`, `QuestionBaseCM`
(create), and `QuestionBaseUM` (update) in `DTOs/Question/QuestionDTOs.cs`.

### Playing a quiz

```
GET next question (QuizSessionService)
  → QuizQuestion.ToCurrentQuestionDto()  (Mapping/EntityMappers.cs)
       → CurrentQuestionDto { MediaUrl, MediaType, ... }
  → frontend renders <img>/<audio>/<video> based on MediaType   (planned)
```

`CurrentQuestionDto` (`DTOs/Quiz/QuizSession-UserAnswerDTO.cs`) previously carried no
media at all — this was the gap that kept images out of the quiz-taking screen.

---

## 5. Files changed (backend)

| File | Change |
|------|--------|
| `Models/Questions/Question.cs` | `QuestionMediaType` enum; `MediaUrl` + `MediaType` on `QuestionBase` |
| `Models/FileRecord.cs` | `ContentType` column |
| `DTOs/Files/FileDTO.cs` | `ContentType` + derived `Kind` |
| `Controllers/Files/Services/FileService.cs` | kind-based allowlists, per-kind size limits, stores content type, derives kind |
| `Controllers/Files/FilesController.cs` | upload size ceiling 10 MB → 100 MB |
| `DTOs/Question/QuestionDTOs.cs` | `MediaUrl` + `MediaType` on base DTO / create / update models |
| `DTOs/Quiz/QuizSession-UserAnswerDTO.cs` | `MediaUrl` + `MediaType` on `CurrentQuestionDto` |
| `Mapping/EntityMappers.cs` | media in read projections, create/update mappers, and `ToCurrentQuestionDto`; `ParseMediaType` helper |

### Mapper details worth knowing

- The question **read projections** (`ProjectBase`, `ProjectMultipleChoice`, …) are used
  directly in `query.Select(...)`, i.e. **translated to SQL**. So media type is emitted
  with a `CASE`-style ternary (not `enum.ToString()`, which SQL can’t translate):

  ```csharp
  MediaType =
      q.MediaType == QuestionMediaType.Image ? "Image" :
      q.MediaType == QuestionMediaType.Audio ? "Audio" :
      q.MediaType == QuestionMediaType.Video ? "Video" :
      (q.ImageUrl != null ? "Image" : "None"),
  ```

- `ParseMediaType(string?)` converts the wire string back to the enum on create/update.

---

## 6. Database migration

The model changes require a migration (run locally — generated migrations are safer than
hand-written ones):

```bash
cd OxygenBackend/QuizAPI
dotnet ef migrations add AddQuestionAndFileMedia
dotnet ef database update
```

This adds `Questions.MediaUrl`, `Questions.MediaType` (int, default `0` = `None`), and
`Files.ContentType`. No backfill is needed — legacy `ImageUrl` is read with a fallback.

---

## 7. Frontend

**Done:**

- **Upload** in the question editor — the create/update forms attach an image via the legacy
  `imageUrl` upload (`@/utils/Image-Upload`).
- **Dashboard cards** render the image (`multiple-choice-question-card.tsx`, etc.).
- **Quiz-taking screens** render the attachment via the shared **`QuestionMedia`** component
  (`src/common/QuestionMedia.tsx`): single-player `question-display.tsx` and multiplayer
  `MultiplayerGame.tsx` both use it. It renders `<img>` / `<audio controls>` / `<video controls>`
  from `mediaType`, falling back to an image for legacy URL-only questions.
- `mediaUrl` / `mediaType` added to the live `CurrentQuestion` type, plus a shared
  `QuestionMediaType` string union in `question-types.ts`.

**Remaining:**

- The answer-**review** screen doesn't show media yet — the `UserAnswer` DTO would need
  `MediaUrl` / `MediaType` (a backend mapper change) before the UI can render it.
- A dedicated **audio/video** upload path in the editor. Today's editor uploads images via the
  legacy endpoint; the generic `POST /api/files` route already supports the other kinds, so the
  remaining work is the picker UI + setting `MediaUrl`/`MediaType` from the returned `FileDTO`.

---

## 8. How to extend

- **Allow a new file extension:** add it to the matching set in `FileService`.
- **Change a size limit:** edit the `*MaxBytes` constants in `FileService` (and the
  controller `[RequestSizeLimit]` / Kestrel limit if raising the video cap).
- **Add a new media kind:** add a value to `QuestionMediaType`, a branch in the mapper
  ternary + `KindFromContentType`, and a renderer on the frontend.
