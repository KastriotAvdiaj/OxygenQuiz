namespace QuizAPI.Services.Ai.CategoryPalette
{
    /// <summary>What an admin is asking for: colours that suit a category name.</summary>
    /// <param name="CategoryName">The name being created. The only thing the model is told.</param>
    public sealed record CategoryPaletteRequest(string CategoryName);

    /// <param name="Colors">3–5 validated <c>#rrggbb</c> strings, in the order the model gave them.</param>
    /// <param name="ClashesWith">
    /// The name of an existing category whose palette this one sits too close to, or null.
    ///
    /// <para><b>Annotated, not filtered.</b> The admin is choosing — telling them "this looks like
    /// Geography" is more useful than silently dropping a candidate they might have wanted anyway,
    /// and dropping would sometimes leave them with fewer than three options for no visible
    /// reason. Collisions are acceptable eventually; being surprised by one is not.</para>
    /// </param>
    public sealed record PaletteCandidate(IReadOnlyList<string> Colors, string? ClashesWith);

    /// <param name="Candidates">Three, so "give me another" is a click rather than a second call.</param>
    /// <param name="Model">Model id, for the ledger and for answering "why did these change".</param>
    public sealed record CategoryPaletteResult(
        IReadOnlyList<PaletteCandidate> Candidates, string Model);

    /// <summary>
    /// Thrown when the model's reply cannot be trusted — no JSON, wrong shape, or not one
    /// candidate survives validation. Surfaces as a 502 with
    /// <see cref="AiErrorCodes.ModelOutputInvalid"/>, never as a silent fallback palette.
    /// </summary>
    public sealed class PaletteProposalException(string message) : Exception(message);
}
