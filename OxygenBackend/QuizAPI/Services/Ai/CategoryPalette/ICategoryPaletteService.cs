namespace QuizAPI.Services.Ai.CategoryPalette
{
    /// <summary>
    /// Proposes colour palettes for a category name. <b>Proposes only</b> — nothing here writes a
    /// category, and the endpoint that calls it does not either. See
    /// docs/adr/0003-the-model-proposes-the-code-decides.md.
    /// </summary>
    public interface ICategoryPaletteService
    {
        /// <summary>
        /// Whether the AI is configured to answer at all, and why not when it isn't. Read by the
        /// availability endpoint so the "Suggest colours" button can be disabled with a reason
        /// instead of failing on click. Configuration only — not the budget; see the implementation.
        /// </summary>
        AiAvailability Availability { get; }

        Task<CategoryPaletteResult> ProposeAsync(
            CategoryPaletteRequest request, Guid userId, CancellationToken ct);
    }
}
