using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.Notification;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Ai;
using QuizAPI.Services.Ai.Jobs;
using QuizAPI.Services.Ai.Sources;
using QuizAPI.Services.Audit;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// A generation as a background job (docs/quiz/ai-quiz-generation-flow.md §3c): accepted at once,
/// run by a worker, its outcome stored in the shape the synchronous endpoint returns, and the
/// author notified when nobody was watching. The generation itself is mocked — what it does is
/// covered elsewhere; this is the job around it. The database is real (InMemory), reached through
/// scopes as in the app, because "every touch of the job row is its own scope" is the design.
/// </summary>
public class AiGenerationJobTests
{
    private sealed class Harness
    {
        public required ServiceProvider Services { get; init; }
        public required Mock<IAiGenerationService> Generation { get; init; }
        public required Mock<INotificationService> Notifications { get; init; }
        public required AiGenerationJobQueue Queue { get; init; }
        public required AiGenerationJobRunner Runner { get; init; }
        public List<(Guid User, string Type, string Title, string Message, string? Link)> Sent { get; } = new();

        public async Task<T> InScope<T>(Func<IServiceProvider, Task<T>> work)
        {
            await using var scope = Services.CreateAsyncScope();
            return await work(scope.ServiceProvider);
        }

        public Task<AiGenerationJobDTO> Start(Guid user, string topic = "General Knowledge", string? returnPath = "/dashboard/quizzes/ai") =>
            InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().StartAsync(user, Request(topic, returnPath)));

        public Task<AiGenerationJob?> Row(Guid id) =>
            InScope(sp => sp.GetRequiredService<IAiGenerationJobRepository>().GetTrackedAsync(id));
    }

    private static AiJobCM Request(string topic, string? returnPath) => new()
    {
        Mode = nameof(AiGenerationMode.Topic),
        Topic = topic,
        QuestionCount = 10,
        AllowedTypes = ["MultipleChoice"],
        DifficultyNames = ["Easy"],
        LanguageNames = ["English"],
        ReturnPath = returnPath,
    };

    private static Harness Build(Func<Func<string, Task>?, Task<AiGenerationOutcome>>? generate = null)
    {
        var generation = new Mock<IAiGenerationService>();
        generation
            .Setup(g => g.GenerateAsync(
                It.IsAny<Guid>(), It.IsAny<AiGenerationRequest>(), It.IsAny<Func<string, Task>?>(), It.IsAny<CancellationToken>()))
            .Returns((Guid _, AiGenerationRequest _, Func<string, Task>? onStage, CancellationToken _) =>
                generate is not null
                    ? generate(onStage)
                    : Task.FromResult(AiGenerationOutcome.Ok("""{"questions":[]}""", new AiTokenUsage(700, 300), 1)));

        var harness = (Harness?)null;
        var notifications = new Mock<INotificationService>();
        notifications
            .Setup(n => n.CreateWithLinkAsync(
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .Returns((Guid user, string type, string title, string message, string? link, CancellationToken _) =>
            {
                harness!.Sent.Add((user, type, title, message, link));
                return Task.FromResult(new NotificationDTO());
            });

        var db = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService { UserId = null, IsAdmin = false });
        services.AddDbContext<ApplicationDbContext>(o => o.UseInMemoryDatabase(db));
        services.AddScoped<IAiGenerationJobRepository, AiGenerationJobRepository>();
        services.AddScoped<IAiGenerationJobService, AiGenerationJobService>();
        services.AddScoped(_ => generation.Object);
        services.AddScoped(_ => notifications.Object);
        services.AddScoped(_ => new Mock<IAuditService>().Object);
        services.AddSingleton(Options.Create(new AiOptions { Enabled = true }));
        var queue = new AiGenerationJobQueue();
        services.AddSingleton<IAiGenerationJobQueue>(queue);
        var provider = services.BuildServiceProvider();

        harness = new Harness
        {
            Services = provider,
            Generation = generation,
            Notifications = notifications,
            Queue = queue,
            Runner = new AiGenerationJobRunner(
                provider.GetRequiredService<IServiceScopeFactory>(), queue, NullLogger<AiGenerationJobRunner>.Instance),
        };
        return harness;
    }

    private static async Task<Guid> Dequeue(AiGenerationJobQueue queue)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await foreach (var id in queue.ReadAllAsync(cts.Token)) return id;
        throw new InvalidOperationException("Nothing was queued.");
    }

    // ── Starting ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Starting_answers_at_once_with_a_queued_job_and_hands_it_to_the_worker()
    {
        var h = Build();
        var user = Guid.NewGuid();

        var job = await h.Start(user);

        Assert.Equal("Queued", job.Status);
        Assert.Equal(AiGenerationStages.Queued, job.Stage);
        Assert.Null(job.Result);
        Assert.Equal(job.Id, await Dequeue(h.Queue));
        // Nothing ran inside the request.
        h.Generation.VerifyNoOtherCalls();

        var row = await h.Row(job.Id);
        Assert.Equal(user, row!.UserId);
        Assert.Equal("General Knowledge", row.Topic);
        Assert.Equal("/dashboard/quizzes/ai", row.ReturnPath);
    }

    [Fact]
    public async Task A_second_start_while_one_is_running_returns_the_first_and_starts_nothing()
    {
        // A double press, or a second tab, must not spend a second generation.
        var h = Build();
        var user = Guid.NewGuid();

        var first = await h.Start(user, "General Knowledge");
        var second = await h.Start(user, "Something else");

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(first.Id, await Dequeue(h.Queue));
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () => await Dequeue2(h.Queue, cts.Token));
    }

    private static async Task<Guid> Dequeue2(AiGenerationJobQueue queue, CancellationToken ct)
    {
        await foreach (var id in queue.ReadAllAsync(ct)) return id;
        return Guid.Empty;
    }

    [Fact]
    public async Task Another_author_is_not_held_up_by_it()
    {
        var h = Build();

        var mine = await h.Start(Guid.NewGuid());
        var theirs = await h.Start(Guid.NewGuid());

        Assert.NotEqual(mine.Id, theirs.Id);
    }

    [Fact]
    public async Task Once_it_has_finished_a_new_one_can_start()
    {
        var h = Build();
        var user = Guid.NewGuid();
        var first = await h.Start(user);
        await h.Runner.RunAsync(first.Id, default);

        var second = await h.Start(user);

        Assert.NotEqual(first.Id, second.Id);
    }

    [Theory]
    [InlineData("https://evil.example/ai")]
    [InlineData("//evil.example/ai")]
    [InlineData("dashboard/quizzes")]
    [InlineData(@"/\evil.example")]
    public async Task A_return_path_that_is_not_inside_the_app_is_dropped(string path)
    {
        var h = Build();

        var job = await h.Start(Guid.NewGuid(), returnPath: path);

        Assert.Null((await h.Row(job.Id))!.ReturnPath);
    }

    // ── Reading ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_job_is_its_owners_alone()
    {
        var h = Build();
        var job = await h.Start(Guid.NewGuid());

        var asStranger = await h.InScope(sp =>
            sp.GetRequiredService<IAiGenerationJobService>().GetAsync(Guid.NewGuid(), job.Id));
        var seenByStranger = await h.InScope(sp =>
            sp.GetRequiredService<IAiGenerationJobService>().MarkSeenAsync(Guid.NewGuid(), job.Id));

        Assert.Null(asStranger);
        Assert.False(seenByStranger);
    }

    [Fact]
    public async Task The_uncollected_job_is_offered_until_it_has_been_seen()
    {
        var h = Build();
        var user = Guid.NewGuid();
        var job = await h.Start(user);
        await h.Runner.RunAsync(job.Id, default);

        var before = await h.InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().GetUncollectedAsync(user));
        await h.InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().MarkSeenAsync(user, job.Id));
        var after = await h.InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().GetUncollectedAsync(user));

        Assert.Equal(job.Id, before!.Id);
        Assert.Equal("Succeeded", before.Status);
        Assert.Null(after);
    }

    // ── Running ──────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task A_success_is_stored_as_the_body_the_synchronous_endpoint_returns()
    {
        var grounding = new GroundingResult
        {
            Status = GroundingStatus.Grounded,
            Language = "English",
            Source = new GroundedSource("wikipedia", "Photosynthesis", "https://en.wikipedia.org/wiki/Photosynthesis", "Text.", "English"),
        };
        var h = Build(_ => Task.FromResult(
            AiGenerationOutcome.Ok("""{"questions":[1]}""", new AiTokenUsage(700, 300), 1, grounding)));
        var user = Guid.NewGuid();
        var job = await h.Start(user);

        await h.Runner.RunAsync(job.Id, default);

        var dto = await h.InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().GetAsync(user, job.Id));
        Assert.Equal("Succeeded", dto!.Status);
        Assert.Equal(AiGenerationStages.Done, dto.Stage);
        Assert.Null(dto.Error);
        var result = dto.Result!.Value;
        // camelCase, like every API body: the browser reads a stored result with the same code.
        Assert.Equal("""{"questions":[1]}""", result.GetProperty("payload").GetString());
        Assert.Equal(1, result.GetProperty("quotaRemaining").GetInt32());
        Assert.Equal(700, result.GetProperty("inputTokens").GetInt32());
        Assert.Equal("Photosynthesis", result.GetProperty("grounding").GetProperty("source").GetProperty("title").GetString());
    }

    [Fact]
    public async Task The_request_reaches_the_generation_as_it_was_posted_for_the_author_who_posted_it()
    {
        var h = Build();
        var user = Guid.NewGuid();
        var job = await h.Start(user, "History's most significant events");

        await h.Runner.RunAsync(job.Id, default);

        h.Generation.Verify(g => g.GenerateAsync(
            user,
            It.Is<AiGenerationRequest>(r =>
                r.Topic == "History's most significant events" && r.Mode == AiGenerationMode.Topic && r.QuestionCount == 10),
            It.IsAny<Func<string, Task>?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Each_stage_is_on_the_row_while_it_is_happening()
    {
        Harness h = null!;
        var jobId = Guid.Empty;
        var seen = new List<(string Stage, AiGenerationJobStatus Status)>();
        h = Build(async onStage =>
        {
            foreach (var stage in new[] { AiGenerationStages.FindingSources, AiGenerationStages.Writing })
            {
                await onStage!(stage);
                var row = await h.Row(jobId);
                seen.Add((row!.Stage, row.Status));
            }
            return AiGenerationOutcome.Ok("{}", AiTokenUsage.Zero, null);
        });
        jobId = (await h.Start(Guid.NewGuid())).Id;

        await h.Runner.RunAsync(jobId, default);

        Assert.Equal(
            [(AiGenerationStages.FindingSources, AiGenerationJobStatus.Running), (AiGenerationStages.Writing, AiGenerationJobStatus.Running)],
            seen);
    }

    [Fact]
    public async Task A_question_from_grounding_is_its_own_status_and_carries_the_question()
    {
        var question = new GroundingResult
        {
            Status = GroundingStatus.NeedsArticle,
            Language = "English",
            Candidates = [new SourceCandidate("Mercury (planet)", 16000), new SourceCandidate("Freddie Mercury", 17000)],
        };
        var h = Build(_ => Task.FromResult(AiGenerationOutcome.NeedsChoice(question)));
        var user = Guid.NewGuid();
        var job = await h.Start(user, "Mercury");

        await h.Runner.RunAsync(job.Id, default);

        var dto = await h.InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().GetAsync(user, job.Id));
        Assert.Equal("NeedsChoice", dto!.Status);
        Assert.Null(dto.Result);
        Assert.Equal(AiErrorCodes.SourceNeedsChoice, dto.Error!.Value.GetProperty("code").GetString());
        Assert.Equal(2, dto.Error.Value.GetProperty("grounding").GetProperty("articles").GetArrayLength());
    }

    [Fact]
    public async Task A_failure_keeps_its_code_message_and_retry_time()
    {
        var resets = DateTime.UtcNow.AddHours(3);
        var h = Build(_ => Task.FromResult(
            AiGenerationOutcome.Fail(AiErrorCodes.QuotaExceeded, "You've used today's 2 AI quizzes.", resets)));
        var user = Guid.NewGuid();
        var job = await h.Start(user);

        await h.Runner.RunAsync(job.Id, default);

        var dto = await h.InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().GetAsync(user, job.Id));
        Assert.Equal("Failed", dto!.Status);
        var error = dto.Error!.Value;
        Assert.Equal(AiErrorCodes.QuotaExceeded, error.GetProperty("code").GetString());
        Assert.Equal("You've used today's 2 AI quizzes.", error.GetProperty("message").GetString());
        Assert.Equal(resets, error.GetProperty("retryAfter").GetDateTime(), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task A_crash_in_the_generation_ends_the_job_as_a_failure_the_author_can_read()
    {
        var h = Build(_ => throw new InvalidOperationException("boom"));
        var user = Guid.NewGuid();
        var job = await h.Start(user);

        await h.Runner.RunAsync(job.Id, default);

        var row = await h.Row(job.Id);
        Assert.Equal(AiGenerationJobStatus.Failed, row!.Status);
        Assert.NotNull(row.CompletedAt);
        // The exception's text is ours to log, not the author's to read.
        Assert.DoesNotContain("boom", row.ResultJson);
    }

    [Fact]
    public async Task A_server_stopping_mid_job_ends_it_rather_than_leaving_it_running()
    {
        var h = Build(_ => throw new OperationCanceledException());
        var job = await h.Start(Guid.NewGuid());

        await h.Runner.RunAsync(job.Id, default);

        var row = await h.Row(job.Id);
        Assert.Equal(AiGenerationJobStatus.Failed, row!.Status);
        Assert.Contains("restarted", row.ResultJson);
    }

    [Fact]
    public async Task A_job_is_run_once_however_often_it_is_handed_over()
    {
        var h = Build();
        var job = await h.Start(Guid.NewGuid());

        await h.Runner.RunAsync(job.Id, default);
        await h.Runner.RunAsync(job.Id, default);

        h.Generation.Verify(g => g.GenerateAsync(
            It.IsAny<Guid>(), It.IsAny<AiGenerationRequest>(), It.IsAny<Func<string, Task>?>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Jobs_left_unfinished_by_a_restart_are_ended()
    {
        var h = Build();
        var user = Guid.NewGuid();
        var job = await h.Start(user);

        var ended = await h.Runner.FailInterruptedAsync(DateTime.UtcNow.AddSeconds(1));

        Assert.Equal(1, ended);
        var row = await h.Row(job.Id);
        Assert.Equal(AiGenerationJobStatus.Failed, row!.Status);
        Assert.Equal(AiGenerationStages.Done, row.Stage);
        // And it no longer blocks the author's next one.
        Assert.NotEqual(job.Id, (await h.Start(user)).Id);
    }

    // ── Telling the author ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task With_nobody_watching_the_author_is_notified_with_a_link_back()
    {
        var h = Build();
        var user = Guid.NewGuid();
        var job = await h.Start(user, "General Knowledge", "/my-dashboard/quizzes/ai");
        await h.Runner.RunAsync(job.Id, default);
        h.Queue.Forget(job.Id);   // the tab is gone: no poll since

        await h.Runner.FollowUpAsync(job.Id, default);

        var sent = Assert.Single(h.Sent);
        Assert.Equal(user, sent.User);
        Assert.Equal(AiGenerationJobRunner.NotificationType, sent.Type);
        Assert.Equal("Your quiz is ready", sent.Title);
        Assert.Contains("“General Knowledge”", sent.Message);
        Assert.Equal("/my-dashboard/quizzes/ai", sent.Link);
        Assert.True((await h.Row(job.Id))!.Notified);
    }

    [Fact]
    public async Task A_result_already_collected_sends_nothing()
    {
        var h = Build();
        var user = Guid.NewGuid();
        var job = await h.Start(user);
        await h.Runner.RunAsync(job.Id, default);
        await h.InScope(sp => sp.GetRequiredService<IAiGenerationJobService>().MarkSeenAsync(user, job.Id));

        await h.Runner.FollowUpAsync(job.Id, default);

        Assert.Empty(h.Sent);
    }

    [Fact]
    public async Task Nobody_is_notified_twice()
    {
        var h = Build();
        var job = await h.Start(Guid.NewGuid());
        await h.Runner.RunAsync(job.Id, default);

        await h.Runner.NotifyIfUncollectedAsync(job.Id);
        await h.Runner.NotifyIfUncollectedAsync(job.Id);

        Assert.Single(h.Sent);
    }

    [Fact]
    public async Task A_job_still_running_sends_nothing()
    {
        var h = Build();
        var job = await h.Start(Guid.NewGuid());

        await h.Runner.NotifyIfUncollectedAsync(job.Id);

        Assert.Empty(h.Sent);
    }

    [Fact]
    public async Task A_failure_and_a_question_are_notified_in_their_own_words()
    {
        var failing = Build(_ => Task.FromResult(
            AiGenerationOutcome.Fail(AiErrorCodes.ProviderTimeout, "The quiz generator took too long to respond. Please try again.")));
        var failed = await failing.Start(Guid.NewGuid());
        await failing.Runner.RunAsync(failed.Id, default);
        await failing.Runner.NotifyIfUncollectedAsync(failed.Id);

        var asking = Build(_ => Task.FromResult(AiGenerationOutcome.NeedsChoice(
            new GroundingResult { Status = GroundingStatus.NeedsLanguage, Languages = ["English", "Albanian"] })));
        var asked = await asking.Start(Guid.NewGuid());
        await asking.Runner.RunAsync(asked.Id, default);
        await asking.Runner.NotifyIfUncollectedAsync(asked.Id);

        Assert.Equal("Your quiz couldn't be written", failing.Sent.Single().Title);
        Assert.Equal("The quiz generator took too long to respond. Please try again.", failing.Sent.Single().Message);
        Assert.Equal("Your quiz needs an answer from you", asking.Sent.Single().Title);
        Assert.Contains("English or Albanian", asking.Sent.Single().Message);
    }

    [Fact]
    public void Watching_is_a_recent_poll_and_nothing_else()
    {
        var queue = new AiGenerationJobQueue();
        var id = Guid.NewGuid();

        Assert.False(queue.IsWatched(id, TimeSpan.FromSeconds(6)));
        queue.Watched(id);
        Assert.True(queue.IsWatched(id, TimeSpan.FromSeconds(6)));
        Assert.False(queue.IsWatched(id, TimeSpan.Zero - TimeSpan.FromSeconds(1)));
        queue.Forget(id);
        Assert.False(queue.IsWatched(id, TimeSpan.FromSeconds(6)));
    }

    // ── The link on a notification ───────────────────────────────────────────────────────────

    [Theory]
    [InlineData("/dashboard/quizzes/ai", "/dashboard/quizzes/ai")]
    [InlineData("  /my-dashboard  ", "/my-dashboard")]
    [InlineData("/q/12/general-knowledge?x=1", "/q/12/general-knowledge?x=1")]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("https://example.com/", null)]
    [InlineData("//example.com/", null)]
    [InlineData("javascript:alert(1)", null)]
    [InlineData("/redirect?to=https://example.com", null)]
    [InlineData(@"/\example.com", null)]
    public void A_link_is_a_path_inside_the_app_or_nothing(string? link, string? kept) =>
        Assert.Equal(kept, NotificationService.SafeLink(link));
}
