using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace QuizAPI.Services.FeaturedQuizzes
{
    /// <summary>
    /// The featured quizzes as written in <c>Seed/featured-quizzes.json</c> (an embedded resource):
    /// four categories × four difficulties, ten questions each. This is the content the seeder
    /// creates when a quiz is missing; once created, the database copy is the one that counts
    /// (docs/quiz/featured-quizzes.md).
    /// </summary>
    public sealed record FeaturedQuizContent(IReadOnlyList<FeaturedQuizDefinition> Quizzes)
    {
        private const string ResourceName = "QuizAPI.Seed.featured-quizzes.json";

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            Converters = { new JsonStringEnumConverter() },
        };

        public static FeaturedQuizContent Load()
        {
            using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
                ?? throw new InvalidOperationException($"Embedded resource {ResourceName} is missing.");
            return Parse(stream);
        }

        public static FeaturedQuizContent Parse(Stream json) =>
            JsonSerializer.Deserialize<FeaturedQuizContent>(json, JsonOptions)
            ?? throw new InvalidOperationException("featured-quizzes.json is empty.");

        /// <summary>
        /// Every way the file can break the rules agreed for featured quizzes. Empty means valid.
        /// Run by a unit test over the real file, so a bad edit fails CI instead of reaching a
        /// database; the seeder also skips any quiz this reports on, rather than seed it broken.
        /// </summary>
        public IReadOnlyList<string> Validate()
        {
            var errors = new List<string>();

            foreach (var dupe in Quizzes.GroupBy(q => q.Key).Where(g => g.Count() > 1))
                errors.Add($"Key '{dupe.Key}' is used more than once.");

            foreach (var quiz in Quizzes)
                errors.AddRange(quiz.Validate().Select(e => $"{quiz.Key}: {e}"));

            return errors;
        }
    }

    public sealed record FeaturedQuizDefinition(
        string Key,
        string Category,
        string Difficulty,
        string Title,
        string Description,
        IReadOnlyList<FeaturedQuestionDefinition> Questions)
    {
        public const int QuestionsPerQuiz = 10;
        public const int OptionsPerMultipleChoice = 4;

        /// <summary>
        /// The base time per question at each level. A question may be given more, never less —
        /// twenty seconds is the floor below which play stops being fun.
        /// </summary>
        public static readonly IReadOnlyDictionary<string, int> MinimumSecondsByDifficulty =
            new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["Easy"] = 20,
                ["Medium"] = 25,
                ["Hard"] = 30,
                ["Expert"] = 35,
            };

        public IEnumerable<string> Validate()
        {
            if (!MinimumSecondsByDifficulty.TryGetValue(Difficulty, out var minimumSeconds))
            {
                yield return $"difficulty '{Difficulty}' is not one of Easy, Medium, Hard, Expert.";
                yield break;
            }

            if (string.IsNullOrWhiteSpace(Title)) yield return "has no title.";
            if (Questions.Count != QuestionsPerQuiz)
                yield return $"has {Questions.Count} questions, not {QuestionsPerQuiz}.";

            var easyOrMedium = Difficulty is "Easy" or "Medium";
            var expert = Difficulty == "Expert";

            for (var i = 0; i < Questions.Count; i++)
            {
                var q = Questions[i];
                var at = $"question {i + 1}";

                if (string.IsNullOrWhiteSpace(q.Text)) yield return $"{at} has no text.";
                if (string.IsNullOrWhiteSpace(q.Explanation)) yield return $"{at} has no explanation.";
                if (q.Seconds < minimumSeconds)
                    yield return $"{at} gives {q.Seconds}s; {Difficulty} questions get at least {minimumSeconds}s.";

                switch (q.Type)
                {
                    case FeaturedQuestionType.MultipleChoice:
                        if (q.Options is not { Count: OptionsPerMultipleChoice })
                            yield return $"{at} needs exactly {OptionsPerMultipleChoice} options.";
                        else if (q.Correct is not int c || c < 0 || c >= q.Options.Count)
                            yield return $"{at} has no valid 'correct' option index.";
                        else if (q.Options.Distinct(StringComparer.OrdinalIgnoreCase).Count() != q.Options.Count)
                            yield return $"{at} repeats an option.";
                        break;

                    case FeaturedQuestionType.TrueFalse:
                        if (expert) yield return $"{at} is true/false, which Expert quizzes don't use.";
                        if (q.Answer is not bool) yield return $"{at} needs a true/false 'answer'.";
                        break;

                    case FeaturedQuestionType.TypeTheAnswer:
                        if (easyOrMedium) yield return $"{at} is type-the-answer, which {Difficulty} quizzes don't use.";
                        if (string.IsNullOrWhiteSpace(q.TextAnswer)) yield return $"{at} needs a text 'answer'.";
                        break;
                }
            }
        }
    }

    public enum FeaturedQuestionType { MultipleChoice, TrueFalse, TypeTheAnswer }

    /// <summary>
    /// One question. <c>answer</c> in the JSON is a bool for true/false and a string for
    /// type-the-answer; multiple choice uses <c>options</c> and <c>correct</c> instead.
    /// </summary>
    public sealed class FeaturedQuestionDefinition
    {
        public FeaturedQuestionType Type { get; init; }
        public string Text { get; init; } = string.Empty;
        public int Seconds { get; init; }
        public string Explanation { get; init; } = string.Empty;

        /// <summary>Multiple choice only: exactly four options, and the index of the right one.</summary>
        public IReadOnlyList<string>? Options { get; init; }
        public int? Correct { get; init; }

        /// <summary>Type-the-answer only: other spellings that also count as correct.</summary>
        public IReadOnlyList<string>? Accept { get; init; }

        [JsonPropertyName("answer")]
        public JsonElement? AnswerJson { get; init; }

        /// <summary>True/false: the right answer.</summary>
        [JsonIgnore]
        public bool? Answer => AnswerJson is { ValueKind: JsonValueKind.True } ? true
            : AnswerJson is { ValueKind: JsonValueKind.False } ? false
            : null;

        /// <summary>Type-the-answer: the canonical answer.</summary>
        [JsonIgnore]
        public string? TextAnswer => AnswerJson is { ValueKind: JsonValueKind.String } a ? a.GetString() : null;
    }
}
