using System.Text.Json;
using Microsoft.Extensions.Options;
using QuizAPI.Exceptions;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Ai.CategoryPalette
{
    /// <inheritdoc cref="ICategoryPaletteService"/>
    public sealed class CategoryPaletteService : ICategoryPaletteService
    {
        private readonly IQuizAiProvider _provider;
        private readonly IQuestionCategoryRepository _categories;
        private readonly IAiGenerationUsageRepository _usages;
        private readonly AiOptions _options;
        private readonly AiAvailability _availability;
        private readonly ILogger<CategoryPaletteService> _logger;

        public CategoryPaletteService(
            IQuizAiProvider provider,
            IQuestionCategoryRepository categories,
            IAiGenerationUsageRepository usages,
            IOptions<AiOptions> options,
            AiAvailability availability,
            ILogger<CategoryPaletteService> logger)
        {
            _provider = provider;
            _categories = categories;
            _usages = usages;
            _options = options.Value;
            _availability = availability;
            _logger = logger;
        }

        /// <summary>
        /// Whether the button should be offered at all. <b>Configuration only</b> — deliberately
        /// not the budget.
        ///
        /// <para>The two failures want different surfaces. "AI is off on this server" is a standing
        /// fact, so the button is disabled up front with the reason in its tooltip rather than
        /// inviting a click that cannot work. "Today's budget is spent" is temporary and changes
        /// under the admin's feet, so a disabled button would go stale; it stays clickable and
        /// answers inline, in the server's own words, which is what
        /// <c>paletteErrorMessage</c> on the client already renders.</para>
        /// </summary>
        public AiAvailability Availability => _availability;

        public async Task<CategoryPaletteResult> ProposeAsync(
            CategoryPaletteRequest request, Guid userId, CancellationToken ct)
        {
            // _options.Enabled is the single gate: AiConfigurationResolver has already forced it
            // false if the vendor configuration cannot produce a working call, so a broken config
            // and a deliberate switch-off arrive here identically — with different wording, which
            // is the only part the admin can act on differently.
            if (!_options.Enabled)
                throw new AppValidationException(_availability.UserMessage);

            if (string.IsNullOrWhiteSpace(request.CategoryName))
                throw new AppValidationException("Type the category name first — that is all the AI gets to work from.");

            // Unmetered is not unbounded. This spends no quota (admins create categories rarely),
            // but it is still real money and it must not be able to exhaust the same daily cap
            // quiz generation depends on. Checked before the call, not after.
            await GuardBudgetAsync(ct);

            var prompt = CategoryPalettePromptBuilder.Build(request);

            AiProviderResult reply;
            try
            {
                reply = await _provider.CompleteJsonAsync(
                    prompt, CategoryPalettePromptBuilder.MaxOutputTokens, ct);
            }
            catch (AiProviderException ex)
            {
                await RecordAsync(userId, null, AiErrorCodes.ProviderUnavailable, ct);
                _logger.LogWarning(ex, "Palette proposal failed upstream for {Category}", request.CategoryName);
                throw new AppValidationException("The colour service is unavailable right now. Pick colours by hand, or try again shortly.");
            }

            List<IReadOnlyList<string>> raw;
            try
            {
                raw = ParseStrict(reply.Content);
            }
            catch (PaletteProposalException ex)
            {
                await RecordAsync(userId, reply, AiErrorCodes.ModelOutputInvalid, ct);
                _logger.LogWarning("Palette proposal rejected for {Category}: {Reason}", request.CategoryName, ex.Message);
                throw new AppValidationException("The AI's answer wasn't usable. Try again, or pick colours by hand.");
            }

            var candidates = await AnnotateAsync(raw, ct);

            await RecordAsync(userId, reply, errorCode: null, ct);

            return new CategoryPaletteResult(candidates, _provider.Model);
        }

        private async Task GuardBudgetAsync(CancellationToken ct)
        {
            if (_options.DailyBudgetUsd > 0)
            {
                var daily = await _usages.SumEstimatedCostSinceAsync(DateTime.UtcNow.AddDays(-1), ct);
                if (daily >= _options.DailyBudgetUsd)
                    throw new AppValidationException("Today's AI budget is spent. Pick colours by hand for now.");
            }

            if (_options.MonthlyBudgetUsd > 0)
            {
                var monthly = await _usages.SumEstimatedCostSinceAsync(DateTime.UtcNow.AddDays(-30), ct);
                if (monthly >= _options.MonthlyBudgetUsd)
                    throw new AppValidationException("This month's AI budget is spent. Pick colours by hand for now.");
            }
        }

        /// <summary>
        /// Strict all the way down: anything unexpected throws rather than degrading. A partially
        /// understood reply is the failure mode worth refusing — it produces a palette that looks
        /// deliberate and isn't.
        /// </summary>
        private static List<IReadOnlyList<string>> ParseStrict(string content)
        {
            // Models wrap JSON in prose and code fences even when told not to. Take the outermost
            // braces and let the parser reject anything that isn't an object.
            var start = content.IndexOf('{');
            var end = content.LastIndexOf('}');
            if (start < 0 || end <= start) throw new PaletteProposalException("no JSON object in the reply");

            using var doc = JsonDocument.Parse(content[start..(end + 1)]);

            if (!doc.RootElement.TryGetProperty("palettes", out var palettes)
                || palettes.ValueKind != JsonValueKind.Array)
                throw new PaletteProposalException("no \"palettes\" array");

            var results = new List<IReadOnlyList<string>>();

            foreach (var palette in palettes.EnumerateArray())
            {
                if (palette.ValueKind != JsonValueKind.Array) continue;

                var colors = new List<string>();
                var usable = true;

                foreach (var color in palette.EnumerateArray())
                {
                    if (color.ValueKind != JsonValueKind.String
                        || !PaletteColor.TryParseHex(color.GetString(), out _))
                    {
                        usable = false;
                        break;
                    }

                    colors.Add(color.GetString()!.ToLowerInvariant());
                }

                // The count bound is the picker's own: it renders 2–5 swatches, and the prompt
                // asks for 3–5. A palette outside that can't be shown, so it isn't offered.
                if (!usable || colors.Count is < 3 or > 5) continue;

                // The dominant colour fills a card behind text. If no label could be read on it,
                // the palette is unusable however pleasant it looks.
                PaletteColor.TryParseHex(colors[0], out var dominant);
                if (PaletteColor.BestTextContrast(dominant) < PaletteColor.MinTextContrast) continue;

                results.Add(colors);
            }

            if (results.Count == 0)
                throw new PaletteProposalException("no palette survived validation");

            return results;
        }

        /// <summary>
        /// Marks any candidate whose dominant colour sits too close to one already in use, and
        /// names the category it collides with. Does not drop it — see <see cref="PaletteCandidate"/>.
        /// </summary>
        private async Task<List<PaletteCandidate>> AnnotateAsync(
            List<IReadOnlyList<string>> raw, CancellationToken ct)
        {
            var existing = new List<(string Name, (int R, int G, int B) Rgb)>();

            foreach (var category in await _categories.GetAllAsync(ct))
            {
                if (string.IsNullOrWhiteSpace(category.ColorPaletteJson)) continue;

                string[]? colors;
                try
                {
                    colors = JsonSerializer.Deserialize<string[]>(category.ColorPaletteJson);
                }
                catch (JsonException)
                {
                    // A malformed stored palette renders as the default on the client; here it
                    // simply can't be compared against. Not this feature's problem to fix.
                    continue;
                }

                if (colors is { Length: > 0 } && PaletteColor.TryParseHex(colors[0], out var rgb))
                    existing.Add((category.Name, rgb));
            }

            return raw.Select(colors =>
            {
                PaletteColor.TryParseHex(colors[0], out var dominant);

                var clash = existing
                    .Select(e => (e.Name, Distance: PaletteColor.Distance(dominant, e.Rgb)))
                    .Where(e => e.Distance < PaletteColor.TooSimilar)
                    .OrderBy(e => e.Distance)
                    .Select(e => e.Name)
                    .FirstOrDefault();

                return new PaletteCandidate(colors, clash);
            }).ToList();
        }

        /// <summary>
        /// One ledger row per call, success or failure, so the budget caps above can see this
        /// feature's spend. The quiz-shaped columns stay at their defaults — see
        /// <see cref="AiGenerationMode.PaletteProposal"/>.
        /// </summary>
        private async Task RecordAsync(
            Guid userId, AiProviderResult? reply, string? errorCode, CancellationToken ct)
        {
            var input = reply?.Usage.InputTokens ?? 0;
            var output = reply?.Usage.OutputTokens ?? 0;

            var now = DateTime.UtcNow;

            await _usages.AddAsync(new AiGenerationUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = errorCode is null ? AiGenerationStatus.Succeeded : AiGenerationStatus.Released,
                Mode = AiGenerationMode.PaletteProposal,
                Model = _provider.Model,
                InputTokens = input,
                OutputTokens = output,
                EstimatedCostUsd =
                    input / 1_000_000m * _options.InputCostPerMillionUsd +
                    output / 1_000_000m * _options.OutputCostPerMillionUsd,
                ErrorCode = errorCode,
                CreatedAt = now,
                CompletedAt = now,
            }, ct);

            // AddAsync only tracks the row; the ledger is worthless if this is forgotten.
            await _usages.SaveChangesAsync(ct);
        }
    }
}
