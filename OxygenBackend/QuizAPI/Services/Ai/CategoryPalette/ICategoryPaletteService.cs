namespace QuizAPI.Services.Ai.CategoryPalette
{
    /// <summary>
    /// Proposes colour palettes for a category name. <b>Proposes only</b> — nothing here writes a
    /// category, and the endpoint that calls it does not either. See
    /// docs/adr/0003-the-model-proposes-the-code-decides.md.
    /// </summary>
    public interface ICategoryPaletteService
    {
        Task<CategoryPaletteResult> ProposeAsync(
            CategoryPaletteRequest request, Guid userId, CancellationToken ct);
    }
}
