# Proposal: one media pipeline for quizzes and questions, ready for a public launch

**Status: open — being decided in rounds (started 2026-10-23; round 2 settled the same day).** §3
records what is settled, §4 what is still open. Nothing in §3 is implemented yet.

An author is building a geography quiz. Question 7 is "Which country's flag is this?" — they
want a flag image, and they don't have one on disk. Question 12 is "Name this anthem" and needs
an audio clip. Later, the AI wizard builds a 20-question quiz on European capitals and should
put a photo of each city on its question without the author doing anything. Every one of those
images will be shown to strangers, including anonymous guests, on a site that will soon be
publicly launched. Where do the bytes live, who may put them there, what stops an obscene
upload, and how does an image from the internet get in legally?

---

## 1. What happens today

**Two half-pipelines, and the editor uses the older one.**

| | Old: `ImageAsset` | New: `FileRecord` |
|---|---|---|
| Used by | the question editors (`imageUrl` field) | avatars only (`AvatarService`) |
| Writes to | `Question.ImageUrl` (legacy column) | `Question.MediaUrl` + `MediaType` — backend only, no editor writes it |
| Lifecycle | upload as orphan → associate → nightly sweep of orphans > 24h | attach-on-upload, no sweep |
| Content check | decodes with ImageSharp, ≤ 2000×2000 | extension only; the client's `ContentType` is stored as-is |
| Data access | `ImageService` touches `DbContext` directly | repository |
| Storage | `wwwroot/uploads/` on the Hetzner VPS | `wwwroot/uploads/files/` on the same disk |

`FileRecord` was meant to replace `ImageAsset` and inherit its good parts — the draft-aware
lifecycle and the content check. It inherited neither. Quiz cover-image upload is commented out
in `create-quiz.tsx`.

**The new store shipped with an open HTTP surface.** Until 2026-10-23, `FilesController` let
any signed-in caller delete any file by id, list any owner's files, and upload 100 MB under an
owner string of their choosing:

```csharp
[HttpDelete("{id:guid}")]
public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
{
    var deleted = await _fileService.DeleteAsync(id, ct);   // no ownership check
    return deleted ? NoContent() : NotFound();
}
```

Nothing called it, so it was removed rather than patched
([`../media/file-storage.md`](../media/file-storage.md), "No public endpoints").

**Both write to one machine's disk and serve from the API's own origin.** That is the
constraint that shapes most of §3: it caps the app at one API instance, puts every image
download on the VPS's bandwidth, and means a hostile file is served from the same site as the
API's session cookie.

## 2. Options considered

Recorded per decision in §3 — each settled entry keeps the alternatives it beat.

## 3. Settled

### 3.1 The live holes were fixed first, separately (2026-10-23)

The `/api/files` removal above shipped on its own, ahead of the redesign, with
`Security/FileStoreEndpointsTests.cs` guarding it. The redesign will take weeks; an exploitable
endpoint shouldn't wait for it.

### 3.2 Bytes live in Cloudflare R2, served from a separate media domain

**R2**, S3-compatible, behind Cloudflare's cache, on its own hostname (e.g.
`media.oxygenquiz.com`) — not on the API's origin.

- **Why not the VPS disk:** one machine, no CDN, backups are on us, and a second API instance
  can't see the first one's files.
- **Why not AWS S3 + CloudFront:** S3 charges for every gigabyte served. A quiz image is read
  by every player of every session; egress is the cost that grows with success. R2 has none.
- **Why not Glacier:** it is archive storage — retrieval is minutes to hours and billed per
  read. The opposite of an image shown on every play.
- **Why a separate domain:** the browser's security boundary is the *site*. A file served from
  the API's own origin runs with that origin's privileges — if a crafted file is ever rendered
  as HTML or script (a missed SVG, a MIME-sniffed upload), its script can call the API as the
  victim with their cookies. Served from a domain that holds no session and no API, the same
  file can do nothing. Defence in depth: the content checks are meant to stop it; the domain
  makes the miss harmless. This is why `googleusercontent.com` and `githubusercontent.com`
  exist.

### 3.3 One pipeline

`FileRecord` is the base and gains what `ImageAsset` had: an unattached (draft) state, a
sweep of unattached files, and a real content check. `ImageAsset`, `ImageUploadController` and
`ImageService` are retired once existing rows are migrated. Two allow-lists already drifted
(`known-issues.md`, "Image upload allow-list drifted") — a second pipeline guarantees more of
that.

### 3.4 Images and audio; video later

Launch with **images and audio**. Video is designed for (the `MediaType` enum already has it)
but not built: it adds transcoding, large uploads and the hardest moderation problem, and
images plus audio carry the quiz formats that exist.

### 3.5 Every signed-in user may upload, within a quota set by role

Paid tiers are not merged (their publication is still being decided —
[`paid-plans-and-payments.md`](./paid-plans-and-payments.md)), so quotas key off **role** for
now, and move to tier when tiers land:

| Role | New media per day | Total storage |
|---|---|---|
| User | 15 | 100 MB |
| Teacher, Admin | 200 | 2.5 GB (to confirm) |
| SuperAdmin | uncapped | uncapped |

What counts, and when, is §3.12. Locking media behind payment was rejected: it makes the free
product look broken.

### 3.6 Official and community quizzes

The public catalogue splits in two:

- **Official** — an admin-set flag. House quizzes get it by default; an outstanding community
  quiz can be promoted. This is the default catalogue, the landing page and the sitemap.
- **Community** — every other `Public` quiz, reached through an explicit switch, behind a
  one-time notice that community quizzes are not reviewed and may contain wrong information or
  disturbing images.

Official is a flag rather than "written by an admin" because authorship says nothing about
quality, and promotion gives a curation path.

### 3.7 Moderation in layers — no paid classifier until there is revenue

| Layer | Launch? |
|---|---|
| Cloudflare CSAM Scanning Tool (free on every plan; blocks matches with 451 and notifies) | Yes — the legal floor for hosting user images |
| Server-side re-encode of every image (strips EXIF/GPS, kills files disguised as images) | Yes |
| Report button on quizzes and questions → admin queue, auto-hide after N reports | Yes |
| Official / community split (§3.6) | Yes |
| Automated nudity/gore classifier (Google SafeSearch, Rekognition, Sightengine) | **No** — paid; revisit after the paid version ships |

### 3.8 Image sources: device, Pexels and Wikimedia Commons — every external image credited

An author can upload from their device or search **Pexels** (general photos) and **Wikimedia
Commons** (flags, landmarks, people, artworks — what quiz questions are mostly about). Both are
searched through our API, so the keys stay on the server; the chosen image is **downloaded and
goes through the same pipeline as an upload** (§3.10), so it is ours to serve, re-encode and scan.

**The credit is not optional.** Wikimedia's CC-BY licences require it by law; Pexels makes it a
condition of API access and asks for proof of it before lifting the 200/hour, 20,000/month limit.
Each stored external image keeps its provider, author, licence and source link, shown as a small
credit under the image wherever it renders.

- **Why not Unsplash:** its terms require hotlinking — every use loads the image from Unsplash's
  servers, so it can't be stored, re-encoded or scanned, can vanish, sends every player's IP to
  Unsplash, and would make a media item either a file or a pointer in every screen that renders
  one. It adds overlap, not coverage.

### 3.9 Bytes go to R2 through the API

The browser sends the file to our API; the API checks it, re-encodes it and writes it to R2. The
alternative — a presigned URL that lets the browser upload straight to R2, with the server
checking afterwards — saves bandwidth only for files large enough to matter (video), and leaves a
window where an unchecked file sits in the bucket. Re-encoding needs the bytes on the server
anyway.

### 3.10 What processing produces

| Kind | Accepted | Stored |
|---|---|---|
| Image | JPEG, PNG, WebP (decoded, not trusted by extension) | WebP, ≤ 1600px long edge, plus a 400px thumbnail. The original is not kept. |
| Audio | MP3, M4A, OGG — magic bytes checked | as uploaded, ≤ 10 MB and ≤ 60 seconds; no transcoding at launch |

The 60-second cap is the product rule (a clip, not an album); the byte cap follows from it.

### 3.11 A stored file is immutable, stored once, and swept when nothing points to it

- **Stored once:** a file is identified by its content hash. The same flag uploaded by 300
  authors is one object in R2 with 300 references.
- **Immutable:** a stored file never changes. Replacing an image means pointing at a different
  file.
- **Swept:** a nightly job deletes files nothing references after a **7-day** grace period. That
  covers uploads never saved, images replaced, and questions deleted — including the copies ADR
  0030 makes when a saved question is edited, which share their original's image, so deleting a
  question can never delete a file directly.
- **Account closure (ADR 0012):** images stay on the anonymised content; they belong to the quiz
  now, not to the person.

### 3.12 Quota counts what you save, not what you try

**Uploading or picking an image doesn't count. Saving it does.** A file uploaded into the editor
is unattached until the question or quiz is saved with it. Swapping images five times before
saving costs nothing — the four you dropped are swept (§3.11).

- **Counted:** at the save that attaches a file not already on that question or quiz. That adds
  one to the day's count and the file's size to the author's storage.
- **Replacing after save:** the new file counts; the old one stops counting against the author
  once nothing of theirs references it.
- **Picking from Pexels or Wikimedia** counts the same way — we store a copy, so it costs the same.
- **What stops upload-without-saving abuse** is not the quota but a rate limit on the upload
  endpoint itself and the 7-day sweep (numbers in §4).

### 3.13 Community images are shown as-is

No blur. Community images sit behind the one-time notice (§3.6) and the report button; a
blur-everything rule punishes the fine majority and only works well when a classifier chooses
what to blur (§3.7). Revisit with the classifier.

### 3.14 The AI adds images only when asked, and only where one helps

The wizard has an **Add images** switch, **off by default**. When on, the model picks the
questions an image helps (a flag, a landmark, a painting — not "what year did WW2 end") and
returns a **search query** for each, never a URL or a file. Our code runs the query against
Wikimedia/Pexels, keeps only allowed licences, downloads and checks the image like an upload,
and records the credit; the review step shows each image with swap and remove. This is ADR 0003
applied to media: the model proposes, the code decides.

### 3.15 Existing images are deleted, not migrated

Production holds at most a question or two with an image. Moving them isn't worth a migration:
the `ImageUrl` column, its fallback read in `ProjectBase`, the `imageUrl` Effects in the question
forms, `ImageAsset` and the files on the VPS disk all go when the new pipeline lands.

## 4. Still open

- **Reporting as a general feature** — a report on a question or quiz for any reason (a wrong
  answer, wrong information, an inappropriate image, offence), not only images: who may report,
  the reasons, what happens to the content, who sees the queue, whether the author is told. Also
  its name: `Reports` already means the owner's analytics reports (`docs/quiz/reports.md`).
- **Teacher/Admin storage** — 2.5 GB assumed (half the first proposal, like the other numbers).
- **Upload rate limit** and how many unattached files one user may hold at once.
- **Where the credit shows** — under the image at play time, in the review screen, both.
- **Official flag mechanics** — who may set it (a permission), where in the UI, what the
  community switch looks like, whether guests see community quizzes.
- **Test plan** — which suite proves which rule.
- **Launch limits** — Kestrel body size, Cloudflare upload size, R2 bucket and domain setup.
