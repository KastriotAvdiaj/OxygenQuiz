using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices;
using QuizAPI.Controllers.Quizzes.Services.QuizSessionServices.AbandonmentService;
using QuizAPI.Data;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Playing;

/// <summary>
/// Two mechanisms decide what happens when a player comes back to an unfinished session, and
/// they run in this order:
///
/// <list type="number">
///   <item><b>The abandonment check</b> — is this session still resumable at all?</item>
///   <item><b>The catch-up walk</b> — which questions expired while they were away, and which
///   one do they land on? (<c>ResolveAndResumeAsync</c> steps 1-3.)</item>
/// </list>
///
/// <para>Because the first runs first, it can make the second unreachable, and for a long time it
/// did: the activity timeout was <c>longestQuestion × 2 + 60s</c> — two minutes on a quiz of
/// 30-second questions. Any absence long enough to expire three questions voided the session
/// outright, so the walk, its client-side mirror in <c>resume-projection.ts</c> and the whole
/// "Session In Progress" screen were unreachable in production. The screen cheerfully offered
/// "13 questions ran out, resume within 26s and you keep question 14" for sessions the server had
/// already written off.</para>
///
/// <para>These tests pin the invariant that keeps them compatible: <b>the activity timeout is
/// never shorter than the longest catch-up the walk could perform.</b> Stated behaviourally,
/// because that is the form that survives a refactor of the arithmetic — see
/// docs/adr/0008-abandonment-cannot-outrun-the-catch-up-walk.md.</para>
/// </summary>
public class SessionAbandonmentTimeoutTests
{
    private const int QuestionCount = 15;
    private const int QuestionSeconds = 30;

    /// <summary>Total playable time — the furthest the catch-up walk could ever have to travel.</summary>
    private const int WalkReachSeconds = QuestionCount * QuestionSeconds;

    private static ApplicationDbContext NewContext() =>
        new(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options,
            new TestCurrentUserService());

    private static SessionAbandonmentService NewService(ApplicationDbContext ctx) =>
        new(ctx,
            NullLogger<SessionAbandonmentService>.Instance,
            Options.Create(new QuizSessionOptions()));

    /// <summary>
    /// A quiz of <see cref="QuestionCount"/> equal-length questions and one unfinished session on
    /// it, with the clocks placed relative to now.
    /// </summary>
    /// <param name="startedSecondsAgo">How long ago the session began.</param>
    /// <param name="lastServedSecondsAgo">
    /// How long ago the question currently in flight was served. Null means none was — the
    /// session's own start is then its last activity.
    /// </param>
    private static QuizSession Seed(
        ApplicationDbContext ctx,
        int startedSecondsAgo,
        int? lastServedSecondsAgo)
    {
        var now = DateTime.UtcNow;
        var category = new QuestionCategory { Id = 1, Name = "General" };
        var quiz = new Quiz
        {
            Id = 1,
            Title = "Algebra and Calculus",
            CategoryId = category.Id,
            Category = category,
            Version = 1,
        };

        ctx.Add(category);
        ctx.Add(quiz);

        for (var i = 1; i <= QuestionCount; i++)
        {
            var question = new TrueFalseQuestion
            {
                Id = i,
                Text = $"Question {i}",
                Type = QuestionType.TrueFalse,
                CorrectAnswer = true,
            };
            ctx.Add(question);
            ctx.Add(new QuizQuestion
            {
                Id = i,
                QuizId = quiz.Id,
                Quiz = quiz,
                QuestionId = question.Id,
                Question = question,
                OrderInQuiz = i,
                TimeLimitInSeconds = QuestionSeconds,
                CreatedInVersion = 1,
                RemovedInVersion = null,
            });
        }

        var session = new QuizSession
        {
            Id = Guid.NewGuid(),
            QuizId = quiz.Id,
            Quiz = quiz,
            UserId = Guid.NewGuid(),
            StartTime = now.AddSeconds(-startedSecondsAgo),
            CurrentQuizQuestionId = lastServedSecondsAgo.HasValue ? 1 : null,
            CurrentQuestionStartTime = lastServedSecondsAgo.HasValue
                ? now.AddSeconds(-lastServedSecondsAgo.Value)
                : null,
            QuizVersion = 1,
            IsCompleted = false,
        };

        ctx.Add(session);
        ctx.SaveChanges();

        return session;
    }

    /// <summary>
    /// <b>The invariant.</b> A player away for exactly as long as every remaining question would
    /// take is at the walk's furthest reach — the walk still has somewhere to put them, so the
    /// abandonment check must not have voided the session first.
    /// </summary>
    [Fact]
    public async Task A_session_at_the_walks_furthest_reach_is_still_resumable()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, startedSecondsAgo: WalkReachSeconds, lastServedSecondsAgo: WalkReachSeconds);

        Assert.False(await NewService(ctx).IsSessionAbandonedAsync(session));
    }

    /// <summary>
    /// The reported bug, as a test. Five minutes away from a fifteen-question quiz of 30-second
    /// questions: ten questions' worth of time has passed, so the walk has plenty left to land
    /// on. Under the old <c>longestQuestion × 2 + 60s</c> rule this was abandoned after two
    /// minutes, and pressing Resume threw.
    /// </summary>
    [Fact]
    public async Task Five_minutes_away_does_not_void_a_fifteen_question_quiz()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, startedSecondsAgo: 300, lastServedSecondsAgo: 300);

        Assert.False(await NewService(ctx).IsSessionAbandonedAsync(session));
    }

    /// <summary>
    /// Past the reach, the session really is over: every question would have expired anyway, so
    /// abandoning it and completing it amount to the same outcome for the player.
    /// </summary>
    [Fact]
    public async Task An_absence_longer_than_the_whole_quiz_is_abandoned()
    {
        using var ctx = NewContext();
        // Reach + the per-question buffers + the grace, and then some.
        var beyond = WalkReachSeconds + (QuestionCount * 5) + 60 + 60;
        var session = Seed(ctx, startedSecondsAgo: beyond, lastServedSecondsAgo: beyond);

        Assert.True(await NewService(ctx).IsSessionAbandonedAsync(session));
    }

    /// <summary>
    /// The total-time cap is the other half of the deadline, and it bites even when the player
    /// has been active: a session that has been open far longer than the quiz could possibly take
    /// is stale however recently it was touched. Without this, someone who answers one question
    /// every few minutes keeps a session alive indefinitely.
    /// </summary>
    [Fact]
    public async Task A_long_running_session_is_abandoned_even_with_recent_activity()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, startedSecondsAgo: 3 * 60 * 60, lastServedSecondsAgo: 5);

        Assert.True(await NewService(ctx).IsSessionAbandonedAsync(session));
    }

    /// <summary>
    /// The deadline the client is shown and the verdict the server acts on must be the same
    /// number — the client renders "you can still resume" straight off it, so a deadline that
    /// disagreed would be a promise the very next request breaks.
    /// </summary>
    [Fact]
    public async Task The_published_deadline_and_the_verdict_agree()
    {
        using var ctx = NewContext();
        var service = NewService(ctx);

        var live = Seed(ctx, startedSecondsAgo: 60, lastServedSecondsAgo: 60);
        var liveDeadline = await service.GetAbandonmentDeadlineAsync(live);

        Assert.True(liveDeadline > DateTime.UtcNow);
        Assert.False(await service.IsSessionAbandonedAsync(live));

        using var ctx2 = NewContext();
        var service2 = NewService(ctx2);

        var dead = Seed(ctx2, startedSecondsAgo: 24 * 60 * 60, lastServedSecondsAgo: 24 * 60 * 60);
        var deadDeadline = await service2.GetAbandonmentDeadlineAsync(dead);

        Assert.True(deadDeadline < DateTime.UtcNow);
        Assert.True(await service2.IsSessionAbandonedAsync(dead));
    }

    /// <summary>
    /// The deadline is the EARLIER of the two caps, not the later. A session kept alive by
    /// frequent activity is still bounded by its total-time cap, and the player is entitled to
    /// see the bound that will actually end them.
    /// </summary>
    [Fact]
    public async Task The_deadline_is_the_earlier_of_the_two_caps()
    {
        // Both sessions were touched five seconds ago, so their inactivity caps are identical and
        // only the total-time cap differs. Taking the LATER of the two would make these equal;
        // taking the earlier makes the long-running one expire first, which is the point.
        // Asserted relationally rather than against a computed timestamp so the test pins the
        // choice of min() and not a copy of the arithmetic.
        using var freshCtx = NewContext();
        var fresh = Seed(freshCtx, startedSecondsAgo: 5, lastServedSecondsAgo: 5);
        var freshDeadline = await NewService(freshCtx).GetAbandonmentDeadlineAsync(fresh);

        using var longCtx = NewContext();
        var longRunning = Seed(longCtx, startedSecondsAgo: 700, lastServedSecondsAgo: 5);
        var longDeadline = await NewService(longCtx).GetAbandonmentDeadlineAsync(longRunning);

        Assert.True(
            longDeadline < freshDeadline,
            "the long-running session's total-time cap should be its deadline, not its inactivity window");
    }

    /// <summary>
    /// A session that was created but never served a question still ages out, measured from its
    /// own start. Otherwise a session with no <c>CurrentQuestionStartTime</c> would sit forever,
    /// and with <c>MaxConcurrentSessionsPerUser = 1</c> that is a player permanently unable to
    /// start that quiz.
    /// </summary>
    [Fact]
    public async Task A_session_that_never_served_a_question_still_ages_out()
    {
        using var ctx = NewContext();
        var session = Seed(ctx, startedSecondsAgo: 24 * 60 * 60, lastServedSecondsAgo: null);

        Assert.True(await NewService(ctx).IsSessionAbandonedAsync(session));
    }
}
