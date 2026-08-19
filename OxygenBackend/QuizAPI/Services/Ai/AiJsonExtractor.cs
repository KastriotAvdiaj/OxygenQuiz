using System.Text.Json;

namespace QuizAPI.Services.Ai
{
    /// <summary>
    /// Pulls the JSON object out of a model reply that may be wrapped in prose or code fences.
    ///
    /// This is the C# twin of <c>extractJson</c> in <c>parse-ai-output.ts</c>, and it is
    /// deliberately the <b>only</b> validation done server-side. It answers one question — "is
    /// there a JSON object here with a non-empty questions array?" — because that is exactly
    /// what the orchestrator needs in order to decide whether retrying the model is worthwhile.
    /// Every semantic rule (per-type fields, difficulty resolution, clamping, drop reasons)
    /// stays in the browser parser that already owns it. See plan §5.2.
    ///
    /// JSON mode makes fences unlikely, but "unlikely" is not "impossible" and the fallback
    /// costs nothing.
    /// </summary>
    public static class AiJsonExtractor
    {
        /// <summary>
        /// Returns the compacted JSON object and how many questions it contains, or null when
        /// the reply holds no usable object.
        /// </summary>
        public static AiExtractedPayload? TryExtract(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;

            var trimmed = raw.Trim();

            foreach (var candidate in Candidates(trimmed))
            {
                var payload = TryReadPayload(candidate);
                if (payload is not null) return payload;
            }

            return null;
        }

        private static IEnumerable<string> Candidates(string trimmed)
        {
            // ```json ... ``` or ``` ... ```
            var fenceStart = trimmed.IndexOf("```", StringComparison.Ordinal);
            if (fenceStart >= 0)
            {
                var afterOpen = trimmed.IndexOf('\n', fenceStart);
                var fenceEnd = afterOpen >= 0
                    ? trimmed.IndexOf("```", afterOpen, StringComparison.Ordinal)
                    : -1;

                if (afterOpen >= 0 && fenceEnd > afterOpen)
                    yield return trimmed[(afterOpen + 1)..fenceEnd].Trim();
            }

            yield return trimmed;

            // Outermost { ... } anywhere in the reply.
            var first = trimmed.IndexOf('{');
            var last = trimmed.LastIndexOf('}');
            if (first >= 0 && last > first)
                yield return trimmed[first..(last + 1)];
        }

        private static AiExtractedPayload? TryReadPayload(string candidate)
        {
            if (string.IsNullOrWhiteSpace(candidate)) return null;

            try
            {
                using var document = JsonDocument.Parse(candidate);

                if (document.RootElement.ValueKind != JsonValueKind.Object) return null;
                if (!document.RootElement.TryGetProperty("questions", out var questions)) return null;
                if (questions.ValueKind != JsonValueKind.Array) return null;

                var count = questions.GetArrayLength();
                if (count == 0) return null;

                // Re-serialise from the parsed document so what we hand on is compact, valid JSON
                // with any surrounding prose gone — the client should never see the model's
                // chatter. The object is forwarded whole, including the model's title / category
                // / language, which the browser reads for itself (plan §5.2).
                return new AiExtractedPayload(document.RootElement.GetRawText(), count);
            }
            catch (JsonException)
            {
                return null;
            }
        }
    }

    /// <param name="Json">The extracted object. Always contains a non-empty "questions" array.</param>
    /// <param name="QuestionCount">Elements in that array. Always ≥ 1.</param>
    public sealed record AiExtractedPayload(string Json, int QuestionCount);
}
