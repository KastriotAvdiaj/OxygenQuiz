using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using QuizAPI.Mapping;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// The session DTO is served mid-quiz (resume screen, "you already have a session"), so for a quiz
/// without instant feedback it must not carry the answer key or the verdict until the session is
/// finished — otherwise the network tab shows the results the UI is holding back. See the note
/// above <c>QuizSessionMappers.ProjectUserAnswer</c> and docs/quiz/quiz-grading.md.
///
/// <para>Both projections are tested because they are two copies of one rule: EF can't inline
/// a helper, so ProjectSession spells the user-answer projection out again.</para>
/// </summary>
public class AnswerKeyRevealTests
{
    private static readonly DateTime Start = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    private static ApplicationDbContext NewContext() =>
        new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    /// <summary>A quiz with one question of each type, all answered — MC correctly, T/F wrongly, typed timed out.</summary>
    private static QuizSession Seed(ApplicationDbContext ctx, bool instantFeedback, bool isCompleted)
    {
        var category = new QuestionCategory { Id = 1, Name = "General" };
        var quiz = new Quiz
        {
            Id = 1,
            Title = "Mixed",
            CategoryId = 1,
            Category = category,
            Version = 1,
            ShowFeedbackImmediately = instantFeedback,
        };
        ctx.AddRange(category, quiz);

        var mc = new MultipleChoiceQuestion
        {
            Id = 1,
            Text = "Capital of Italy?",
            Type = QuestionType.MultipleChoice,
            Explanation = "Rome has been Italy's capital since 1871.",
            AnswerOptions =
            {
                new AnswerOption { Id = 10, Text = "Rome", IsCorrect = true },
                new AnswerOption { Id = 11, Text = "Milan", IsCorrect = false },
            },
        };
        var tf = new TrueFalseQuestion { Id = 2, Text = "Water boils at 50°C.", Type = QuestionType.TrueFalse, CorrectAnswer = false };
        var typed = new TypeTheAnswerQuestion
        {
            Id = 3,
            Text = "Chemical symbol for gold?",
            Type = QuestionType.TypeTheAnswer,
            CorrectAnswer = "Au",
            AcceptableAnswers = ["au"],
        };
        ctx.AddRange(mc, tf, typed);

        QuestionBase[] questions = [mc, tf, typed];
        for (var i = 0; i < questions.Length; i++)
        {
            ctx.Add(new QuizQuestion
            {
                Id = i + 1,
                QuizId = 1,
                Quiz = quiz,
                QuestionId = questions[i].Id,
                Question = questions[i],
                OrderInQuiz = i + 1,
                TimeLimitInSeconds = 20,
                CreatedInVersion = 1,
            });
        }

        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = 1,
            Quiz = quiz,
            UserId = Guid.NewGuid(),
            StartTime = Start,
            QuizVersion = 1,
            IsCompleted = isCompleted,
            TotalScore = 100,
        };
        ctx.Add(session);

        (int qq, AnswerStatus status, int score)[] answers =
            [(1, AnswerStatus.Correct, 100), (2, AnswerStatus.Incorrect, 0), (3, AnswerStatus.TimedOut, 0)];
        foreach (var (qq, status, score) in answers)
        {
            ctx.Add(new UserAnswer
            {
                SessionId = session.Id,
                QuizQuestionId = qq,
                Status = status,
                Score = score,
                QuestionStartTime = Start,
                SubmittedTime = Start.AddSeconds(3),
            });
        }

        ctx.SaveChanges();
        return session;
    }

    private static QuizSessionDto ProjectSession(ApplicationDbContext ctx, Guid id) =>
        ctx.QuizSessions.AsNoTracking().Where(s => s.Id == id)
            .Select(QuizSessionMappers.ProjectSession).Single();

    private static List<UserAnswerDto> ProjectAnswers(ApplicationDbContext ctx, Guid id) =>
        ctx.UserAnswers.AsNoTracking().Where(a => a.SessionId == id)
            .OrderBy(a => a.QuizQuestion.OrderInQuiz)
            .Select(QuizSessionMappers.ProjectUserAnswer).ToList();

    public static IEnumerable<object[]> Projections =>
    [
        ["session"],
        ["answers"],
    ];

    private static List<UserAnswerDto> Answers(ApplicationDbContext ctx, Guid id, string via) =>
        via == "session" ? ProjectSession(ctx, id).UserAnswers : ProjectAnswers(ctx, id);

    [Theory]
    [MemberData(nameof(Projections))]
    public void UnfinishedSession_WithoutInstantFeedback_WithholdsKeysAndVerdicts(string via)
    {
        using var ctx = NewContext();
        var session = Seed(ctx, instantFeedback: false, isCompleted: false);

        var answers = Answers(ctx, session.Id, via);

        Assert.All(answers, a =>
        {
            Assert.Null(a.AnswerOptions);
            Assert.Null(a.CorrectAnswerBoolean);
            Assert.Null(a.CorrectAnswerText);
            Assert.Null(a.AcceptableAnswers);
            // The explanation states the answer, so it is withheld with the key.
            Assert.Null(a.Explanation);
            Assert.Equal(0, a.Score);
        });
        // Correct and Incorrect both read Pending, so the two can't be told apart. TimedOut is left
        // alone: the player watched the clock run out, it tells them nothing new.
        Assert.Equal(
            [AnswerStatus.Pending, AnswerStatus.Pending, AnswerStatus.TimedOut],
            answers.Select(a => a.Status));
    }

    [Fact]
    public void UnfinishedSession_WithoutInstantFeedback_HidesTheRunningScore()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, instantFeedback: false, isCompleted: false);

        var dto = ProjectSession(ctx, session.Id);

        Assert.False(dto.ResultsRevealed);
        Assert.Equal(0, dto.TotalScore);
    }

    [Theory]
    [InlineData(true, false)]  // instant feedback: each verdict was already shown as it was answered
    [InlineData(false, true)]  // finished (or abandoned): results time
    [InlineData(true, true)]
    public void RevealedSession_CarriesTheFullKeyAndVerdicts(bool instantFeedback, bool isCompleted)
    {
        using var ctx = NewContext();
        var session = Seed(ctx, instantFeedback, isCompleted);

        foreach (var via in new[] { "session", "answers" })
        {
            var answers = Answers(ctx, session.Id, via);

            Assert.Equal(
                [AnswerStatus.Correct, AnswerStatus.Incorrect, AnswerStatus.TimedOut],
                answers.Select(a => a.Status));
            Assert.Equal(100, answers[0].Score);
            Assert.Contains(answers[0].AnswerOptions!, o => o.Text == "Rome" && o.IsCorrect);
            Assert.False(answers[1].CorrectAnswerBoolean);
            Assert.Equal("Au", answers[2].CorrectAnswerText);
            Assert.Equal("Rome has been Italy's capital since 1871.", answers[0].Explanation);
            Assert.Null(answers[1].Explanation);   // none written: stays null, not ""
        }

        var dto = ProjectSession(ctx, session.Id);
        Assert.True(dto.ResultsRevealed);
        Assert.Equal(100, dto.TotalScore);
    }
}
