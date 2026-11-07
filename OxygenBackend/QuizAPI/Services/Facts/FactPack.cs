using System.Text.Json.Serialization;

namespace QuizAPI.Services.Facts
{
    /// <summary>
    /// A fact pack: one reviewed Wikidata query and the facts it returned, plus the templates that
    /// turn a fact into a question (docs/quiz/fact-quizzes.md). Read from
    /// <c>FactPacks/&lt;slug&gt;.json</c>; the facts in it are written by
    /// <c>scripts/facts/build.mjs</c>, everything else by hand.
    /// </summary>
    public sealed class FactPack
    {
        public string Slug { get; set; } = string.Empty;

        /// <summary>By quiz language name ("English", "Albanian").</summary>
        public Dictionary<string, string> Title { get; set; } = new();

        public Dictionary<string, string> Description { get; set; } = new();

        /// <summary>What the pack does and doesn't include, and why — the editorial choices (Kosovo counts).</summary>
        public string? EditorialNote { get; set; }

        /// <summary>A category name as stored in <c>QuestionCategories</c>; the wizard resolves it like the model's.</summary>
        public string? Category { get; set; }

        /// <summary>The SPARQL the facts came from — linked from the review, so anyone can re-run it.</summary>
        public string? Query { get; set; }

        /// <summary>The query, opened in the Wikidata Query Service.</summary>
        public string? QueryUrl => string.IsNullOrWhiteSpace(Query) ? null : "https://query.wikidata.org/#" + Uri.EscapeDataString(Query);

        /// <summary><c>entity</c> (the value is another item: a capital) or <c>quantity</c> (a number: an elevation).</summary>
        public string Kind { get; set; } = FactKinds.Entity;

        /// <summary>Quantity packs: the unit the build normalised to, shown after every number.</summary>
        public string? Unit { get; set; }

        /// <summary>By language, then by question style (<see cref="FactStyles"/>). A style with no template isn't asked.</summary>
        /// <remarks>
        /// Each style holds one wording or several (<see cref="Wordings"/>): "What is the capital of
        /// France?", "The capital of France is _____." A quiz rotates through them so it doesn't read
        /// as one sentence with the names swapped.
        /// </remarks>
        public Dictionary<string, Dictionary<string, Wordings>> Templates { get; set; } = new();

        /// <summary>
        /// Hand-written grammatical forms, by Wikidata id, then language, then form name:
        /// <c>{ "Q142": { "Albanian": { "gen": "Francës" } } }</c>. Templates ask for them as
        /// <c>{subject.gen}</c>; see <see cref="Names"/>.
        /// </summary>
        public Dictionary<string, Dictionary<string, Dictionary<string, string>>> Forms { get; set; } = new();

        /// <summary>The day the facts were fetched — shown in the review, so a stale pack is visible.</summary>
        public string? BuiltAt { get; set; }

        public List<Fact> Facts { get; set; } = new();

        public bool IsQuantity => string.Equals(Kind, FactKinds.Quantity, StringComparison.OrdinalIgnoreCase);

        /// <summary>The Wikidata item a question links to — the subject's page.</summary>
        public static string ItemUrl(string qid) => $"https://www.wikidata.org/wiki/{qid}";
    }

    /// <summary>
    /// A style's wordings. Written as one string or a list in the pack file; always a list here.
    /// The first is the canonical one — the <c>statement</c> style only ever uses it, because a
    /// fact's statement is also its quote and has to be the same every time.
    /// </summary>
    [JsonConverter(typeof(WordingsConverter))]
    public sealed class Wordings : List<string>
    {
        public Wordings() { }
        public Wordings(IEnumerable<string> items) : base(items) { }
    }

    internal sealed class WordingsConverter : JsonConverter<Wordings>
    {
        public override Wordings Read(ref System.Text.Json.Utf8JsonReader reader, Type typeToConvert, System.Text.Json.JsonSerializerOptions options) =>
            reader.TokenType == System.Text.Json.JsonTokenType.String
                ? new Wordings(new[] { reader.GetString()! })
                : new Wordings(System.Text.Json.JsonSerializer.Deserialize<List<string>>(ref reader, options) ?? new());

        public override void Write(System.Text.Json.Utf8JsonWriter writer, Wordings value, System.Text.Json.JsonSerializerOptions options) =>
            System.Text.Json.JsonSerializer.Serialize(writer, (List<string>)value, options);
    }

    public sealed class Fact
    {
        /// <summary>The subject's Wikidata id, e.g. <c>Q142</c> (France).</summary>
        public string Subject { get; set; } = string.Empty;

        /// <summary>How many Wikipedias have an article on the subject — the popularity signal.</summary>
        public int Sitelinks { get; set; }

        /// <summary>Entity packs: the value's Wikidata id, e.g. <c>Q90</c> (Paris).</summary>
        public string? Value { get; set; }

        /// <summary>Quantity packs: the number, in <see cref="FactPack.Unit"/>.</summary>
        public double? Amount { get; set; }

        /// <summary>By language. A language missing here means no label in it: the fact isn't used in that language.</summary>
        public Dictionary<string, FactLabels> Labels { get; set; } = new();
    }

    public sealed class FactLabels
    {
        public string Subject { get; set; } = string.Empty;
        public string? Value { get; set; }

        /// <summary>Other names for the value — accepted for a typed answer.</summary>
        public List<string> ValueAliases { get; set; } = new();
    }

    public static class FactKinds
    {
        public const string Entity = "entity";
        public const string Quantity = "quantity";
    }

    /// <summary>
    /// The ways a fact can be asked. A pack opts into a style by giving it a template; the request's
    /// question types narrow it further.
    /// </summary>
    public static class FactStyles
    {
        // Entity packs
        /// <summary>"What is the capital of France?" — multiple choice over other capitals.</summary>
        public const string Plain = "plain";
        /// <summary>"Paris is the capital of which country?" — multiple choice over other countries.</summary>
        public const string Reverse = "reverse";
        /// <summary>"Madrid is the capital of France." — true half the time.</summary>
        public const string TrueFalse = "trueFalse";
        /// <summary>"What is the capital of France? Type the city." — aliases accepted.</summary>
        public const string Typed = "typed";

        // Quantity packs
        /// <summary>"How high is Korab?" — multiple choice over other peaks' heights.</summary>
        public const string Amount = "amount";
        /// <summary>"Which of these peaks is the highest?" — once per quiz; the stem never changes.</summary>
        public const string Highest = "highest";
        /// <summary>"Korab is higher than Dajti." — true or false.</summary>
        public const string Compare = "compare";

        /// <summary>Both kinds: the fact as a sentence — the explanation, and the quote the parser checks.</summary>
        public const string Statement = "statement";

        [JsonIgnore]
        public static readonly IReadOnlyDictionary<string, string> TypeOf = new Dictionary<string, string>
        {
            [Plain] = "MultipleChoice",
            [Reverse] = "MultipleChoice",
            [TrueFalse] = "TrueFalse",
            [Typed] = "TypeTheAnswer",
            [Amount] = "MultipleChoice",
            [Highest] = "MultipleChoice",
            [Compare] = "TrueFalse",
        };
    }
}
