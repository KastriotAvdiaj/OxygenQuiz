using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The rules that decide which article grounds a generation, or whether to ask.
///
/// <para>The cases are the real top-five search results for the twelve eval topics, measured
/// against the MediaWiki API on 2026-10-29 — written down because they are the evidence the
/// rules exist for. Each says what the author would want, and the rule is held to that.</para>
///
/// <para>Note what they are <b>not</b>: the thresholds were chosen with these cases in view, so
/// passing them is not evidence the rules generalise. That is the eval harness's job
/// (docs/development/ai-eval.md).</para>
/// </summary>
public class SourceSelectionTests
{
    private const int MinWords = 400;
    private const int Offer = 5;

    private static SourceCandidate A(string title, int words, bool disambig = false, string? redirect = null) =>
        new(title, words) { IsDisambiguation = disambig, RedirectTitle = redirect };

    private static SourceDecision Decide(string topic, params SourceCandidate[] hits) =>
        SourceSelection.Decide(topic, hits, MinWords, Offer);

    // ── Used: a clear title match ────────────────────────────────────────────────────────

    [Fact]
    public void A_title_matching_the_topic_beats_a_higher_ranked_body_match()
    {
        // The first-hit rule took "Human body" here.
        var d = Decide("The human respiratory system",
            A("Human body", 5622), A("Respiratory system", 11254), A("Respiratory tract", 3170),
            A("Respiratory syncytial virus", 10190), A("Lung", 11085));

        Assert.Equal(SourceDecisionKind.Use, d.Kind);
        Assert.Equal("Respiratory system", d.Chosen!.Title);
    }

    [Fact]
    public void The_right_war_wins_on_shared_words_not_on_length()
    {
        // "World War II" (25,790 words) and the World War I front are both longer; neither is the topic.
        var d = Decide("World War II in the Balkans",
            A("Balkans campaign (World War II)", 1188), A("World War II", 25790),
            A("Balkan Front (World War I)", 2625), A("History of the Balkans", 13708),
            A("War crimes in World War II", 9418));

        Assert.Equal("Balkans campaign (World War II)", d.Chosen?.Title);
    }

    [Fact]
    public void Stubs_are_skipped_rather_than_reported_as_the_best_match()
    {
        // The first two hits are 28- and 30-word book stubs; the article is fourth.
        var d = Decide("Kuzhina tradicionale shqiptare",
            A("Kuzhina Shqiptare. 600 receta tradicionale", 28), A("Kuzhina Shqiptare. 500 receta tradicionale", 30),
            A("Kuzhina kosovare", 627), A("Kuzhina shqiptare", 1843), A("Kuzhina ballkanike", 1113));

        Assert.Equal(SourceDecisionKind.Use, d.Kind);
        Assert.Equal("Kuzhina shqiptare", d.Chosen!.Title);
    }

    [Fact]
    public void Of_two_equal_matches_the_more_precise_title_wins()
    {
        // Both share "letërsia shqipe"; only one of them is about Albanian literature as such.
        var d = Decide("Letërsia shqipe dhe Rilindja Kombëtare",
            A("Letërsia shqipe në Maqedoni të Veriut", 880), A("Letërsia shqipe", 4563),
            A("Historia e letërsisë shqipe", 766), A("Sabri Hamiti", 2246), A("Idriz Ajeti", 1041));

        Assert.Equal("Letërsia shqipe", d.Chosen?.Title);
    }

    [Theory]
    [InlineData("Photosynthesis", "Photosynthesis", 11914)]
    [InlineData("The 2024 Summer Olympics", "2024 Summer Olympics", 13724)]
    public void An_exact_title_is_used(string topic, string title, int words) =>
        Assert.Equal(title, Decide(topic, A(title, words), A("Something else entirely", 9000)).Chosen?.Title);

    [Fact]
    public void A_redirect_the_search_matched_through_counts_as_the_title()
    {
        var d = Decide("Quantum physics",
            A("Quantum", 2100), A("Quantum mechanics", 14000, redirect: "Quantum physics"));

        Assert.Equal("Quantum mechanics", d.Chosen?.Title);
    }

    // ── Asked: no clear match ────────────────────────────────────────────────────────────

    [Fact]
    public void A_disambiguation_page_at_the_top_asks_with_the_real_articles()
    {
        var d = Decide("Mercury",
            A("Mercury", 974, disambig: true), A("Mercury (planet)", 16170), A("Freddie Mercury", 17329),
            A("Mercury (element)", 13576), A("Mercury Prize", 3833));

        Assert.Equal(SourceDecisionKind.Ask, d.Kind);
        Assert.DoesNotContain(d.Candidates, c => c.IsDisambiguation);
        Assert.Contains(d.Candidates, c => c.Title == "Mercury (planet)");
    }

    [Fact]
    public void One_shared_word_out_of_three_is_not_enough_the_snake_case()
    {
        // sq.wikipedia's "Python" is the snake. Sharing only the word "Python" with a topic about
        // programming used to be enough; now it is a question, where "none of these" is the answer.
        var d = Decide("Bazat e programimit në Python",
            A("Python", 8854), A("Baza e të dhënave e bazuar në objeke", 2724),
            A("Elixir (gjuhë programimi)", 1082), A("C++", 5526), A("C (gjuhë programimi)", 7254));

        Assert.Equal(SourceDecisionKind.Ask, d.Kind);
    }

    [Fact]
    public void A_title_mostly_about_something_else_is_a_question()
    {
        // Shares "historia" and "Kosovës", but it is the history of football in Kosovo.
        var d = Decide("Historia e Kosovës në shekullin XX",
            A("Historia e Stantërgut", 381), A("Historia e futbollit në Kosovë", 1473),
            A("Historia e Prishtinës", 2800), A("Komuna e Prishtinës", 665), A("Historia e Vushtrrisë", 963));

        Assert.Equal(SourceDecisionKind.Ask, d.Kind);
        Assert.Equal("Historia e futbollit në Kosovë", d.Candidates[0].Title); // best match offered first
        Assert.DoesNotContain(d.Candidates, c => c.Words < MinWords);       // a stub is never offered
    }

    [Theory]
    [InlineData("Rregullat e futbollit")]               // the Polish national team came first
    [InlineData("New features in C# 12 and .NET 8")]   // Wikipedia has no such article
    public void Topics_wikipedia_has_no_article_for_ask_rather_than_guess(string topic)
    {
        var d = topic.StartsWith("Rregullat")
            ? Decide(topic, A("Kombëtarja polake e futbollit", 990), A("Përfaqësuesja kosovare e futbollit", 1769),
                A("Kombëtarja sovjetike e futbollit", 1164), A("Kampionati Botëror i Futbollit 2010", 524),
                A("Historia e futbollit në Kosovë", 1473))
            : Decide(topic, A(".NET", 2923), A("Features new to Windows 8", 13231),
                A(".NET Framework version history", 6989), A("ASP.NET", 967), A("PHP", 12565));

        Assert.Equal(SourceDecisionKind.Ask, d.Kind);
    }

    [Fact]
    public void A_two_word_topic_needs_both_words()
    {
        // "Fizika" alone is physics in general.
        Assert.Equal(SourceDecisionKind.Ask, Decide("Fizika kuantike", A("Fizika", 6000), A("Atomi", 3000)).Kind);
    }

    // ── Nothing to use ───────────────────────────────────────────────────────────────────

    [Fact]
    public void No_hits_is_not_found() => Assert.Equal(SourceDecisionKind.NotFound, Decide("Anything").Kind);

    [Fact]
    public void Hits_sharing_no_word_with_the_topic_are_not_found()
    {
        Assert.Equal(SourceDecisionKind.NotFound, Decide("Photosynthesis", A("Chlorophyll", 5000), A("Leaf", 4000)).Kind);
    }

    [Fact]
    public void Only_stubs_is_too_thin_and_names_the_nearest()
    {
        var d = Decide("Historia e Kosovës", A("Historia e Kosovës", 276), A("Ligji Kushtetues i Kosovës", 360));

        Assert.Equal(SourceDecisionKind.TooThin, d.Kind);
        Assert.Equal("Historia e Kosovës", d.Chosen!.Title);
    }

    [Fact]
    public void Only_disambiguation_pages_is_not_found_rather_than_an_empty_question()
    {
        Assert.Equal(SourceDecisionKind.NotFound,
            Decide("Mercury", A("Mercury", 974, disambig: true), A("Mercury (disambiguation)", 300, disambig: true)).Kind);
    }
}
