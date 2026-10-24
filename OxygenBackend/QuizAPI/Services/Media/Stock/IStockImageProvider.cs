namespace QuizAPI.Services.Media.Stock
{
    /// <summary>One outside image source. Searches and looks images up by id; never downloads — the
    /// service does that, against the host the provider declares.</summary>
    public interface IStockImageProvider
    {
        /// <summary>Lower-case id used on the wire ("pexels", "wikimedia").</summary>
        string Id { get; }
        string Name { get; }
        bool Enabled { get; }

        /// <summary>The only host an image of this provider is downloaded from. An image whose
        /// download URL points anywhere else is refused — the import is never a way to make the
        /// server fetch an arbitrary URL.</summary>
        string DownloadHost { get; }

        Task<StockSearchResultDTO> SearchAsync(string query, int page, CancellationToken ct);

        /// <summary>Null when the id doesn't exist, isn't an image, or (Wikimedia) its licence isn't one we accept.</summary>
        Task<StockImageDetail?> GetAsync(string id, CancellationToken ct);
    }
}
