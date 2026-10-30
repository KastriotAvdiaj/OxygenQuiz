# 32. Media is attached by id, and the server writes the URL

Date: 2026-10-24
Status: Accepted

## Context

Before the media pipeline, a question or quiz save took its image as a URL string from the client
and stored it: `QuestionBaseCM.ImageUrl`, `MediaUrl`, `MediaType`, `QuizCM.ImageUrl`, the AI import's
`ImageUrl`. Uploading returned a URL, the form held it, and the save sent it back. Nothing checked that
the string was one of ours — any value was stored and rendered to every player of a Public quiz:
another site's image, a tracking pixel that logs who played, a `javascript:` URL.

Moderation (phase 2) makes this worse, not better: a reported image has to be hidden or removed
*everywhere it appears*, and a URL typed into a row is not something any query can find.

## Decision

**A write model carries an asset id, never a URL or a media type.** Questions take `MediaAssetId`,
quizzes `CoverAssetId`. `MediaAttachmentService` is the only code that writes `Question.MediaUrl` /
`MediaType` and `Quiz.ImageUrl`; it copies them from the `MediaAsset` it loaded, after checking the
asset exists, isn't removed, is the right kind, and fits the saver's quota.

The URL is **denormalised onto the row**, not joined at read time. Every read path — SQL
projections, the in-memory play DTO, multiplayer rounds — already reads `MediaUrl`, and none of them
changes. The asset row stays the source of truth; the copy is written only together with the id.

`Security/MediaEndpointTests.No_write_model_accepts_a_media_url` fails if a URL-shaped or
media-type property is added to any question, quiz, AI-import or Associations write model.

## Consequences

- A client can no longer put anything on a question that didn't come through `POST /api/media`:
  every displayed file was sniffed, re-encoded or checked, and is ours to sweep, moderate or move.
- Moving the media domain is one `UPDATE` over `MediaAssets.Url` and the two copies — the price of
  not joining on every read.
- An editor has to send the id back unchanged on every save; a form that loses it clears the media.
  The DTOs carry `MediaAssetId` / `CoverAssetId` so an edit form can.
- Rejected: **keep URLs and validate them against our domain.** It still lets a row point at a file
  nothing tracks, so the sweep and moderation can't see it, and "our domain" differs per environment.
