namespace QuizAPI.Services.Ai.ScreenshotImport
{
    /// <summary>
    /// <c>Ai:ScreenshotImport</c> — docs/quiz/screenshot-import.md. The feature ships dark: it is
    /// off until <see cref="Enabled"/> is set, which waits for the test set in that doc to pass.
    /// It also needs AI on and a vendor whose entry sets <c>AllowsImages</c>.
    /// </summary>
    public sealed class ScreenshotImportOptions
    {
        public bool Enabled { get; set; }

        /// <summary>Images an Admin may read per UTC day. SuperAdmins are uncounted.</summary>
        public int DailyImagesPerAdmin { get; set; } = 30;

        /// <summary>
        /// The long edge an image is shrunk to before it is sent. ~1344 px is what the model reads
        /// (DeepSeek V4.1 Flash); a larger image costs more and reads no better.
        /// </summary>
        public int MaxEdge { get; set; } = 1344;

        /// <summary>
        /// Reasoning effort for reading the image. "none": copying text needs no thinking, and the
        /// thinking is most of a call's cost. Blank keeps the vendor's own setting.
        /// </summary>
        public string? ReadReasoningEffort { get; set; } = "none";

        /// <summary>Output room for one image's questions — about 15 questions with options.</summary>
        public int ReadMaxOutputTokens { get; set; } = 3_000;

        /// <summary>Output room for completing answers and options, which does think.</summary>
        public int CompleteMaxOutputTokens { get; set; } = 3_000;

        /// <summary>The most questions taken from one image; the rest are dropped.</summary>
        public int MaxQuestionsPerImage { get; set; } = 15;
    }
}
