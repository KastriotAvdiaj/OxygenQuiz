using System.Text;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuizAPI.Services.Ai;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// Real files, built in memory with the same libraries that read them, so these exercise the
/// parsers rather than a mock of them. Each failure case checks the code <i>and</i> that the
/// message names the fix, because every one of them reaches a user who has to act on it.
/// </summary>
public class SourceFileReaderTests
{
    private const string English =
        "Photosynthesis is the process by which green plants use sunlight to make sugars from carbon " +
        "dioxide and water. It takes place mainly in the leaves, where the chloroplasts contain chlorophyll.";

    private const string Albanian =
        "Rilindja Kombëtare ishte një periudhë e rëndësishme në historinë e shqiptarëve. Gjatë kësaj " +
        "kohe, shkrimtarët dhe atdhetarët punuan për të ruajtur gjuhën shqipe dhe për të krijuar shkolla.";

    private const string German =
        "Die Photosynthese ist ein Prozess, bei dem Pflanzen mit Hilfe von Sonnenlicht aus Kohlendioxid " +
        "und Wasser Zucker herstellen. Sie findet vor allem in den Blättern statt.";

    private static SourceFileReader Reader(int maxChars = 40_000, long maxBytes = 10 * 1024 * 1024) =>
        new(Options.Create(new AiOptions { MaxSourceChars = maxChars, MaxSourceFileBytes = maxBytes }),
            NullLogger<SourceFileReader>.Instance);

    private static Task<SourceFileResult> Read(byte[] bytes, string name, SourceFileReader? reader = null) =>
        (reader ?? Reader()).ReadAsync(new MemoryStream(bytes), name, bytes.Length);

    private static byte[] Utf8(string text) => Encoding.UTF8.GetBytes(text);

    private static byte[] Docx(params string[] paragraphs)
    {
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document))
        {
            var main = doc.AddMainDocumentPart();
            main.Document = new Document(new Body(
                paragraphs.Select(p => new Paragraph(new Run(new Text(p))))));
        }
        return ms.ToArray();
    }

    /// <summary>
    /// A PDF whose lines are drawn with a standard font. The standard 14 fonts cover Latin-1 only,
    /// so the Albanian test uses .docx and .txt rather than this.
    /// </summary>
    private static byte[] Pdf(params string[] lines)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        var page = builder.AddPage(UglyToad.PdfPig.Content.PageSize.A4);
        var y = 780.0;
        foreach (var line in lines)
        {
            page.AddText(line, 10, new UglyToad.PdfPig.Core.PdfPoint(40, y), font);
            y -= 14;
        }
        return builder.Build();
    }

    /// <summary>
    /// A PDF that places every word separately, with no space characters between them — how most
    /// word processors and typesetters actually write PDFs. Spacing exists only as position.
    /// </summary>
    private static byte[] PdfPositionedWords(string sentence)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        var page = builder.AddPage(UglyToad.PdfPig.Content.PageSize.A4);
        double x = 40, y = 780;
        foreach (var word in sentence.Split(' '))
        {
            var letters = page.AddText(word, 10, new UglyToad.PdfPig.Core.PdfPoint(x, y), font);
            x = letters[^1].EndBaseLine.X + 4;
            if (x > 520) { x = 40; y -= 14; }
        }
        return builder.Build();
    }

    /// <summary>A page with nothing drawn on it — what a scan looks like to a text extractor.</summary>
    private static byte[] EmptyPdf()
    {
        var builder = new PdfDocumentBuilder();
        builder.AddPage(UglyToad.PdfPig.Content.PageSize.A4);
        return builder.Build();
    }

    // ── Formats ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_text_file_is_read_and_its_language_reported()
    {
        var result = await Read(Utf8(Albanian), "notes.txt");

        Assert.True(result.Success);
        Assert.Equal(Albanian, result.Text);
        Assert.Equal(SourceLanguageDetector.Albanian, result.Language);
        Assert.False(result.Truncated);
    }

    [Fact]
    public async Task Markdown_counts_as_text() =>
        Assert.True((await Read(Utf8(English), "README.MD")).Success);

    [Fact]
    public async Task A_word_document_is_read_paragraph_by_paragraph()
    {
        var result = await Read(Docx("Rilindja Kombëtare", Albanian), "ese.docx");

        Assert.True(result.Success);
        Assert.Equal("Rilindja Kombëtare\n" + Albanian, result.Text);
        Assert.Equal(SourceLanguageDetector.Albanian, result.Language);
    }

    [Fact]
    public async Task A_pdf_is_read_with_its_words_spaced()
    {
        var result = await Read(
            Pdf("Photosynthesis is the process by which green plants use sunlight",
                "to make sugars from carbon dioxide and water. It takes place in the leaves."),
            "biology.pdf");

        Assert.True(result.Success, result.Message);
        // Words separated, not glued: the quote check compares against this text.
        Assert.Contains("green plants use sunlight", result.Text);
        Assert.Equal(SourceLanguageDetector.English, result.Language);
    }

    [Fact]
    public async Task A_pdf_whose_words_are_placed_separately_still_reads_as_words()
    {
        // page.Text glues these into "Photosynthesisistheprocess…", after which no sourceQuote can
        // ever match and every question is dropped as invented.
        var result = await Read(PdfPositionedWords(English), "positioned.pdf");

        Assert.True(result.Success, result.Message);
        Assert.Contains("green plants use sunlight", result.Text);
    }

    // ── Refusals, each with a message that names the fix ─────────────────────────────────

    [Fact]
    public async Task A_pdf_with_no_text_is_called_a_scan()
    {
        var result = await Read(EmptyPdf(), "scan.pdf");

        Assert.Equal(AiErrorCodes.UnreadableSource, result.ErrorCode);
        Assert.Contains("scan", result.Message);
    }

    [Fact]
    public async Task A_corrupt_pdf_is_unreadable_not_a_crash()
    {
        var result = await Read(Utf8("%PDF-1.7 this is not really a pdf " + English), "broken.pdf");

        Assert.Equal(AiErrorCodes.UnreadableSource, result.ErrorCode);
    }

    [Theory]
    [InlineData("slides.pptx")]
    [InlineData("old.doc")]
    [InlineData("photo.png")]
    [InlineData("no-extension")]
    public async Task Other_formats_are_refused_by_name(string name)
    {
        var result = await Read(Utf8(English), name);

        Assert.Equal(AiErrorCodes.UnreadableSource, result.ErrorCode);
        Assert.Contains(".docx", result.Message);
    }

    [Fact]
    public async Task A_file_over_the_size_limit_is_refused_unread()
    {
        var result = await Read(Utf8(English), "notes.txt", Reader(maxBytes: 10));

        Assert.Equal(AiErrorCodes.SourceTooLarge, result.ErrorCode);
    }

    [Fact]
    public async Task An_empty_file_is_refused() =>
        Assert.Equal(AiErrorCodes.UnreadableSource, (await Read(Array.Empty<byte>(), "empty.txt")).ErrorCode);

    [Fact]
    public async Task Material_in_another_language_is_refused_with_the_generation_message()
    {
        var result = await Read(Utf8(German), "notizen.txt");

        Assert.Equal(AiErrorCodes.UnsupportedLanguage, result.ErrorCode);
        Assert.Equal(AiGenerationService.UnsupportedLanguageMessage, result.Message);
    }

    // ── The character limit ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Long_material_is_cut_at_a_word_and_says_so()
    {
        var text = string.Join(' ', Enumerable.Repeat(English, 10));

        var result = await Read(Utf8(text), "long.txt", Reader(maxChars: 500));

        Assert.True(result.Success);
        Assert.True(result.Truncated);
        Assert.True(result.Text!.Length <= 500);
        Assert.False(result.Text.EndsWith(' '));
        Assert.StartsWith(result.Text, text); // a prefix, cut between words
        Assert.Contains(text[result.Text.Length], " \n");
    }

    [Fact]
    public void Whitespace_is_collapsed_but_paragraphs_survive()
    {
        var normalised = SourceFileReader.Normalise("  One   two\t three  \r\n\r\n\r\n\r\nFour five  \n");

        Assert.Equal("One two three\n\nFour five", normalised);
    }
}
