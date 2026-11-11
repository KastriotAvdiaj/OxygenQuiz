using System.Text.Json;

namespace QuizAPI.Services.Ai.ScreenshotImport
{
    /// <summary>
    /// The two prompts of screenshot import (docs/quiz/screenshot-import.md). Reading copies what is
    /// on the image and thinks not at all; completing fills in what the image didn't show, and may
    /// think. Splitting them is what keeps the common case — a screenshot with its answer on it —
    /// cheap.
    /// </summary>
    public static class ScreenshotImportPrompts
    {
        /// <summary>Lets the fake provider tell these calls from quiz generation.</summary>
        public const string ReadMarker = "[screenshot-import:read]";
        public const string CompleteMarker = "[screenshot-import:complete]";

        public static string BuildRead(
            IReadOnlyCollection<string> categories,
            IReadOnlyCollection<string> difficulties,
            IReadOnlyCollection<string> languages,
            int maxQuestions) =>
            $$"""
            {{ReadMarker}}
            You read quiz questions off an image for a quiz app. COPY what is shown; never invent a
            question, never translate, never improve the wording beyond fixing obvious reading errors.

            Reply with JSON only, in this shape:
            {"questions":[{
              "text": string,                       // the question exactly as written, in its own language
              "seenType": "MultipleChoice" | "TrueFalse" | "TypeTheAnswer",
              "shownOptions": [string],             // the answer options on the image; [] if none
              "shownAnswer": string | null,         // the answer if the image marks or states it, else null
              "needsItsPicture": boolean,           // true if the question can't be asked without a picture on the image
              "imageQuery": string | null,          // if a picture would help: a short subject to search for (e.g. "Flag of Kosovo"); never a URL
              "category": string | null,            // exactly one of: {{List(categories)}}; null if none fits
              "difficulty": string | null,          // exactly one of: {{List(difficulties)}}; null if unsure
              "language": string | null             // exactly one of: {{List(languages)}}; the language the question is written in
            }]}

            Rules:
            - Only questions actually on the image. No questions on it → {"questions":[]}.
            - Text written in capitals: write it in normal sentence case, keeping proper nouns
              capitalised ("WHERE IS DUBAI?" → "Where is Dubai?"). Change the letter case only, never the words.
            - A statement to judge true or false is "TrueFalse"; its shownAnswer is "true" or "false".
            - At most {{maxQuestions}} questions.
            """;

        public static string BuildComplete(IReadOnlyList<(int Index, string Text, string SeenType, IReadOnlyList<string> Options, string? Answer)> items) =>
            $$"""
            {{CompleteMarker}}
            These quiz questions were copied from an image. For each, give what a quiz app needs and the
            image didn't show. Write in the question's own language. Be factually careful: if you are not
            sure of an answer, give your best answer — a person checks every one.

            Questions:
            {{JsonSerializer.Serialize(items.Select(i => new { index = i.Index, text = i.Text, seenType = i.SeenType, shownOptions = i.Options, shownAnswer = i.Answer }))}}

            Reply with JSON only:
            {"answers":[{
              "index": number,                 // the question's index above
              "text": string | null,           // only if the question is written in CAPITALS: the same words in sentence case, proper nouns capitalised ("WHERE IS DUBAI?" → "Where is Dubai?"); otherwise null
              "correctAnswer": string,         // keep shownAnswer if given (in normal case if it is in capitals); for TrueFalse "true" or "false"
              "wrongOptions": [string],        // exactly 3 plausible wrong answers; keep shown wrong options first (in normal case)
              "acceptableAnswers": [string],   // other spellings a typed answer should accept; may be empty
              "explanation": string | null     // one or two sentences on why the answer is right
            }]}
            """;

        private static string List(IReadOnlyCollection<string> names) =>
            names.Count == 0 ? "(none)" : string.Join(", ", names.Select(n => $"\"{n}\""));
    }
}
