using System.Text.Json;

namespace QuizAPI.Services.Facts
{
    public interface IFactPackCatalog
    {
        IReadOnlyList<FactPack> All { get; }
        FactPack? Find(string slug);
    }

    /// <summary>
    /// The packs shipped with the build, read once from <c>FactPacks/*.json</c> next to the app.
    ///
    /// <para>Files, not database rows: a pack is reviewed like code (its query and templates by
    /// hand, its facts as a diff from <c>scripts/facts/build.mjs</c>), deployed with the code that
    /// reads it, and small — a few hundred facts. A broken file is logged and skipped rather than
    /// failing startup: one bad pack shouldn't take the others, or the site, down.</para>
    /// </summary>
    public sealed class FactPackCatalog : IFactPackCatalog
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
        {
            ReadCommentHandling = JsonCommentHandling.Skip,
            AllowTrailingCommas = true,
        };

        private readonly Lazy<IReadOnlyList<FactPack>> _packs;

        public FactPackCatalog(ILogger<FactPackCatalog> logger)
            : this(Path.Combine(AppContext.BaseDirectory, "FactPacks"), logger) { }

        public FactPackCatalog(string directory, ILogger<FactPackCatalog> logger)
        {
            _packs = new Lazy<IReadOnlyList<FactPack>>(() => Load(directory, logger));
        }

        public IReadOnlyList<FactPack> All => _packs.Value;

        public FactPack? Find(string slug) =>
            All.FirstOrDefault(p => string.Equals(p.Slug, slug?.Trim(), StringComparison.OrdinalIgnoreCase));

        private static IReadOnlyList<FactPack> Load(string directory, ILogger logger)
        {
            if (!Directory.Exists(directory))
            {
                logger.LogWarning("No fact packs: {Directory} doesn't exist.", directory);
                return Array.Empty<FactPack>();
            }

            var packs = new List<FactPack>();
            foreach (var file in Directory.EnumerateFiles(directory, "*.json").OrderBy(f => f, StringComparer.Ordinal))
            {
                try
                {
                    var pack = JsonSerializer.Deserialize<FactPack>(File.ReadAllText(file), Json);
                    if (pack is null || string.IsNullOrWhiteSpace(pack.Slug) || pack.Facts.Count == 0)
                    {
                        logger.LogWarning("Fact pack {File} has no slug or no facts — skipped. Run scripts/facts/build.mjs.", file);
                        continue;
                    }
                    packs.Add(pack);
                }
                catch (JsonException ex)
                {
                    logger.LogError(ex, "Fact pack {File} isn't valid JSON — skipped.", file);
                }
            }
            return packs;
        }
    }
}
