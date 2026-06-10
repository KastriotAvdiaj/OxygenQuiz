using Microsoft.EntityFrameworkCore;

namespace QuizAPI.Filtering
{
    /// <summary>
    /// The standard body envelope for every filtered/paginated list endpoint. Pagination
    /// metadata lives in the body (not a header) so the whole response is strongly typed
    /// end-to-end, survives proxies/CORS, and needs no header parsing on the client.
    /// </summary>
    public sealed class PagedResponse<T>
    {
        public IReadOnlyList<T> Items { get; init; } = System.Array.Empty<T>();
        public int Page { get; init; }
        public int PageSize { get; init; }
        public int TotalItems { get; init; }
        public int TotalPages => PageSize <= 0 ? 0 : (int)System.Math.Ceiling(TotalItems / (double)PageSize);
        public bool HasPreviousPage => Page > 1;
        public bool HasNextPage => Page < TotalPages;

        /// <summary>Counts the (already filtered + sorted) source, then pages it. Run the
        /// projection to a DTO BEFORE calling this so only the page is materialised.</summary>
        public static async Task<PagedResponse<T>> CreateAsync(
            IQueryable<T> source, int page, int pageSize, CancellationToken ct = default)
        {
            if (page < 1) page = 1;

            var total = await source.CountAsync(ct);
            var items = await source
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return new PagedResponse<T>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
            };
        }

        /// <summary>
        /// Same as <see cref="CreateAsync(IQueryable{T}, int, int, CancellationToken)"/> but for
        /// the "materialise then map" case (e.g. AutoMapper <c>Map</c> when the projection can't
        /// run in SQL). Only the requested page is materialised before <paramref name="map"/> runs.
        /// </summary>
        public static async Task<PagedResponse<T>> CreateAsync<TSource>(
            IQueryable<TSource> source, int page, int pageSize,
            System.Func<List<TSource>, List<T>> map, CancellationToken ct = default)
        {
            if (page < 1) page = 1;

            var total = await source.CountAsync(ct);
            var rows = await source
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return new PagedResponse<T>
            {
                Items = map(rows),
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
            };
        }
    }
}
