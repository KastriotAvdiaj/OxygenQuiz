using QuizAPI.Common;
using QuizAPI.ManyToManyTables;
using QuizAPI.Mapping;
using QuizAPI.Models;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// The correct answer used to be the first option almost every time.
///
/// <para>Nothing was randomising anything. A model writes the correct option first, the parser kept
/// that order, the import kept it, identity ids were assigned in it, and both serving paths
/// projected <c>AnswerOptions</c> with no <c>OrderBy</c> at all. Measured on the development
/// database on 2026-09-01: <b>67.9% of questions had the correct answer at position 1</b>, against
/// a uniform expectation nearer 30% for the mix of 2-to-4-option questions stored. A player could
/// score by pressing the top button every time.</para>
///
/// <para>These tests hold the two properties that make the fix real rather than apparent: the order
/// no longer follows authoring order, and it does not move under the player while they are looking
/// at it.</para>
/// </summary>
public class AnswerOptionOrderTests
{
    /// <summary>Four options with the correct one first — the shape the bug produced.</summary>
    private static QuizQuestion CorrectFirst(int quizQuestionId = 1, int questionId = 1)
    {
        var question = new MultipleChoiceQuestion
        {
            Id = questionId,
            Text = "Which one is right?",
            Type = QuestionType.MultipleChoice,
            AnswerOptions = new List<AnswerOption>
            {
                new() { Id = questionId * 100 + 1, Text = "correct", IsCorrect = true },
                new() { Id = questionId * 100 + 2, Text = "wrong A" },
                new() { Id = questionId * 100 + 3, Text = "wrong B" },
                new() { Id = questionId * 100 + 4, Text = "wrong C" },
            },
        };

        return new QuizQuestion { Id = quizQuestionId, QuestionId = questionId, Question = question };
    }

    private static int CorrectPosition(QuizQuestion qq, Guid sessionId)
    {
        var correctId = ((MultipleChoiceQuestion)qq.Question).AnswerOptions.Single(o => o.IsCorrect).Id;
        var options = qq.ToCurrentQuestionDto(sessionId).Options;
        return options.FindIndex(o => o.ID == correctId) + 1;
    }

    /// <summary>
    /// <b>The regression test for the reported bug.</b> Feed in the worst case — correct option
    /// always stored first — and check that across many players it lands everywhere.
    ///
    /// The bound is deliberately loose. This asserts "the bias is gone", not "the hash is uniform":
    /// a tight bound on a fixed hash function would be a test of FNV rather than of us, and would
    /// go red for a reason nobody cares about. 67.9% was the symptom; anything near 25% is a fix.
    /// </summary>
    [Fact]
    public void The_correct_answer_does_not_stay_in_first_place()
    {
        const int trials = 600;
        var counts = new int[5];

        for (var i = 0; i < trials; i++)
            counts[CorrectPosition(CorrectFirst(), Guid.NewGuid())]++;

        var firstPlaceRate = counts[1] / (double)trials;

        Assert.InRange(firstPlaceRate, 0.15, 0.35);

        // Every position must actually be reachable. A shuffle that only ever swapped the first two
        // would pass a rate check and still be broken.
        for (var position = 1; position <= 4; position++)
            Assert.True(counts[position] > 0, $"No trial put the correct answer at position {position}.");
    }

    /// <summary>
    /// The order must not move between the poll that renders the question and the next one. This is
    /// the property that rules out a plain <c>Random</c>: the DTO is rebuilt on every state poll,
    /// resume and reconnect, so a fresh shuffle each time would slide the answers around mid-question.
    /// </summary>
    [Fact]
    public void The_same_session_always_sees_the_same_order()
    {
        var sessionId = Guid.NewGuid();
        var first = CorrectFirst().ToCurrentQuestionDto(sessionId).Options.Select(o => o.ID).ToList();

        for (var i = 0; i < 10; i++)
        {
            var again = CorrectFirst().ToCurrentQuestionDto(sessionId).Options.Select(o => o.ID).ToList();
            Assert.Equal(first, again);
        }
    }

    /// <summary>
    /// Two questions in one session must not share a permutation, or the second question's layout
    /// is guessable from the first — which would hand back a smaller version of the same exploit.
    /// </summary>
    [Fact]
    public void Questions_in_one_session_are_shuffled_independently()
    {
        var sessionId = Guid.NewGuid();
        var positions = new HashSet<int>();

        for (var questionId = 1; questionId <= 12; questionId++)
            positions.Add(CorrectPosition(CorrectFirst(questionId, questionId), sessionId));

        Assert.True(positions.Count > 1,
            "Every question in the session put the correct answer in the same place — the seed is " +
            "not varying per question.");
    }

    /// <summary>Shuffling must not lose, duplicate or invent an option.</summary>
    [Fact]
    public void Shuffling_is_a_permutation()
    {
        var qq = CorrectFirst();
        var stored = ((MultipleChoiceQuestion)qq.Question).AnswerOptions.Select(o => o.Id).OrderBy(id => id);

        var served = qq.ToCurrentQuestionDto(Guid.NewGuid()).Options.Select(o => o.ID).OrderBy(id => id);

        Assert.Equal(stored, served);
    }

    /// <summary>
    /// True/False is a two-item scale, not a list of candidates. Shuffling it removes no positional
    /// advantage — a coin-flip guess is right half the time either way — and reading "False" first
    /// is merely disorienting.
    /// </summary>
    [Fact]
    public void True_false_options_keep_their_conventional_order()
    {
        var qq = new QuizQuestion
        {
            Id = 1,
            QuestionId = 1,
            Question = new TrueFalseQuestion { Id = 1, Text = "Is it?", Type = QuestionType.TrueFalse },
        };

        for (var i = 0; i < 20; i++)
        {
            var options = qq.ToCurrentQuestionDto(Guid.NewGuid()).Options;
            Assert.Equal(new[] { TrueFalseOption.TrueText, TrueFalseOption.FalseText },
                         options.Select(o => o.Text));
        }
    }

    /// <summary>
    /// Pins the algorithm itself.
    ///
    /// <para>This looks like a test of an implementation detail, and it is — on purpose. The
    /// obvious "simplifications" of <see cref="DeterministicShuffle"/> are <c>new Random(seed)</c>
    /// and <c>string.GetHashCode()</c>, and both would pass every other test in this file while
    /// quietly breaking the guarantee that matters: <c>GetHashCode</c> is randomised per process,
    /// so every in-flight question would reorder on deploy, and seeded <c>Random</c>'s algorithm is
    /// not a documented cross-version contract. Neither failure is reproducible in a test run —
    /// they need a restart or a runtime upgrade. A pinned expected order is the only thing that
    /// catches them at the moment the change is made.</para>
    ///
    /// <para>If this fails, do not update the constant until you are sure no session can be
    /// in-flight: changing it reshuffles every live quiz.</para>
    /// </summary>
    [Fact]
    public void The_permutation_is_pinned_to_a_stable_hash()
    {
        var ordered = DeterministicShuffle.By(new[] { 10, 20, 30, 40 }, "stability-probe", i => i);

        Assert.Equal(new[] { 30, 40, 10, 20 }, ordered);
    }
}
