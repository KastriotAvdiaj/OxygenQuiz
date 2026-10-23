# Proposal: one media pipeline for quizzes and questions, ready for a public launch

**Status: open — being decided in rounds (started 2026-10-23).** §3 records what is settled, §4
what is still open. Nothing in §3 is implemented yet.

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

| Role | Quota |
|---|---|
| User | capped (numbers in §4) |
| Teacher, Admin | higher cap |
| SuperAdmin | uncapped |

Locking media behind payment was rejected: it makes the free product look broken.

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

## 4. Still open

- **Free image sources** — which providers (Pexels, Wikimedia Commons, Unsplash), and how the
  credit line each requires is stored and shown. Being answered now.
- **The AI adding media** — triggered how, chosen how, checked by what code (ADR 0003).
- **Upload path** — through the API, or presigned direct-to-R2.
- **Image processing** — output format, sizes/variants, max dimensions.
- **Quota numbers** — per-file size, uploads per day, total storage per role.
- **Community images without a classifier** — blurred until clicked, or shown as-is.
- **Lifecycle** — when an attached file is deleted (question deleted, image replaced, a
  question shared by several quizzes, account closure under ADR 0012).
- **Migration** — existing `ImageUrl` rows and files on the VPS disk.
- **Test plan** — which suite proves which rule.
- **Launch limits** — rate limits, Kestrel body size, Cloudflare upload size.
