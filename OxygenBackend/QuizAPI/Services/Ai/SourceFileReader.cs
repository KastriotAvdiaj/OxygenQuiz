using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.Extensions.Options;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;
using UglyToad.PdfPig.Exceptions;

namespace QuizAPI.Services.Ai
{
    /// <summary>What reading an uploaded file produced: the text, or a code saying why there is none.</summary>
    public sealed record SourceFileResult
    {
        public bool Success { get; init; }

        /// <summary>
        /// The extracted text, whitespace-normalised and cut to <see cref="AiOptions.MaxSourceChars"/>.
        /// This is what the browser shows, sends back as <c>sourceText</c>, and checks quotes against,
        /// so all three see the same string.
        /// </summary>
        public string? Text { get; init; }

        /// <summary>True when the file held more than <see cref="AiOptions.MaxSourceChars"/> and only the start was kept.</summary>
        public bool Truncated { get; init; }

        /// <summary><see cref="SourceLanguageDetector.English"/> or <see cref="SourceLanguageDetector.Albanian"/>.</summary>
        public string? Language { get; init; }

        /// <summary>One of <see cref="AiErrorCodes"/> when <see cref="Success"/> is false.</summary>
        public string? ErrorCode { get; init; }

        /// <summary>User-facing; safe to display.</summary>
        public string? Message { get; init; }

        public static SourceFileResult Fail(string code, string message) =>
            new() { Success = false, ErrorCode = code, Message = message };
    }

    /// <summary>Turns an uploaded file into the plain text Source mode generates from.</summary>
    public interface ISourceFileReader
    {
        /// <param name="content">The upload. Read once; not disposed here.</param>
        /// <param name="fileName">Only its extension is used — the client's content type is not trusted.</param>
        /// <param name="length">The upload's size in bytes, checked before anything is read.</param>
        Task<SourceFileResult> ReadAsync(Stream content, string fileName, long length, CancellationToken ct = default);
    }

    /// <summary>
    /// PDF, Word (.docx) and plain text (.txt, .md). Extraction happens on the server so that what
    /// the model reads, what the quote check compares against and what the user sees are one
    /// string, produced once — and so the browser bundle carries no PDF parser.
    ///
    /// <para><b>Limits.</b> A file over <see cref="AiOptions.MaxSourceFileBytes"/> is refused
    /// unread. Reading stops once the text passes <see cref="AiOptions.MaxSourceChars"/>, so a
    /// 400-page PDF costs as much as its first pages, and the result says it was cut. Word files
    /// are zip archives; <see cref="OpenSettings.MaxCharactersInPart"/> bounds a decompression bomb.</para>
    ///
    /// <para><b>What fails, and as what.</b> A scan with no text layer, an encrypted PDF, a
    /// corrupt file and an unknown extension are all <see cref="AiErrorCodes.UnreadableSource"/>,
    /// each with its own message, because each has a different fix. A readable file in another
    /// language is <see cref="AiErrorCodes.UnsupportedLanguage"/>, the same check generation runs.</para>
    /// </summary>
    public sealed class SourceFileReader : ISourceFileReader
    {
        private static readonly string[] TextExtensions = { ".txt", ".md" };

        /// <summary>What the UI lists, so a refused file names the formats that would have worked.</summary>
        public const string AcceptedFormats = "a PDF, a Word document (.docx) or a text file (.txt, .md)";

        private readonly AiOptions _options;
        private readonly ILogger<SourceFileReader> _logger;

        public SourceFileReader(IOptions<AiOptions> options, ILogger<SourceFileReader> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public async Task<SourceFileResult> ReadAsync(
            Stream content, string fileName, long length, CancellationToken ct = default)
        {
            if (length <= 0)
                return SourceFileResult.Fail(AiErrorCodes.UnreadableSource, "That file is empty.");

            if (length > _options.MaxSourceFileBytes)
                return SourceFileResult.Fail(
                    AiErrorCodes.SourceTooLarge,
                    $"That file is larger than {_options.MaxSourceFileBytes / (1024 * 1024)} MB. Upload a smaller one, or paste the part you want.");

            var extension = Path.GetExtension(fileName ?? string.Empty).ToLowerInvariant();
            if (extension != ".pdf" && extension != ".docx" && !TextExtensions.Contains(extension))
                return SourceFileResult.Fail(
                    AiErrorCodes.UnreadableSource,
                    $"That file type can't be read. Upload {AcceptedFormats}.");

            // Buffered: both parsers need a seekable stream, and the size is already bounded.
            using var buffer = new MemoryStream((int)Math.Min(length, int.MaxValue));
            await content.CopyToAsync(buffer, ct);
            buffer.Position = 0;

            // Read a little past the limit, so "was it cut?" has an honest answer.
            var budget = _options.MaxSourceChars + 1;

            string raw;
            try
            {
                raw = extension switch
                {
                    ".pdf" => ReadPdf(buffer, budget, ct),
                    ".docx" => ReadDocx(buffer, budget, ct),
                    _ => await ReadTextAsync(buffer, ct),
                };
            }
            catch (PdfDocumentEncryptedException)
            {
                return SourceFileResult.Fail(
                    AiErrorCodes.UnreadableSource,
                    "That PDF is password-protected. Remove the password, or paste the text instead.");
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Corrupt or unusual files land here. The parser's message is not the user's
                // business, but it is ours.
                _logger.LogWarning(ex, "Could not read uploaded {Extension} file.", extension);
                return SourceFileResult.Fail(
                    AiErrorCodes.UnreadableSource,
                    "That file couldn't be read. It may be damaged — try saving it again, or paste the text instead.");
            }

            var text = Normalise(raw);

            // Same floor as generation (AiGenerationService.ValidateContent). A PDF that yields
            // nothing is almost always a scan: pages of pictures of text.
            if (text.Length < 40)
                return SourceFileResult.Fail(
                    AiErrorCodes.UnreadableSource,
                    extension == ".pdf"
                        ? "We couldn't find any text in that PDF. If it's a scan, it holds pictures of text rather than text — paste the text instead."
                        : "We couldn't find enough text in that file to write questions from.");

            var truncated = text.Length > _options.MaxSourceChars;
            if (truncated) text = CutAtWord(text, _options.MaxSourceChars);

            var language = SourceLanguageDetector.Detect(text);
            if (language is null)
                return SourceFileResult.Fail(AiErrorCodes.UnsupportedLanguage, AiGenerationService.UnsupportedLanguageMessage);

            return new SourceFileResult { Success = true, Text = text, Truncated = truncated, Language = language };
        }

        private static string ReadPdf(Stream stream, int budget, CancellationToken ct)
        {
            var sb = new StringBuilder();
            using var document = PdfDocument.Open(stream);
            foreach (var page in document.GetPages())
            {
                ct.ThrowIfCancellationRequested();
                // Reading order rather than page.Text, which glues letters together wherever the
                // PDF positions words instead of spacing them — and then no quote ever matches.
                sb.AppendLine(ContentOrderTextExtractor.GetText(page));
                sb.AppendLine();
                if (sb.Length >= budget) break;
            }
            return sb.ToString();
        }

        private static string ReadDocx(Stream stream, int budget, CancellationToken ct)
        {
            var sb = new StringBuilder();
            var settings = new OpenSettings { MaxCharactersInPart = 20_000_000 };
            using var document = WordprocessingDocument.Open(stream, isEditable: false, settings);
            var body = document.MainDocumentPart?.Document?.Body;
            if (body is null) return string.Empty;

            foreach (var paragraph in body.Descendants<Paragraph>())
            {
                ct.ThrowIfCancellationRequested();
                sb.AppendLine(paragraph.InnerText);
                if (sb.Length >= budget) break;
            }
            return sb.ToString();
        }

        private static async Task<string> ReadTextAsync(Stream stream, CancellationToken ct)
        {
            // UTF-8 unless a byte-order mark says otherwise. Invalid bytes become U+FFFD rather than
            // failing — a stray Windows-1252 character should not cost the whole file.
            using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            return await reader.ReadToEndAsync(ct);
        }

        private static readonly Regex SpaceRuns = new(@"[ \t\f\v ]+", RegexOptions.Compiled);
        private static readonly Regex BlankRuns = new(@"\n{3,}", RegexOptions.Compiled);

        /// <summary>
        /// One space between words, at most one blank line between paragraphs, no trailing spaces.
        /// PDFs especially come out with ragged spacing; collapsing it keeps the 40,000 characters
        /// for content and makes the text something a person can read in the review box.
        /// </summary>
        internal static string Normalise(string raw)
        {
            var text = raw.Replace("\r\n", "\n").Replace('\r', '\n');
            text = SpaceRuns.Replace(text, " ");
            text = string.Join('\n', text.Split('\n').Select(l => l.Trim()));
            text = BlankRuns.Replace(text, "\n\n");
            return text.Trim();
        }

        /// <summary>Cut to at most <paramref name="max"/> characters, at a word boundary when one is near.</summary>
        internal static string CutAtWord(string text, int max)
        {
            if (text.Length <= max) return text;
            var cut = text.LastIndexOfAny(new[] { ' ', '\n' }, max - 1, Math.Min(max, 200));
            return text[..(cut > 0 ? cut : max)].TrimEnd();
        }
    }
}
