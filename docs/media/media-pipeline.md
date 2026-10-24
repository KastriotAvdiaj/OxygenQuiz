# Media pipeline — one way to put an image or audio clip on a question or quiz

How a question gets its optional image or audio clip, and a quiz its cover image: upload, process,
store, attach on save, charge the quota, sweep what nothing uses. The design was settled in rounds
in [`../proposals/media-pipeline.md`](../proposals/media-pipeline.md); this doc is what is built.

> **Status: implemented (2026-10-24)** — the pipeline, uploads from the device (images and audio),
> quotas, the sweep, R2 storage, free images from Wikimedia Commons and Pexels (§7) and pictures
> the AI wizard adds (§8). It replaces the image-only `ImageAsset` pipeline (`ImageUploadController`,
> `ImageService`, the nightly `image-cleanup-daily` job) and the unwired `/api/files` route for
> question media. Reporting and moderation are in [`moderation.md`](moderation.md).

---

## 1. The shape of it

```
 editor                       API                                    storage
 ──────                       ───                                    ───────
 choose a file ──POST /api/media──▶ sniff bytes → re-encode/check ──▶ R2 (prod) / disk (dev, tests)
              ◀── { id, url, kind } ─ MediaAsset row (unattached)
 …author keeps editing…
 save question ── { mediaAssetId } ─▶ MediaAttachmentService:
                                       asset exists, not removed?
                                       new to this author? → charge quota
                                       question.MediaUrl/MediaType ← asset
 (hourly)                               MediaSweeper: delete what nothing points at
```

Two halves, deliberately separate: **uploading stores a file and attaches nothing**; **a save
attaches it by id**. The author can upload, preview, swap and abandon freely — nothing counts until
they save.

## 2. What an upload may be

Decided from the bytes ([`MediaProcessor.cs`](../../OxygenBackend/QuizAPI/Services/Media/MediaProcessor.cs)),
never the file name or the browser's claimed type:

| Kind | Accepted | Stored |
|---|---|---|
| Image | JPEG, PNG, WebP; ≤ 10 MB; ≤ 40 megapixels and ≤ 12,000 px a side | **Re-encoded** to WebP (quality 80), ≤ 1600 px on the long edge, plus a 400 px thumbnail. The original is not kept. |
| Audio | MP3, M4A, OGG (container sniffed); ≤ 10 MB; **≤ 60 seconds** | As uploaded, with every tag removed. No transcoding. |

- **Re-encoding is the security boundary for images.** Decoding and encoding afresh strips EXIF —
  including a phone's GPS position — kills a polyglot file that is also valid HTML or script, and
  keeps only the first frame of an animation. SVG is never accepted: it can carry script.
- **The size check reads the header before decoding a pixel.** A "decompression bomb" is a tiny
  file that expands to gigabytes in memory; `Image.Identify` refuses it first.
- **MP3 length is counted frame by frame.** TagLib estimates it from the first frame and the file
  size, which measured a 61-second clip as 35. Because a player can resync past junk bytes, an MP3
  with more than 8 KB of unreadable data after its last frame is refused — otherwise a long clip
  could hide behind one bad byte.
- **A video is refused even in an audio container.** MP4 and M4A share the same `ftyp` box; TagLib
  reads the streams and anything with video is turned away. Video is a later phase.

## 3. Stored once, immutable, swept

[`MediaAsset`](../../OxygenBackend/QuizAPI/Models/Media/MediaAsset.cs) is one stored file:

- **Stored once.** Its identity is the SHA-256 of the uploaded bytes (unique index). Three hundred
  authors uploading the same flag make one row and one object; the upload returns the existing
  asset.
- **Immutable.** Keys are content-addressed (`images/{sha256}.webp`, `…_400.webp`,
  `audio/{sha256}.mp3`), so a URL's bytes never change and R2 serves them with a one-year immutable
  cache header. Replacing an image points the question at a different asset.
- **Swept, not reference-counted** ([ADR 0033](../adr/0033-stored-media-is-swept-not-reference-counted.md)).
  [`MediaSweeper`](../../OxygenBackend/QuizAPI/Services/Media/MediaSweeper.cs) runs hourly
  (Hangfire `media-sweep`) and asks the database what points where:

| State | Kept for | Why that long |
|---|---|---|
| Never saved anywhere (an upload replaced or abandoned in the editor) | **24 hours** | Long enough to finish an editing session left open |
| Saved once, now pointed at by nothing (image replaced, question deleted) | **7 days** after the sweep first notices | A quiz still being played, a cached page, and an author's undo |
| Pointed at by anything | forever | — |

A question can share its image with its builder copy (ADR 0030), so deleting a question never
deletes a file directly; the sweep does, once nothing points at it. Rows are deleted before objects:
if a save attaches an asset between the sweep's query and its delete, the foreign key fails the
sweep and nothing is lost. Soft-deleted quizzes count as references.

## 4. Attaching on save — and the URL is never the client's

A question's `MediaAssetId`, a quiz's `CoverAssetId`. The write models accept **an asset id and
nothing else** — no URL, no media type ([ADR 0032](../adr/0032-media-is-attached-by-id-and-the-server-writes-the-url.md)).
[`MediaAttachmentService`](../../OxygenBackend/QuizAPI/Services/Media/MediaAttachmentService.cs) is
the only code that writes `Question.MediaUrl`/`MediaType` or `Quiz.ImageUrl`: it checks the asset
exists and isn't removed, that a cover is an image, charges the quota, and copies the asset's URL
onto the row.

The URL is kept on the row (not joined) so every read path — SQL projections, the in-memory play
DTO, multiplayer rounds — works unchanged. Every write path calls the service: the three question
create/update endpoints, quiz create/update, the AI import (cover and each question), and the
Associations board's create/update.

## 5. The quota counts what you save, not what you try

| Role | New media per UTC day | Storage | Configured by |
|---|---|---|---|
| User | 15 | 100 MB | `Media:UserQuota` |
| Teacher, Admin | 200 | 2.5 GB | `Media:StaffQuota` |
| SuperAdmin | unlimited | unlimited | — |

- **Charged** at the save that attaches an asset the saver isn't already using in any of their
  questions or quizzes: one against the day, its stored size against storage. `MediaCountedAt` /
  `CoverCountedAt` record the charge; the day's count is a query over them.
- **Free:** uploading; swapping before saving; keeping the same asset on an edit; attaching an asset
  you already use (a builder copy, the same flag on two questions).
- **Storage** is the total stored size of the *distinct* assets an account's content points at.
- **By role, through `IMediaQuotaPolicy`** — when paid tiers land, a second implementation reads the
  subscription and no caller changes (same seam as the AI quota).
- **The AI import charges many questions in one save;** the service keeps a per-request tally,
  because the database can't see those rows until the single SaveChanges.
- Over a limit is **429** with a message that says which limit and when it resets.
  `GET /api/media/quota` reports the caller's standing.

**What stops upload-without-saving abuse** is not the quota: it is the `media-upload` rate limit
(30 uploads an hour per account, [`../development/rate-limiting.md`](../development/rate-limiting.md))
and a cap of **50 unsaved uploads** held at once (`Media:MaxUnsavedPerUser`). A duplicate of an
existing file adds nothing to that pile.

## 6. Where the bytes live

`IMediaStorage`, chosen at startup by `Media:Storage`:

| Value | Implementation | Used by |
|---|---|---|
| `Disk` (default) | `DiskMediaStorage` → `wwwroot/uploads/media`, served by the API at `/uploads/media/…` | Unit tests, the E2E stack (pinned in `e2e/support/stack.ts`), development without credentials |
| `R2` | `R2MediaStorage` → a Cloudflare R2 bucket via its S3 API, served from the bucket's public domain | Production (`oxygenquiz-media-prod` on `media.oxygenquiz.com`), development with `oxygenquiz-media-dev` |

**Production serves media from its own domain, not the API's.** The browser's security boundary is
the site: a file the checks missed, rendered from the API's origin, could call the API with the
viewer's cookie. From a domain with no session and no API it can do nothing. An incomplete `Media:R2`
section with `Storage=R2` **fails startup** — a misconfigured bucket is not something to discover on
the first upload. Settings: [`../deployment/configuration.md`](../deployment/configuration.md);
setting up the bucket: [`../deployment/production-runbook.md`](../deployment/production-runbook.md).

R2's free tier (10 GB stored, 1M writes and 10M reads a month, egress always free) covers
development and an early launch; past it, storage is $0.015 per GB-month.

## 7. Outside sources — Wikimedia Commons and Pexels

An author who has no image on disk presses **Or find a free image** under the picker and searches
**Wikimedia Commons** (flags, landmarks, people, artworks — the default tab) or **Pexels** (general
photos). Choosing a result imports it: from then on it is one of our assets like any upload. Decided
in the proposal §3.8; the import model is [ADR 0035](../adr/0035-outside-images-are-imported-by-id-never-hotlinked.md).

**Searched through our API** (`GET /api/media/stock/search?provider=&q=&page=`), so the Pexels key
stays on the server. Results are cached an hour per (source, query, page) — Pexels allows 200
requests an hour for the whole site — and the endpoint has its own per-account limit
(`media-search`, 120 an hour). The grid's thumbnails load from the source itself; nothing stores
them.

**Only licences that allow reuse with credit** come back from Commons
(`WikimediaProvider.IsAllowedLicense`): public domain, CC0, CC BY, CC BY-SA. Non-commercial,
no-derivatives, fair use, anything flagged non-free and anything unrecognised are left out. GIFs are
left out too (Commons renders their thumbnail as a GIF, which the pipeline refuses); SVGs are kept —
most flags are SVG, and Commons renders them as PNG. Everything on Pexels is under the Pexels License.

**The import takes a provider and an id — never a URL, never a credit**
(`POST /api/media/stock/import { provider, id }`). The server asks the source about that id again
(a licence that changed since the search is refused), downloads only from the image hosts that
source declares (`upload.wikimedia.org` and `thumb.wikimedia.org` — Commons serves resized images
from the latter — and `images.pexels.com`) over https with redirects off and a 15 MB cap,
and hands the bytes to `MediaService.UploadAsync` with the credit the source gave. So the import is
an upload in every other way: sniffed, re-encoded to WebP, deduplicated, counted towards the unsaved
pile, charged to the quota only when saved, and rate-limited with uploads (`media-upload`). A client
can't make the server fetch an arbitrary URL, and can't attach a licence an image doesn't have.

**The credit travels with the image.** The asset keeps its author, source page and licence
(`MediaAsset.Credit*`, https links only — `MediaCredits.SafeUrl`). When a save attaches it,
`MediaAttachmentService` copies a one-line credit beside the URL: `Question.MediaCredit` /
`MediaCreditUrl`, `Quiz.CoverCredit` / `CoverCreditUrl` (`MediaCredits.Line`):

- Pexels — "Photo: Ana Lopez / Pexels";
- Commons — "Jane Doe · CC BY-SA 4.0 · Wikimedia Commons" (CC BY requires the licence).

The line links to the image's page at its source, which names author and licence in full — what
CC BY 4.0 accepts as attribution. It shows in the editor and the review under the image, on the
listing page under the cover, and at play time behind an **ⓘ** on the image (single player, results,
multiplayer), so it doesn't compete with the question. A hidden image's credit is withheld with its
URL. Removing or replacing the image clears the credit; moderation's Remove media does too.

| Setting | |
|---|---|
| `Media:Stock:PexelsApiKey` | blank switches Pexels off; the picker then offers Commons only |
| `Media:Stock:WikimediaContact` | sent in the User-Agent, which Wikimedia's API policy requires |
| `Media:Stock:WikimediaAccessToken` | optional; anonymous Commons requests share a per-IP limit a cloud host may already have spent (429) |
| `PageSize`, `SearchCacheMinutes`, `MaxDownloadBytes`, `DownloadEdge` | 24, 60, 15 MB, 1600 |

**Why not Unsplash:** its terms require hotlinking every image from Unsplash's servers — nothing we
could store, re-encode or scan, which could vanish, and which would send every player's address to
Unsplash. It would add overlap, not coverage (proposal §3.8).

## 8. AI-added images

The AI wizard (both paths — generated here, or the prompt copied to your own AI) has an **Add
pictures** switch under its options, **off by default**. On, the prompt asks the model to give an
`imageQuery` — a short search phrase such as "Flag of Kosovo" — to **only** the questions a picture
helps (a flag, a landmark, a painting, an animal, a person, a map), at most 10, never a URL, and
never one that gives the answer away unless the question is about identifying the picture
(`AiPromptBuilder`, rule and shape field). This is ADR 0003 applied to media: **the model proposes a
phrase, our code decides the image.**

1. **The parser keeps a phrase, nothing else** (`cleanImageQuery` in `parse-ai-output.ts`): 2–80
   characters, and anything that looks like a link or a file name is dropped rather than searched.
   Only the first 10 questions with one keep it.
2. **Our server finds the picture.** `useAutoImages` sends each phrase to
   `POST /api/media/stock/auto { query }`, which searches Commons, then Pexels, and imports the best
   result whose licence and file pass — trying the next two if one fails at import — exactly as a
   pick from the picker would (§7): re-encoded, deduplicated, credited, rate-limited with uploads.
   404 when nothing usable turns up; a source that's down is skipped for the other.
3. **The review opens with the pictures in place.** Between the reply and the review a short
   "Finding pictures…" panel counts them in, with *Skip to the review*. The builder then shows each
   picture with its credit; swapping (*Or find a free image*) or removing it is the ordinary picker.
   A note on the review says how many were added and which questions asked and got none.

Nothing is charged until the quiz is saved, like any upload; a picture removed in the review is
swept with the other unsaved uploads.

## 9. Frontend

- **`MediaPicker`** ([`src/features/media/components/media-picker.tsx`](../../src/features/media/components/media-picker.tsx))
  is the one control: drag or click, client-side precheck (mirrors the API), inline error with the
  server's own message, preview (`object-contain` image, or an audio player), Remove. `allowAudio`
  is off for covers. It replaced `utils/Image-Upload.tsx`.
- Forms hold a `MediaSelection` (`assetId` + preview URL + kind) and send **`mediaAssetId` /
  `coverAssetId` only** (`toQuestionRequest`, `toQuizRequest`). The six dashboard question forms,
  the three builder question cards and the quiz cover all use it; the quiz cover is back in the
  builder's details panel.
- **`StockImageDialog`** ([`src/features/media/components/stock-image-dialog.tsx`](../../src/features/media/components/stock-image-dialog.tsx))
  is the outside-source search (§7): a source switch (Pexels only when the site has a key), a
  search, a grid, *More results*; choosing imports and hands the picker an asset like an upload.
- A selection's credit is a `CreditLine` — `{ line, url }` — the same shape a saved question's
  `mediaCredit` / `mediaCreditUrl` make (`creditFrom`), so a fresh pick and a saved one render alike
  through `MediaCreditLine`.
- Saved questions render through **`QuestionMedia`** everywhere — dashboard cards, the builder's
  review, the play screens and multiplayer, which until this change sent only the legacy image
  column, so audio never reached a lobby.

## 10. Existing images were dropped

The `AddMediaPipeline` migration clears every pre-pipeline media URL (`Questions.MediaUrl`/`MediaType`,
`Quizzes.ImageUrl`), drops `Questions.ImageUrl` and the `ImageAssets` table. Production held a
question or two with an image, all on the VPS disk; a URL with no asset behind it could not be
swept, moderated or moved. The old files stay on the uploads volume until removed by hand (runbook).

## 11. Tests

| Suite | File | Proves |
|---|---|---|
| xUnit | `Media/MediaProcessorTests.cs` | Text renamed `.png`, SVG and HTML refused; a PNG signature over garbage refused on decode; EXIF/GPS stripped; ≤1600 px + 400 px thumb; no upscaling; side and pixel limits; MP3/M4A/OGG accepted with their length; 61 s refused; a long clip hidden after junk refused; video in an M4A container refused; tags stripped |
| xUnit | `Media/MediaPipelineTests.cs` | Dedup; unsaved cap and its exemptions; removed hash can't return; URL copied on save; unknown/removed asset refused; cover must be an image; charged on save not upload; daily limit and its UTC reset; reuse is free; same asset on edit isn't recharged; storage counts distinct files; a multi-question save is tallied; the sweep's 24 h, 7 d, in-use, copy-survives, undo, tombstone and unreachable-bucket cases |
| xUnit | `Security/MediaEndpointTests.cs` | Upload needs sign-in, is rate-limited and size-capped; **no write model has a URL or media-type field** |
| xUnit | `Editing/QuizNoOpSaveTests.cs` | A quiz edit attaches the cover by id and the server writes its URL |
| xUnit | `Media/StockImageTests.cs` | Commons licence filter (PD, CC0, CC BY, CC BY-SA in; NC, ND, fair use, GFDL-only, non-free out); the Artist HTML made plain; search order, GIFs dropped, `hasMore`; one source request for a repeated search; blank query and page range refused; unknown source refused, Pexels without a key unavailable; a Commons and a Pexels import store the image with the source's credit and download from the source's own host; a licence changed since the search refused at import; Commons thumbnails on `thumb.wikimedia.org` listed and imported; a protocol-relative or http Commons URL made https; a download URL off the declared host or not https never fetched; the size cap with and without a Content-Length; the credit copied onto a question and cleared with the image; only https credit links stored; hand-uploaded bytes gain the credit when imported; an AI phrase imports the best Commons result, falls back to Pexels, moves past a result that fails at import, is 404 with nothing stored when nothing is found, tries Pexels when Commons is down and is 503 only when both are, and is validated like a search |
| Vitest | `src/features/media/__tests__/media-picker.test.tsx` | Precheck mirrors the API; upload hands the form an id; server reason shown inline; covers refuse audio; preview and Remove; the credit line, linked to the source page |
| xUnit | `Ai/AiPromptBuilderTests.cs` | Without the switch no image is asked for; with it, a search phrase on only the questions it helps, never a URL, at most 10, not giving the answer away; the shape's field list stays comma-correct with every optional field on |
| Vitest | `…/AI-Quiz/__tests__/auto-images.test.tsx` | The parser keeps a plain phrase and drops links, file names, descriptions; only 10 questions keep one; nothing is attached by the parser; `useAutoImages` asks the server per phrase, puts each found picture (with its credit) on its question, lists the ones not found, is never pending with nothing to find, and Skip goes on at once |
| Vitest | `src/features/media/__tests__/stock-image-dialog.test.tsx` | Search sends source and query; an import sends provider and id only; Pexels offered only with a key; a refused import explained in place; the ⓘ reveals an outside image's credit, and the author's own image has none |
| Vitest | `…/overview/__tests__/review-model.test.ts` | The review shows a builder question's media and a saved one's alike |

Verified by hand against a real PostgreSQL 16 and the running API (2026-10-24): the full migration
chain applies; a 2400×1600 JPEG is stored as a 1600×1067 WebP of 15 KB and served as `image/webp`;
an MP3 is accepted with its length; SVG, a 61 s clip and an MP4 named `.m4a` are refused; a
client-sent `imageUrl` (even `javascript:`) is ignored.
