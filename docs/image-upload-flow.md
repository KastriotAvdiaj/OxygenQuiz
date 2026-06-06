# Image Upload Flow (ImageAsset pipeline)

This documents the **existing** image upload system used when authoring quizzes and
questions. It is a validated, **draft-aware** pipeline: an image can be uploaded and
previewed *before* the entity that owns it exists, and any image that is never attached
is garbage-collected automatically.

> TL;DR — uploading an image is **two phases**: (1) upload + validate (returns a URL),
> (2) associate the URL with a saved entity. Phase 1 is required to get a usable image;
> phase 2 is what keeps the image from being cleaned up.

---

## Why it works this way

When you create a question or quiz, the entity doesn't have a database ID yet, but the
author still wants to upload and preview the image as part of the form. So the image is
uploaded first and stored as an **orphan** (`IsUsed = false`). Once the entity is saved
and has a real `int` ID, the client calls *associate* to bind the image to it
(`IsUsed = true`). Anything left orphaned (the user uploaded then abandoned the form) is
swept by a daily cleanup job.

The owning entity stores the image **URL directly** (`Question.ImageUrl`, the quiz image
field, `User.ProfileImageUrl`). The `ImageAsset.EntityType` / `EntityId` columns are
bookkeeping for cleanup and auditing — they are **not** a foreign key.

---

## Components

| Piece | Location | Responsibility |
|---|---|---|
| `ImageUploadController` | `Controllers/Image/ImageUploadController.cs` | HTTP endpoints: upload + associate |
| `IImageService` / `ImageService` | `Controllers/Image/Services/` | Save to disk, associate, delete, cleanup |
| `ImageCleanUpService` | `Controllers/Image/Services/ImageCleanUpService.cs` | Hangfire entry point for the daily sweep |
| `ImageAsset` | `Models/ImageAsset.cs` | DB record of a stored image |

### `ImageAsset` schema

| Column | Type | Notes |
|---|---|---|
| `Id` | `int` | PK |
| `FileName` | `string` | stored name on disk (`{guid}.{ext}`) |
| `OriginalFileName` | `string` | the uploader's original filename |
| `FileFormat` | `string` | e.g. `png` |
| `FilePath` | `string` | absolute path on disk |
| `IsUsed` | `bool` | `false` until associated with an entity |
| `EntityType` | `string?` | e.g. `"Question"` (set on associate) |
| `EntityId` | `int?` | id of the owning entity (set on associate) |
| `CreatedDate` | `DateTime` | upload time (used by cleanup) |
| `LastModifiedDate` | `DateTime?` | set on associate |

---

## Endpoints

### 1. Upload — `POST /api/ImageUpload/question`

`multipart/form-data` with a single `file`. Despite the route name, it is the generic
image-upload endpoint.

Validation (rejected with `400` on failure):
- Non-empty file, size ≤ **5 MB**.
- Content is actually a decodable image (validated with **ImageSharp**, not just the
  content-type header).
- Dimensions ≤ **2000 × 2000**.
- Format ∈ { **JPEG, PNG, GIF** }.

On success: the bytes are written to `wwwroot/uploads/{guid}.{ext}`, an `ImageAsset` row
is created with `IsUsed = false`, and the response is:

```json
{ "url": "https://host/uploads/<guid>.<ext>" }
```

The client stores that URL on the form (and shows a preview).

### 2. Associate — `POST /api/ImageUpload/associate`

Called **after** the owning entity has been saved and has an `int` id.

```json
{ "imageUrl": "https://host/uploads/<guid>.png", "entityType": "Question", "entityId": 42 }
```

Looks the image up by filename, sets `IsUsed = true`, `EntityType`, `EntityId`,
`LastModifiedDate`. Returns `404` if the image row isn't found, otherwise
`{ "success": true }`.

---

## Lifecycle (sequence)

```mermaid
sequenceDiagram
    participant U as Author (client)
    participant API as ImageUploadController
    participant SVC as ImageService
    participant FS as Disk (wwwroot/uploads)
    participant DB as ImageAssets table
    participant HF as Hangfire (daily 02:00)

    U->>API: POST /ImageUpload/question (file)
    API->>API: validate (size, real image, dims, format)
    API->>SVC: SaveImageAsync(stream, name, ext)
    SVC->>FS: write {guid}.{ext}
    SVC->>DB: insert ImageAsset (IsUsed=false)
    API-->>U: { url }

    Note over U: user finishes the form; entity is saved and gets an int id

    U->>API: POST /ImageUpload/associate (url, entityType, entityId)
    API->>SVC: AssociateImageWithEntityAsync(...)
    SVC->>DB: IsUsed=true, set EntityType/EntityId

    Note over HF: if the user abandoned the form, the image stays IsUsed=false
    HF->>SVC: CleanUpUnusedImagesAsync()
    SVC->>DB: find IsUsed=false older than 24h
    SVC->>FS: delete files
    SVC->>DB: delete rows
```

---

## Cleanup job

`ImageService.CleanUpUnusedImagesAsync()` deletes every `ImageAsset` with
`IsUsed = false` and `CreatedDate` older than **24 hours**, removing both the file and the
row. It is scheduled in `Program.cs`:

```csharp
RecurringJob.AddOrUpdate<ImageCleanUpService>(
    "image-cleanup-daily",
    service => service.RunCleanupAsync(),
    Cron.Daily(2)); // 02:00 every day
```

Deleting an associated image (e.g. when a question is deleted) goes through
`DeleteAssociatedImageAsync`, which removes the physical file and the row. Note it does
**not** call `SaveChanges` itself — the calling service commits as part of the entity
delete.

---

## What is required vs optional

- **Upload (phase 1) is required** to obtain a usable image URL and preview.
- **Associate (phase 2) is effectively required to keep the image** — without it the
  image is treated as an orphan and removed by the daily sweep. It is "optional" only in
  the sense that nothing crashes if you skip it; you just lose the image after 24h.
- The image itself is optional on the entity (`ImageUrl` / `ProfileImageUrl` can be empty).
