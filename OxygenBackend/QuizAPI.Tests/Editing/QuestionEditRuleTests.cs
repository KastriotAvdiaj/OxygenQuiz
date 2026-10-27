using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Editing;

/// <summary>
/// The quiz builder edits a saved question in place only when it is yours, no other live quiz
/// uses it, and nobody has answered it (<see cref="QuestionEditRule"/>, ADR 0031). The rule is
/// pinned on its own; the facts are pinned against the real repository query, because "other
/// quiz" has three ways to be miscounted: this quiz, a retired row, a deleted quiz.
/// </summary>
public class QuestionEditRuleTests
{
    private static readonly Guid Me = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Someone = Guid.Parse("22222222-2222-2222-2222-222222222222");

    // ── The rule ────────────────────────────────────────────────────────────

    [Fact]
    public void Yours_UnusedElsewhere_Unplayed_IsEditable() =>
        Assert.Equal(QuestionEditLock.None, QuestionEditRule.Decide(new(1, Me, 0, false), Me));

    [Fact]
    public void Reasons_ComeInTheOrderAUserShouldHearThem()
    {
        Assert.Equal(QuestionEditLock.NotYours, QuestionEditRule.Decide(new(1, Someone, 3, true), Me));
        Assert.Equal(QuestionEditLock.NotYours, QuestionEditRule.Decide(null, Me));
        Assert.Equal(QuestionEditLock.Played, QuestionEditRule.Decide(new(1, Me, 3, true), Me));
        Assert.Equal(QuestionEditLock.UsedElsewhere, QuestionEditRule.Decide(new(1, Me, 1, false), Me));
    }

    // ── The facts, from the repository ──────────────────────────────────────

    private static ApplicationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
            new TestCurrentUserService());

    private static TrueFalseQuestion AddQuestion(ApplicationDbContext ctx, Guid owner)
    {
        var q = new TrueFalseQuestion { Text = "Q", UserId = owner, CorrectAnswer = true };
        ctx.Questions.Add(q);
        ctx.SaveChanges();
        return q;
    }

    private static (Quiz Quiz, QuizQuestion Row) AddToQuiz(
        ApplicationDbContext ctx, QuestionBase q, int? removedInVersion = null, bool deleted = false)
    {
        var quiz = new Quiz { Title = "Quiz", UserId = Me, DeletedAt = deleted ? DateTime.UtcNow : null };
        ctx.Quizzes.Add(quiz);
        ctx.SaveChanges();
        var row = new QuizQuestion { QuizId = quiz.Id, QuestionId = q.Id, RemovedInVersion = removedInVersion };
        ctx.QuizQuestions.Add(row);
        ctx.SaveChanges();
        return (quiz, row);
    }

    private static async Task<QuestionEditFacts> FactsFor(ApplicationDbContext ctx, int questionId, int? quizId)
    {
        var facts = await new QuestionRepository(ctx).GetEditFactsAsync(new[] { questionId }, Me, quizId);
        return Assert.Single(facts);
    }

    [Fact]
    public async Task TheQuizBeingEdited_RetiredRows_AndDeletedQuizzes_AreNotOtherQuizzes()
    {
        await using var ctx = NewContext();
        var q = AddQuestion(ctx, Me);
        var (thisQuiz, _) = AddToQuiz(ctx, q);
        AddToQuiz(ctx, q, removedInVersion: 2);   // dropped from that quiz long ago
        AddToQuiz(ctx, q, deleted: true);         // in a quiz that was deleted

        var facts = await FactsFor(ctx, q.Id, thisQuiz.Id);
        Assert.Equal(0, facts.OtherQuizCount);
        Assert.Equal(QuestionEditLock.None, QuestionEditRule.Decide(facts, Me));
    }

    [Fact]
    public async Task ALiveRowInAnotherQuiz_Counts_AndCreatingCountsEveryQuiz()
    {
        await using var ctx = NewContext();
        var q = AddQuestion(ctx, Me);
        var (thisQuiz, _) = AddToQuiz(ctx, q);
        AddToQuiz(ctx, q);

        Assert.Equal(1, (await FactsFor(ctx, q.Id, thisQuiz.Id)).OtherQuizCount);
        // No quiz id while creating: every quiz using it is "another quiz".
        Assert.Equal(2, (await FactsFor(ctx, q.Id, null)).OtherQuizCount);
    }

    [Fact]
    public async Task AnyAnswerRow_MakesItPlayed()
    {
        await using var ctx = NewContext();
        var q = AddQuestion(ctx, Me);
        var (quiz, row) = AddToQuiz(ctx, q);
        var session = new QuizSession { Id = Guid.NewGuid(), QuizId = quiz.Id, UserId = Someone, StartTime = DateTime.UtcNow };
        ctx.QuizSessions.Add(session);
        ctx.UserAnswers.Add(new UserAnswer { SessionId = session.Id, QuizQuestionId = row.Id });
        ctx.SaveChanges();

        var facts = await FactsFor(ctx, q.Id, quiz.Id);
        Assert.True(facts.Played);
        Assert.Equal(QuestionEditLock.Played, QuestionEditRule.Decide(facts, Me));
    }

    /// <summary>The question editors warn with this: an edit without quiz:autopick unpicks them.</summary>
    [Fact]
    public async Task PickedQuizzes_CountOnlyLivePickedOnes()
    {
        await using var ctx = NewContext();
        var q = AddQuestion(ctx, Me);
        var (picked, _) = AddToQuiz(ctx, q);
        var (retired, _) = AddToQuiz(ctx, q, removedInVersion: 2);
        var (deleted, _) = AddToQuiz(ctx, q, deleted: true);
        AddToQuiz(ctx, q); // live, not picked
        foreach (var quiz in new[] { picked, retired, deleted }) quiz.IsPicked = true;
        ctx.SaveChanges();

        Assert.Equal(1, (await FactsFor(ctx, q.Id, null)).PickedQuizCount);
    }

    [Fact]
    public async Task SomeoneElsesQuestion_ReadsNothing()
    {
        await using var ctx = NewContext();
        var q = AddQuestion(ctx, Someone);
        Assert.Empty(await new QuestionRepository(ctx).GetEditFactsAsync(new[] { q.Id }, Me, null));
    }
}
