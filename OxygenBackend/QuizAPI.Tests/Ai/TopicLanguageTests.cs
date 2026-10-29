using QuizAPI.Services.Ai;
using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The first guess at a topic's language, which decides which Wikipedia grounding searches. The
/// property that matters is <b>never wrong</b>: a wrong guess sends an Albanian author an English
/// article and an English quiz, while "unsure" only costs a title check and, rarely, one click.
/// These are the 46 topics the rule was measured on (2026-10-29), including the twelve eval topics.
/// </summary>
public class TopicLanguageTests
{
    [Theory]
    // The eval topics.
    [InlineData("The human respiratory system")]
    [InlineData("World War II in the Balkans")]
    [InlineData("New features in C# 12 and .NET 8")]
    [InlineData("The 2024 Summer Olympics")]
    [InlineData("Photosynthesis")]          // ph
    // Others.
    [InlineData("The Roman Empire")]
    [InlineData("World War I")]              // a trailing "I" is not the Albanian connector
    [InlineData("Cell biology")]             // -ology
    [InlineData("JavaScript basics")]        // -ics
    [InlineData("Quantum physics")]
    [InlineData("Machine learning")]         // -ing
    public void English_signals_mean_English(string topic) =>
        Assert.Equal(SourceLanguageDetector.English, TopicLanguage.Guess(topic));

    [Theory]
    // The eval topics.
    [InlineData("Historia e Kosovës në shekullin XX")]
    [InlineData("Gjeografia e Shqipërisë dhe Kosovës")]
    [InlineData("Letërsia shqipe dhe Rilindja Kombëtare")]
    [InlineData("Kuzhina tradicionale shqiptare")]  // shqip-
    [InlineData("Rregullat e futbollit")]           // the connector "e" between two words
    [InlineData("Bazat e programimit në Python")]
    // Others, including Albanian typed without ë and ç.
    [InlineData("Historia e Kosoves")]
    [InlineData("Skënderbeu")]
    [InlineData("Lufta e Dytë Botërore")]
    [InlineData("Kryeqytetet e Evropes")]
    [InlineData("Gjuha shqipe")]                    // gj
    [InlineData("Biologjia e qelizes")]
    public void Albanian_signals_mean_Albanian(string topic) =>
        Assert.Equal(SourceLanguageDetector.Albanian, TopicLanguage.Guess(topic));

    /// <summary>
    /// No signal, or both. These go to the title check; "Kosovo war" carries an Albanian stem and
    /// an English w, and guessing either way would be a coin toss presented as a decision.
    /// </summary>
    [Theory]
    [InlineData("Mercury")]
    [InlineData("Python")]
    [InlineData("Vitamin E")]         // a final "E" is not a connector
    [InlineData("Chemistry")]
    [InlineData("Futbolli")]
    [InlineData("Matematika")]
    [InlineData("Kosovo war")]
    [InlineData("Premier League")]
    [InlineData("")]
    [InlineData(null)]
    public void No_clear_signal_is_unsure(string? topic) =>
        Assert.Null(TopicLanguage.Guess(topic));
}
