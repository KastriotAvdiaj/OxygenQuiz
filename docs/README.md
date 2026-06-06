# OxygenQuiz — Documentation

Reference docs for the backend.

## File & image storage

The app has **two** independent ways to store uploaded files. They coexist by design —
separate tables, routes, storage folders, and services.

- [Image Upload Flow](./image-upload-flow.md) — the existing, **required** pipeline for
  quiz/question images. Validated, draft-aware (upload before the entity exists), with a
  daily orphan-cleanup job. Backed by the `ImageAsset` table and `/api/ImageUpload/*`.
- [Generic File Storage](./file-storage.md) — the new, **additive** `Files` store for
  avatars, product photos, and documents. Attach-on-upload, allowlist-validated, with an
  uploader audit trail. Backed by the `Files` table and `/api/files`.

### Quick "which do I use?"

| Use case | System |
|---|---|
| Quiz / question image | Image pipeline (`/api/ImageUpload/*`) |
| Avatar, product photo, document, any new attachment | Files store (`/api/files`) |

See [file-storage.md](./file-storage.md#which-one-should-i-use) for the full rationale and
a side-by-side comparison.
