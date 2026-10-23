# Generic File Storage (Files entity) — avatars only

The generic file store (`FileRecord` + `FileService`): attach-on-upload, polymorphic owner, an
uploader audit trail. It was built for avatars, product photos and documents; today **only avatars use
it**, through `AvatarService`, and it has no HTTP endpoint of its own. Question and quiz media live in
the media pipeline instead ([`media-pipeline.md`](media-pipeline.md)).

> TL;DR — a feature service calls `IFileService.UploadAsync(file, entity, entityId, uploadedBy)`, which
> checks the extension and size, writes `wwwroot/uploads/files/{guid}.{ext}` and inserts the record in
> one step. No draft phase and no orphan cleanup, because the owner is known at upload time.

---

## Purpose

A single, reusable place to attach arbitrary files to arbitrary owners — things the image
pipeline was never meant for:

- **Avatars** (`entity = "User"`)
- **Product photos** (`entity = "Product"`)
- **Documents** (`entity = "Document"`) — PDFs, spreadsheets, etc.

The association is **polymorphic**: `Entity` (a logical type name) + `EntityId` (the
owner's id as a string, so it fits both `Guid`- and `int`-keyed owners). There is no
foreign key — this is deliberate, so the store doesn't need to know about every owner
table. The trade-off is no database-level referential integrity (acceptable for loosely
coupled attachments).

### On disk: `wwwroot/uploads`

Uploaded files are written under `OxygenBackend/QuizAPI/wwwroot/uploads/` and served by
`UseStaticFiles()`. They are runtime data, so git ignores everything in that folder **except
`uploads/.gitkeep`**, which is what makes the folder — and `wwwroot` itself — exist in a fresh clone.
Without it (2026-09-30 to 2026-10-03) a new checkout had no `wwwroot`, and the API stopped at
startup with `DirectoryNotFoundException: …\QuizAPI\wwwroot\`. The csproj's
`<Folder Include="wwwroot\uploads\" />` doesn't help: it only shows the folder in Visual Studio. In
Docker the image creates `/app/wwwroot/uploads` itself and mounts a volume there
([`../deployment/infrastructure.md`](../deployment/infrastructure.md) §9).

### `FileRecord` schema (table `Files`)

| Column | Type | Notes |
|---|---|---|
| `Id` | `Guid` | PK |
| `Entity` | `string` | logical owner type, e.g. `"User"`, `"Product"`, `"Document"` |
| `EntityId` | `string` | owner id (string holds Guid or int) |
| `Filename` | `string` | original filename |
| `FilePath` | `string` | stored path, e.g. `uploads/files/{guid}.{ext}` |
| `FileSize` | `long` | bytes |
| `UploadedBy` | `Guid?` | uploader (from the JWT) |
| `CreatedAt` | `DateTime` | upload time |

---

## No public endpoints — callers reach the store through a feature service

> **Status: endpoints removed (2026-10-23).** `FilesController` (`POST`/`GET`/`DELETE
> /api/files`) is gone.

The store is a library, not an API. A feature that needs it — today only `AvatarService` —
injects `IFileService` and decides the owner itself (`entity = "User"`, `entityId` = the caller
from the JWT), so a client never names an owner.

The controller that used to sit on top let any signed-in caller **delete any file by id**, **list
any owner's files**, and upload up to 100 MB of unchecked bytes under an owner string it made
up. Nothing in the SPA called it. Patching it with ownership checks would have meant designing
ownership for owners that don't exist yet, so it was removed instead; question and quiz media
get their own pipeline ([`docs/proposals/media-pipeline.md`](../proposals/media-pipeline.md)).
`Security/FileStoreEndpointsTests.cs` fails if any controller injects `IFileService` again.

Validation (in `FileService`): extension ∈ an allowlist (images, audio, video, common
documents), with a size cap per kind — image 5 MB, audio 20 MB, video 100 MB, document 10 MB
(see [question-media.md](../quiz/question-media.md) §3). The extension is the only check: the
bytes are not inspected, which is why `AvatarService` decodes the image itself before calling
the store.

---

## Avatar change (implemented)

Users can change their profile picture, built on top of this Files store but with stricter,
avatar-specific safety.

- **Endpoint:** `POST /api/users/me/avatar` (`[Authorize]`, multipart `file`, ≤ 5 MB). The user is
  taken from the JWT — you can only change your own.
- **Validation (`AvatarService`):** image-only allowlist (**JPG / JPEG / PNG / WebP**) **plus a real
  content check** — the bytes are decoded with ImageSharp and the actual format is confirmed, so a
  non-image renamed to `.png` is rejected. **SVG is intentionally excluded** (it can carry scripts →
  stored XSS).
- **Storage:** the file goes through `IFileService` with `entity = "User"`, `entityId = <user id>`.
  The user's `ProfileImageUrl` is set to the new file's **absolute** URL, and the **previous avatar
  is deleted** so old files don't pile up.
- **Frontend — crop before upload (since 2026-10-23):** the avatar shows a hover-to-change overlay and
  a pencil badge (the badge is what a touch screen sees, having no hover). Picking a photo opens
  `AvatarCropDialog` — drag to position, slider/wheel/pinch to zoom up to 3×, turn in 90° steps,
  inside a circular mask (`react-easy-crop`). On *Apply*, `cropAvatar`
  (`Profile/lib/crop-avatar.ts`) draws the chosen square onto a **512×512** canvas and uploads that
  as WebP (PNG on Safari, which can't encode WebP; the file name follows the bytes, because the
  server checks both). The circle is only a mask: the square is stored and every avatar is drawn
  round by CSS. Before this, the picked file was uploaded whole and the round avatar squeezed it,
  so a wide photo came out as a sliver. Because only the crop is uploaded, the client accepts a
  source photo up to 20 MB (`MAX_AVATAR_SOURCE_BYTES`, only to spare the browser a huge decode);
  the server's 5 MB limit applies to the 512px result and is never near. On success the
  `authenticated-user` query is invalidated so the new picture appears in the profile, header, and
  drawer at once; on failure the dialog stays open so the user can retry.

Why not the image pipeline? Avatars don't need the draft/associate/orphan-GC dance — the user
already exists at upload time — so attach-on-upload (this store) is the right shape. We just added
the image-content validation the generic store lacks.

---

## Relationship to the media pipeline

Question and quiz media — images and audio — go through the **media pipeline**
([`media-pipeline.md`](media-pipeline.md)): content-checked, re-encoded, stored once on R2, attached by
id, swept when unused. The old image-only pipeline (`ImageAsset`, `ImageUploadController`) that used
to sit beside this store is gone.

This store now serves **avatars only**. Folding avatars into the media pipeline — so they move to R2
and are swept like everything else — needs a `User.AvatarAssetId` reference the sweep can see; it is
deferred ([`../deployment/known-issues.md`](../deployment/known-issues.md), "Avatars still use the old
file store"). When that lands, `FileRecord` and `FileService` have no caller left and can be removed.
