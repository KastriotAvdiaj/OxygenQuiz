# Proposal: one media pipeline for quizzes and questions, ready for a public launch

**Status: accepted, being built (settled 2026-10-24).** Phase 1 — the pipeline, R2, uploads, quotas,
the sweep (§3.1–3.5, 3.8–3.12, 3.15, 3.23) — is built and described in
[`../media/media-pipeline.md`](../media/media-pipeline.md). Phase 2 — reports, moderation and the
picked catalogue (§3.6–3.7, 3.16–3.19, 3.21–3.22) — is built and described in
[`../media/moderation.md`](../media/moderation.md). Phases 3–4 (the Pexels/Wikimedia picker,
AI-added images) are next; this file is deleted once they are folded in too.

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

### 3.6 Picked and community quizzes

> Revised 2026-10-24 (round 4): first settled as "official quizzes", replaced by "picked" so good
> user quizzes can join the main pool.

The public catalogue splits in two:

- **Picked** — an admin-set flag. House quizzes are picked automatically; a community quiz an
  admin picks joins them. This is the default catalogue and the landing page, and these are the
  quizzes search engines index — a great user quiz serves the site as well as a house one.
  A picked *community* quiz carries a badge, provisionally **"Oxygen Pick"**, and its author is
  notified. A pick is removed automatically when a harmful report against the quiz is upheld.
- **Community** — every other `Public` quiz, reached through an explicit switch, behind a
  one-time notice that community quizzes are not reviewed and may contain wrong information or
  disturbing images. Not indexed by search engines at launch.

Picked is a flag rather than "written by an admin" because authorship says nothing about
quality. "Approved" was rejected as the badge: it implies the quiz was fact-checked, and that
unapproved ones are bad. **The badge text is a single display string, never the code's name for
the concept** (`IsPicked`, "picked quiz") — the brand name "Oxygen" may change.

### 3.7 Moderation in layers — no paid classifier until there is revenue

| Layer | Launch? |
|---|---|
| Cloudflare CSAM Scanning Tool (free on every plan; blocks matches with 451 and notifies) | Yes — the legal floor for hosting user images |
| Server-side re-encode of every image (strips EXIF/GPS, kills files disguised as images) | Yes |
| Report button on quizzes and questions → admin queue, auto-hide after N reports | Yes |
| Picked / community split (§3.6) | Yes |
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

### 3.16 Reporting is one feature, named `ContentReport`; the analytics "Reports" is renamed

A viewer's complaint about a question or quiz — a wrong answer, wrong information, an
inappropriate image, offence — is a **report**: the button says *Report*, the entity is
`ContentReport`. It doubles as the fact-checker: most reports on a quiz app will be "the answer
is wrong".

`docs/quiz/reports.md` used "Reports" for something else: the owner's statistics
(attempts, completion, per-question correct %) with CSV/Excel export, built but never shipped.
It is renamed **Statistics export** ([`../quiz/statistics-export.md`](../quiz/statistics-export.md), done
in phase 2) before either ships, so the codebase has one meaning per
word. The two are not merged: they share no data and answer different people.

### 3.17 Signed-in users report a question or a quiz, once each

Reporting needs an account — a guest report has no one to hold to it, and spam would bury the
real ones. Raised from a question (during play or on the results screen) it is about that
question; raised from the quiz's menu it is about the quiz. One report per person per item.

### 3.18 The reasons

| Reason | Text box |
|---|---|
| Wrong answer or information | required — "what's correct?" |
| Inappropriate image or audio | optional |
| Offensive or hateful | optional |
| Spam or nonsense | optional |
| Copyright | optional |
| Other | required |

### 3.19 What a report sets in motion

- **Wrong information goes to the author first**, through the existing notifications, with the
  reporter's text, so they can fix it. It is never hidden automatically. Still open after 5
  reports or 7 days, it reaches the admin queue.
- **Harmful reasons** (inappropriate media, offensive) reach admins at the first report, and
  **10 distinct reporters** hide the content automatically until reviewed (§3.21). Wrong-answer
  reports never hide anything. 10, not 3, because three friends shouldn't be able to take down a
  quiz they dislike; the cost — a bad image on a rarely played quiz may never reach 10 — is
  covered by admins seeing it at the first report.
- **Reports on house quizzes** go straight to admins — the house is the author.
- **Admins see every report**, sorted into lanes by urgency (§3.22) rather than one list.
- **The author answers a wrong-answer report** with *Fixed* or *Not a mistake* plus a reason.
- **The reporter is told the outcome** by notification, either way.

### 3.20 The credit shows as an ⓘ at play time, in full in the editor

At play time a small ⓘ in the image's corner reveals "Photo: Name / Pexels" on tap, so a credit
line doesn't compete with the question. The editor and review screens show it in full. Pexels
must approve how the credit looks before lifting its rate limit, so this is what we show them.

### 3.21 Hiding: the media, or the whole quiz — never one question

Nothing in the app could hide content before this. Hiding one question from a quiz would change
its question count, scoring and sessions already in progress, and a question can sit in several
quizzes. So:

- **Inappropriate image or audio → only the media is hidden.** The question still plays; the
  image sits under a cover — "Reported as inappropriate, being reviewed" — with a **Show anyway**
  button for signed-in users (guests see the cover without it; some may be minors). Once an admin
  upholds the report the file is removed and the button goes with it. Show anyway is the
  convention (X, Instagram, Reddit) and keeps a false report from ruining a question.
- **Offensive text → the quiz is held.** Every quiz the question is live in leaves the catalogue
  and can't be played; its owner still sees it, with an *Under review* banner.
- **The hold is a moderation state of its own, not the owner's `Status`** — otherwise the owner
  could republish it. It is enforced at each entry point, like visibility (ADR 0019).

### 3.22 The admin lanes

| Lane | What's in it |
|---|---|
| **Urgent** | any harmful report; anything auto-hidden |
| **Needs attention** | wrong-answer reports the author left unresolved (5 reports or 7 days); copyright; spam |
| **With the author** | wrong-answer reports still in the author's window — visible, nothing to do yet |
| **Resolved** | history |

Most-reported first within a lane.

### 3.23 Upload limits

| Limit | Value | What it stops |
|---|---|---|
| Teacher/Admin total storage | 2.5 GB | — (User 100 MB, §3.5) |
| Uploads per hour, per user | 30 | a script sending thousands of files |
| Unsaved uploads held at once, per user | 50 | a pile of files nobody saved, waiting out the 7-day sweep |

An *unsaved upload* is invisible to the user: choosing a file in the editor uploads it at once
(that's how the preview appears), so a file chosen and then replaced, or left behind when the
editor is closed, sits in storage unreferenced until the sweep. A normal author never comes near
50; the 51st upload asks them to save or remove images first.

### 3.24 Testing, launch setup and build order (round 5, 2026-10-24)

- **Storage by environment:** R2 in production and in development (the free tier covers one
  developer: `oxygenquiz-media-dev`); local disk for the unit tests and the E2E stack, so neither
  needs credentials or the network.
- **Test plan:** as in round 5 — xUnit for every rule (bytes, quota, dedup, sweep, holds at every
  entry point, AI licence checks), Vitest for the picker, credit and cover, three E2E journeys.
- **Launch setup:** two buckets, `media.oxygenquiz.com` on prod, content-hash keys cached forever,
  CSAM scanning on, a 15 MB request cap on the upload endpoint.
- **Reporting outcomes:** a rejected report restores the media; every moderation action (uphold,
  reject, remove media, hold/release, pick/unpick) is on the admin report page.
- **Sweep timing:** never-saved uploads deleted after 24 hours (hourly job); once-saved files 7 days
  after the last reference went.
- **Build order:** 1 pipeline → 2 safety (both block the public launch) → 3 Pexels/Wikimedia → 4 AI.

## 4. Still open

Nothing. Every branch of the design tree has an answer; what remains is building phases 2–4.
