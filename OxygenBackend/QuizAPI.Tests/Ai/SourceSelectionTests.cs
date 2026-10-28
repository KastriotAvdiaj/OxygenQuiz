using QuizAPI.Services.Ai.Sources;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The rules that decide which article grounds a generation, or whether to ask.
///
/// <para>Most of these are real search results, measured against the MediaWiki API on
/// 2026-10-28 and written down here because they are the evidence the rules exist for. If a
/// rule changes, these say what it used to get right.</para>
///
/// <para>Note what they are <b>not</b>: the ratio was fitted to these cases, so passing them is
/// not evidence it generalises. That is the eval harness's job (docs/development/ai-eval.md).</para>
/// </summary>
public class SourceSelectionTests
{
    private const int MinWords = 400;
    private const double Ratio = 1.5;
    private const int Offer = 5;

    private static SourceCandidate A(string title, int words, bool disambig = false) =>
        new(title, words) { IsDisambiguation = disambig };

    private static SourceDecision Decide(params SourceCandidate[] candidates) =>
        SourceSelection.Decide(candidates, MinWords, Ratio, Offer);

    // ── The measured English cases ───────────────────────────────────────────────────────

    [Fact]
    public void A_disambiguation_page_at_the_top_asks_rather_than_skipping_to_the_next_hit()
    {
        // "Mercury": the top hit is the disambiguation page. Skipping it lands on the planet by
        // luck — Freddie Mercury is one rank behind with a thousand more words.
        var decision = Decide(
            A("Mercury", 974, disambig: true),
            A("Mercury (planet)", 16170),
            A("Freddie Mercury", 17329),
            A("Mercury (element)", 13576));

        Assert.Equal(SourceDecisionKind.Ask, decision.Kind);
        Assert.Contains(decision.Candidates, c => c.Title == "Mercury (planet)");
        Assert.DoesNotContain(decision.Candidates, c => c.IsDisambiguation);
    }

    [Fact]
    public void A_much_longer_second_hit_asks_rather_than_trusting_the_search_rank()
    {
        // "Human respiratory system" really does return Human body first. Nothing marks it as
        // wrong; only the length gap suggests the search was not confident.
        var decision = Decide(
            A("Human body", 5622),
            A("Respiratory system", 11254),
            A("Respiratory tract", 3170));

        Assert.Equal(SourceDecisionKind.Ask, decision.Kind);
    }

    [Fact]
    public void The_longest_article_is_never_chosen_on_its_own()
    {
        // "Balkans campaign World War II" returns the World War I front second, and longer.
        // A pick-the-longest rule chooses the wrong war silently; asking does not.
        var decision = Decide(
            A("Balkans campaign (World War II)", 1188),
            A("Balkan Front (World War I)", 2625));

        Assert.Equal(SourceDecisionKind.Ask, decision.Kind);
        Assert.Null(decision.Chosen);
    }

    [Fact]
    public void A_confident_search_is_not_second_guessed()
    {
        // "Photosynthesis": right answer first, by a wide margin. Asking here would be noise,
        // and a gate that fires on good results is a gate people learn to click through.
        var decision = Decide(
            A("Photosynthesis", 11914),
            A("Photosynthesis (disambiguation)", 101, disambig: true),
            A("Artificial photosynthesis", 5111));

        Assert.Equal(SourceDecisionKind.Use, decision.Kind);
        Assert.Equal("Photosynthesis", decision.Chosen!.Title);
    }

    // ── The measured Albanian cases ──────────────────────────────────────────────────────

    [Fact]
    public void An_ambiguous_and_thin_topic_is_still_put_to_the_author()
    {
        // "Historia e Kosovës" is a 276-word stub, and a longer related article sits below it.
        // Order matters: deciding thinness first would hide a candidate that might actually
        // work from the one person able to judge.
        var decision = Decide(
            A("Historia e Kosovës", 276),
            A("Beteja e Kosovës", 433),
            A("Krahina Socialiste Autonome e Kosovës", 1218));

        Assert.Equal(SourceDecisionKind.Ask, decision.Kind);
    }

    [Fact]
    public void A_clear_but_short_winner_is_reported_as_too_thin_not_used()
    {
        // The dangerous case: one obvious article, far too short to carry ten questions. Using
        // it would show a citation over answers the model invented.
        var decision = Decide(A("Historia e Kosovës", 276));

        Assert.Equal(SourceDecisionKind.TooThin, decision.Kind);
        Assert.Equal("Historia e Kosovës", decision.Chosen!.Title);
    }

    [Theory]
    [InlineData("Rilindja Kombëtare Shqiptare", 6157, "Rilindja kombëtare letoneze", 478)]
    [InlineData("Kuzhina shqiptare", 1843, "Kuzhina kosovare", 627)]
    public void A_clear_winner_in_Albanian_is_used(string top, int topWords, string next, int nextWords)
    {
        var decision = Decide(A(top, topWords), A(next, nextWords));

        Assert.Equal(SourceDecisionKind.Use, decision.Kind);
        Assert.Equal(top, decision.Chosen!.Title);
    }

    // ── Edges ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public void No_hits_is_not_found()
    {
        Assert.Equal(SourceDecisionKind.NotFound, Decide().Kind);
    }

    [Fact]
    public void Nothing_but_disambiguation_pages_is_not_found_rather_than_a_question()
    {
        // Offering a choice between two lists-of-links is not a question anyone can answer.
        var decision = Decide(
            A("Mercury", 974, disambig: true),
            A("Mercury (disambiguation)", 120, disambig: true));

        Assert.Equal(SourceDecisionKind.NotFound, decision.Kind);
    }

    [Fact]
    public void A_single_long_article_is_used_without_a_second_to_compare_against()
    {
        var decision = Decide(A("2024 Summer Olympics", 34090));

        Assert.Equal(SourceDecisionKind.Use, decision.Kind);
    }

    [Fact]
    public void The_ratio_is_exclusive_of_its_own_boundary_in_neither_direction()
    {
        // Exactly at the ratio counts as a contest: the gate is "not clearly better", and 1.5x
        // on the nose is not clearly better.
        Assert.Equal(SourceDecisionKind.Ask, Decide(A("a", 1000), A("b", 1500)).Kind);
        Assert.Equal(SourceDecisionKind.Use, Decide(A("a", 1000), A("b", 1499)).Kind);
    }

    [Fact]
    public void A_disambiguation_page_below_the_top_does_not_trigger_a_question_by_itself()
    {
        // Only the top hit being a disambiguation page means the term is ambiguous. One further
        // down is normal — most big topics have one.
        var decision = Decide(
            A("Photosynthesis", 11914),
            A("Photosynthesis (disambiguation)", 101, disambig: true));

        Assert.Equal(SourceDecisionKind.Use, decision.Kind);
    }
}
