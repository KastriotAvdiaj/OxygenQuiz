# 35. Outside images are imported by id, never hotlinked

Date: 2026-10-24
Status: Accepted

## Context

Authors can take an image from Wikimedia Commons or Pexels instead of uploading one
(docs/media/media-pipeline.md §7). Two questions follow: is the image *ours* (a copy in our storage)
or *theirs* (a URL on their servers), and what does the browser tell our server when the author
picks one?

Hotlinking is the least code: store the source's URL and render it. But then nothing we promise
about media holds for those images — they aren't re-encoded (EXIF stays), the moderation tools can't
remove them, the CSAM scan on our media domain never sees them, they vanish when the source deletes
or moves them, and every player's browser tells the source what they're playing. It would also make
"a media item" either a file or a pointer in every screen that renders one. (Unsplash requires
hotlinking, which is why it isn't offered.)

Copying means the server downloads the image. The obvious API — the browser sends the URL it
picked, with the credit it saw — hands the client two things it must not have: the choice of what
our server fetches (a request to `169.254.169.254` or an internal host is a server-side request
forgery), and the choice of what licence and author an image is stored under.

## Decision

**An outside image is imported into our storage and becomes an ordinary asset.** The import endpoint
takes **a provider and an id, nothing else**. The server:

1. asks that provider about that id again — a result is a hint, not a promise, so a licence that
   changed since the search is refused;
2. downloads only from the image hosts the provider declares (for Commons, its upload and thumbnail hosts), over https, with redirects off and a
   size cap;
3. passes the bytes and the provider's credit to the same `MediaService.UploadAsync` an upload uses.

The credit is kept on the asset and copied, as one line, onto the question or quiz that saves it —
beside the URL, for the same reason the URL is copied (ADR 0032): every read path gets it without a
join.

## Consequences

- Every outside image is re-encoded, deduplicated, quota-counted on save, swept when unused,
  moderatable and scanned, exactly like an upload. Nothing downstream knows where it came from except
  the credit.
- We store a copy, so it costs storage and counts against the author's allowance like an upload
  (proposal §3.12).
- The client can't steer the server's downloads or invent a credit. `StockImportCM` has no other
  field, and a test fails if one is added.
- Adding a source is a provider class (search, look up by id, declare a download host). It must
  re-check its licence rule at lookup, not only at search.
