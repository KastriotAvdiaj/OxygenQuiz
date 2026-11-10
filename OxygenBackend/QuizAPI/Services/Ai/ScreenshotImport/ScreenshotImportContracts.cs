using QuizAPI.Models;

namespace QuizAPI.Services.Ai.ScreenshotImport
{
    /// <summary>
    /// What a screenshot's questions should become (docs/quiz/screenshot-import.md, "Question type").
    /// A true/false statement stays true/false whatever is chosen: it has no options to offer.
    /// </summary>
    public enum ScreenshotMakeType
    {
        MultipleChoice = 0,
        AsTheyAppear = 1,
        TypeTheAnswer = 2,
    }

    /// <summary>One question read from an image, proposed — nothing is saved until a person does.</summary>
    public sealed class ScreenshotQuestionDTO
    {
        /// <summary>The type the reviewer starts on: the import's choice applied to what was seen.</summary>
        public QuestionType Type { get; init; }

        /// <summary>The type it looked like on the image.</summary>
        public QuestionType SeenType { get; init; }

        public string Text { get; init; } = string.Empty;

        /// <summary>The answer — for true/false "true" or "false". Always present on a usable row.</summary>
        public string CorrectAnswer { get; init; } = string.Empty;

        /// <summary>Three wrong options, so switching a row to multiple choice needs no second call.</summary>
        public IReadOnlyList<string> WrongOptions { get; init; } = Array.Empty<string>();

        /// <summary>Other spellings a typed answer would accept.</summary>
        public IReadOnlyList<string> AcceptableAnswers { get; init; } = Array.Empty<string>();

        public string? Explanation { get; init; }

        /// <summary>True when the answer was read off the image; false when the model filled it in.</summary>
        public bool AnswerFromImage { get; init; }

        /// <summary>True when every option was on the image; false when the model wrote some.</summary>
        public bool OptionsFromImage { get; init; }

        /// <summary>
        /// The picture is the question ("what is missing from this flag?"). Not supported yet: the
        /// row is shown, greyed out, and can't be saved.
        /// </summary>
        public bool NeedsItsPicture { get; init; }

        /// <summary>A picker search phrase, if a picture would help. Never a URL.</summary>
        public string? ImageQuery { get; init; }

        /// <summary>Existing rows only; null when the model's guess matched none.</summary>
        public int? CategoryId { get; init; }
        public int? DifficultyId { get; init; }
        public int? LanguageId { get; init; }

        /// <summary>An existing question with the same wording, if any.</summary>
        public int? DuplicateOfId { get; init; }
    }

    public sealed record ScreenshotReadResult(
        IReadOnlyList<ScreenshotQuestionDTO> Questions,
        /// <summary>Images left today, or null for unlimited.</summary>
        int? ImagesLeftToday);

    public sealed record ScreenshotImportStatus(
        bool Enabled,
        string? Reason,
        int? ImagesLeftToday,
        int MaxImagesPerImport);
}
