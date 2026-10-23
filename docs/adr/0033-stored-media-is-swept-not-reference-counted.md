# 33. Stored media is swept, not reference-counted

Date: 2026-10-24
Status: Accepted

## Context

A stored file can be pointed at by many rows: the same flag on two questions, a builder copy of a
question (ADR 0030) that keeps its original's image, a deduplicated upload shared by two authors.
Something has to delete files nothing uses any more, and not a moment before.

The obvious design is a reference count on the asset, incremented on attach and decremented on
detach. Every path that can drop a reference would have to decrement it: replacing an image, removing
it, deleting a question, deleting a quiz, account anonymisation, the bulk importers, a future
moderation removal. One forgotten path either leaks storage forever or — worse — lets the count reach
zero while a row still points at the file, and a live question loses its image.

## Decision

**No count is stored. An hourly sweep asks the database what points where.**
`MediaSweeper` deletes an asset when no question (`MediaAssetId`) and no quiz (`CoverAssetId`,
soft-deleted included) references it:

- never attached, 24 hours after upload;
- once attached, 7 days after the sweep first found it unreferenced (stamped `UnreferencedSince`,
  cleared if something points at it again).

Rows are deleted before objects, so a save that attaches the asset mid-sweep fails the sweep on the
foreign key instead of leaving a dangling URL. Moderation tombstones (`RemovedAt`) are never swept —
their row is what blocks a re-upload of the same bytes.

## Consequences

- Code that drops a reference does nothing about the file, and can't get it wrong. Deleting a
  question doesn't touch its media.
- Storage is freed late — up to 25 hours for an abandoned upload, about 7 days for a replaced image —
  which is also the window in which an undo, a cached page or an in-progress game still works.
- Each run is a few anti-join queries over `MediaAssets`, batched (`Media:SweepBatchSize`). Fine at
  this scale; if the table grows into millions, the `NOT EXISTS` probes want the indexes the
  migration already adds on `Questions.MediaAssetId` and `Quizzes.CoverAssetId`.
- Rejected: **delete on detach** (breaks shared files and copies), **reference count** (above),
  **never delete** (storage grows with every abandoned upload).
