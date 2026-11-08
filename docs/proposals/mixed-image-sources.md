# Proposal: one image search across every source, ranked by our preference

**Status: open.** Nothing implemented, nothing decided. Written 2026-11-09.

An author types "Eiffel Tower" into the image picker. Today they get Commons results, and have to
flip the *Reference* / *Photos* switch to see Pexels. If Pixabay joins, that is a three-way switch,
and the author is the one deciding which library to look in — a decision they can't make well,
because they don't know which library has the best Eiffel Tower. Should one search ask every source
and show one mixed grid, with the sources we trust most first?

---

## 1. What happens today

One provider per search. The client names it (`GET /api/media/stock/search?provider=&q=&page=`) and
`StockImageService` calls that provider's `SearchAsync`, caching per (source, query, page) for 60
minutes. Each provider implements `IStockImageProvider` and declares the hosts its downloads may
come from. Facts and limits per source: [`../media/image-providers.md`](../media/image-providers.md).

**The constraint: the sources' scores can't be compared.** Each returns its own order, with no
number that means the same thing across sources — so "rank everything by relevance" is not on
offer. Any mix is a rule we choose.

**And the limits are uneven by a factor of 200.** Pixabay allows ~6,000 searches an hour, Pexels
~27 an hour on average (20,000 a month). A mixed search that always asks every source spends the
smallest allowance at the rate of the largest.

## 2. Options

**A. Keep the switch, add Pixabay as a third choice.** Cheapest: one provider class, one setting.
The author still chooses blind.

**B. Mix by weighted interleave.** Ask every enabled source for page *n* in parallel; fill the grid
by taking results in turn by weight — e.g. Commons 3 : Pixabay 2 : Pexels 1 — and dropping
near-duplicates (same source id, or same dimensions and title). Page 2 asks each source for its
page 2. Each card still names its source in its credit. Costs: a merge step in
`StockImageService`, per-provider cache lengths (Pixabay must cache 24 hours), weights in
configuration, and paging that can run unevenly when one source runs out.

**C. Mix, but ask the scarce source only when it adds something.** As B, but Pexels is asked only on
page 1, or only when the others return fewer than a page. Protects the 20,000-a-month cap.

## 3. Recommendation

**B, with C's guard on Pexels**, and Pixabay added in the same change. Weights live in
configuration (`Media:Stock:Weights`), so "Commons is better for flags" can be tuned without a
deploy. Commons first by default: quiz questions are mostly about flags, landmarks, people and
artworks, which is what Commons is good at (media-pipeline.md §7). The switch goes away.

## 4. Open questions

- **Videos.** Pixabay and Pexels both serve video; the pipeline takes images and audio only (video
  is a later phase). Storing video costs R2 space a small budget notices — decide with the video
  phase, not here.
- **The AI's image pick** (media-pipeline.md §8) takes the first result for its `imageQuery`. With a
  mixed grid that becomes "the first result of the top-weighted source" — likely right, but say so.
- **Pexels without a key.** New keys are paused. If no key exists, the proposal is Commons +
  Pixabay, and Pexels stays dormant until issuance resumes.
