# Image providers — what each outside source allows, and how many searches that buys

The outside sources behind the media picker's **Search images** tab, with the limits each one sets
and what those limits mean for how many authors can search at once. How a search and an import
work is in [`media-pipeline.md`](./media-pipeline.md) §7; this doc is the facts about the services
themselves, which change without telling us — so every row carries the date it was checked.

> **Status: reference, written 2026-11-09** on branch `image-sources-proposal`. Pixabay is not
> integrated; it is here because [`../proposals/mixed-image-sources.md`](../proposals/mixed-image-sources.md)
> proposes it.

## At a glance

| | Wikimedia Commons | Pexels | Pixabay |
|---|---|---|---|
| Integrated | yes (`WikimediaProvider`) | yes (`PexelsProvider`), off without a key | no |
| Key | none; optional personal API token | required — **new keys paused** | required, free |
| Request limit | per hour, by how the client identifies itself (below) | 200 an hour and 20,000 a month, per key | 100 per 60 seconds, per key |
| Concurrency | 3 or fewer | — | — |
| Caching rule | none stated | none stated | **must cache 24 hours** |
| Hotlinking | allowed | allowed | only to show search results; images must be downloaded to use |
| Credit | per licence (CC BY needs author + licence) | asked: link to Pexels, credit the photographer | show where images come from when results are displayed |
| Videos | yes (not used) | yes (not used) | yes |
| Checked | 2026-11-09 | 2026-11-09 | 2026-11-09 |

**One picker search costs one request to the source** — `SearchAsync` in each provider makes a
single call (Commons: one `generator=search` query with image info; Pexels: one `/search`). An import
costs one more lookup by id plus the download. Our side caches a (source, query, page) for
`SearchCacheMinutes` (60) and limits each account to 120 searches an hour (`media-search`).

## Wikimedia Commons

- **Limits are new in 2026 and still moving.** Wikimedia measures per hour by client identity:
  500 an hour for a request identified only by its IP address, an unstated "low" for an
  unauthenticated request with a policy-compliant User-Agent, 10,000 an hour for an authenticated
  client (OAuth 2.0 token), and "3 or fewer" concurrent requests. Source: mediawiki.org,
  *Wikimedia APIs/Rate limits*.
- **We send a compliant User-Agent** (`OxygenQuiz/1.0 (<Media:Stock:WikimediaContact>)`) — the
  "low" tier — **and can send a token** (`Media:Stock:WikimediaAccessToken`). Without the token, a
  cloud host's IP may share its allowance with other tenants and see 429s first.
- **What it buys:** with a token, ~10,000 uncached searches an hour — far beyond our traffic. Without
  one, assume a few hundred an hour and treat a 429 as expected.

## Pexels

- **200 requests an hour and 20,000 a month per key**; higher limits are free on request for an
  eligible app. Rate headers (`X-Ratelimit-*`) come only on 2xx responses. Source: pexels.com/api
  documentation.
- **New API key issuance is paused** (pexels.com/api, checked 2026-11-09). An existing key keeps
  working; without one, `PexelsProvider.Enabled` is false and the picker offers Commons only.
- **What it buys:** the monthly cap binds first — about 650 uncached searches a day across the
  whole site, every author together.
- **Terms to keep:** credit the photographer and link to Pexels; don't copy Pexels' core function.

## Pixabay

- **100 requests per 60 seconds per key; responses must be cached for 24 hours**; the API is for
  real human requests, and systematic mass downloads are not allowed. Exceeding the limit returns
  429. Source: pixabay.com/api/docs.
- **Hotlinking:** returned URLs may be used to display search results temporarily; permanent
  hotlinking is not allowed — download to our server first. That is how every import already works
  ([ADR 0035](../adr/0035-outside-images-are-imported-by-id-never-hotlinked.md)). Videos may be
  embedded, but Pixabay recommends storing them.
- **Credit:** show users where images come from whenever search results are displayed.
- **What it buys:** ~6,000 uncached searches an hour; with the 24-hour cache, effectively no limit
  at our size.
- **Integration cost:** the 24-hour rule is per provider, so `SearchCacheMinutes` becomes a
  per-provider setting (Pixabay 1440).

## Why not Unsplash or Openverse

- **Unsplash** requires hotlinking every image from its servers — refused in
  [`media-pipeline.md`](./media-pipeline.md) §7 and ADR 0035.
- **Openverse** aggregates Commons, Flickr, Smithsonian and others, but its images live on many
  hosts. The import downloads only from hosts a provider declares
  (`IStockImageProvider.ImageHosts`), and an open-ended host list is the server-side request
  forgery that rule exists to close.
