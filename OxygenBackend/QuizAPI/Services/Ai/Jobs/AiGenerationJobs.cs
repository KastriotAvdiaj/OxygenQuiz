using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.Extensions.Options;
using QuizAPI.Controllers.Notifications.Services;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Ai;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Audit;

namespace QuizAPI.Services.Ai.Jobs
{
    /// <summary>
    /// Hands job ids from the request that accepted them to the worker that runs them, and
    /// remembers who is watching (docs/quiz/ai-quiz-generation-flow.md §3c).
    ///
    /// <para><b>In this process, on purpose.</b> Hangfire is already here and would survive a
    /// restart, but its PostgreSQL storage polls for work every fifteen seconds — a quarter of a
    /// typical generation spent waiting to begin, with the author watching. A channel starts the
    /// job in the same millisecond. What it gives up is a job in flight when the process stops:
    /// that job is marked failed (nothing is charged — the reservation is released) and the
    /// author is told to try again. ADR 0046.</para>
    /// </summary>
    public interface IAiGenerationJobQueue
    {
        ValueTask EnqueueAsync(Guid jobId, CancellationToken ct = default);

        IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken ct);

        /// <summary>The author's browser just asked about this job — somebody is looking at the card.</summary>
        void Watched(Guid jobId);

        /// <summary>Whether it was asked about within <paramref name="within"/>.</summary>
        bool IsWatched(Guid jobId, TimeSpan within);

        void Forget(Guid jobId);
    }

    public sealed class AiGenerationJobQueue : IAiGenerationJobQueue
    {
        private readonly Channel<Guid> _channel =
            Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions { SingleReader = true });
        private readonly ConcurrentDictionary<Guid, DateTime> _watched = new();

        public ValueTask EnqueueAsync(Guid jobId, CancellationToken ct = default) =>
            _channel.Writer.WriteAsync(jobId, ct);

        public IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);

        public void Watched(Guid jobId) => _watched[jobId] = DateTime.UtcNow;

        public bool IsWatched(Guid jobId, TimeSpan within) =>
            _watched.TryGetValue(jobId, out var at) && DateTime.UtcNow - at <= within;

        public void Forget(Guid jobId) => _watched.TryRemove(jobId, out _);
    }

    /// <summary>What the browser is told about a job. The same shape whether it is polled live or picked up later.</summary>
    public sealed class AiGenerationJobDTO
    {
        public Guid Id { get; set; }

        /// <summary><see cref="AiGenerationJobStatus"/> by name.</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>One of <see cref="AiGenerationStages"/>.</summary>
        public string Stage { get; set; } = string.Empty;

        /// <summary>Succeeded: the <see cref="AiGenerateResponse"/> the synchronous endpoint would have returned.</summary>
        public JsonElement? Result { get; set; }

        /// <summary>Failed or NeedsChoice: the <see cref="AiGenerateErrorResponse"/> it would have returned.</summary>
        public JsonElement? Error { get; set; }

        public DateTime CreatedAt { get; set; }

        internal static AiGenerationJobDTO From(AiGenerationJob job)
        {
            JsonElement? body = null;
            if (!string.IsNullOrEmpty(job.ResultJson))
            {
                using var doc = JsonDocument.Parse(job.ResultJson);
                body = doc.RootElement.Clone();
            }

            return new AiGenerationJobDTO
            {
                Id = job.Id,
                Status = job.Status.ToString(),
                Stage = job.Stage,
                Result = job.Status == AiGenerationJobStatus.Succeeded ? body : null,
                Error = job.Status is AiGenerationJobStatus.Failed or AiGenerationJobStatus.NeedsChoice ? body : null,
                CreatedAt = job.CreatedAt,
            };
        }
    }

    public interface IAiGenerationJobService
    {
        /// <summary>
        /// Accepts a generation and returns at once. One at a time per author: with one already
        /// queued or running, that one is returned instead and nothing new starts — a second
        /// press, or a second tab, must not spend a second generation.
        /// </summary>
        Task<AiGenerationJobDTO> StartAsync(Guid userId, AiJobCM request, CancellationToken ct = default);

        /// <summary>The caller's job, or null. Asking counts as watching it.</summary>
        Task<AiGenerationJobDTO?> GetAsync(Guid userId, Guid jobId, CancellationToken ct = default);

        /// <summary>The caller's newest job still theirs to collect — running, or finished and not yet taken.</summary>
        Task<AiGenerationJobDTO?> GetUncollectedAsync(Guid userId, CancellationToken ct = default);

        /// <summary>The browser has the result. False when there is no such job of theirs.</summary>
        Task<bool> MarkSeenAsync(Guid userId, Guid jobId, CancellationToken ct = default);
    }

    public sealed class AiGenerationJobService : IAiGenerationJobService
    {
        /// <summary>How far back an uncollected job is still offered. Older ones are the sweeper's.</summary>
        internal static readonly TimeSpan CollectWindow = TimeSpan.FromHours(24);

        internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        private readonly IAiGenerationJobRepository _jobs;
        private readonly IAiGenerationJobQueue _queue;
        private readonly AiOptions _options;

        public AiGenerationJobService(
            IAiGenerationJobRepository jobs, IAiGenerationJobQueue queue, IOptions<AiOptions> options)
        {
            _jobs = jobs;
            _queue = queue;
            _options = options.Value;
        }

        public async Task<AiGenerationJobDTO> StartAsync(Guid userId, AiJobCM request, CancellationToken ct = default)
        {
            // Only as far back as a job can still be alive: past that the sweeper has failed it,
            // or is about to, and it must not block a new one.
            var alive = DateTime.UtcNow.AddMinutes(-Math.Max(1, _options.ReservationTimeoutMinutes));
            var running = await _jobs.GetUnfinishedAsync(userId, alive, ct);
            if (running is not null)
            {
                _queue.Watched(running.Id);
                return AiGenerationJobDTO.From(running);
            }

            var job = new AiGenerationJob
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = AiGenerationJobStatus.Queued,
                Stage = AiGenerationStages.Queued,
                Topic = Truncate(request.Topic?.Trim(), 200),
                // As the base type: the worker rebuilds exactly the request the synchronous
                // endpoint would have been given, and nothing about where to send the author back.
                RequestJson = JsonSerializer.Serialize<AiGenerateCM>(request, Json),
                ReturnPath = NotificationService.SafeLink(request.ReturnPath),
                CreatedAt = DateTime.UtcNow,
            };
            await _jobs.AddAsync(job, ct);
            await _jobs.SaveChangesAsync(ct);

            // The author is looking at the card they just opened — before the first poll says so.
            _queue.Watched(job.Id);
            await _queue.EnqueueAsync(job.Id, ct);
            return AiGenerationJobDTO.From(job);
        }

        public async Task<AiGenerationJobDTO?> GetAsync(Guid userId, Guid jobId, CancellationToken ct = default)
        {
            var job = await _jobs.GetForUserAsync(jobId, userId, tracked: false, ct);
            if (job is null) return null;
            _queue.Watched(job.Id);
            return AiGenerationJobDTO.From(job);
        }

        public async Task<AiGenerationJobDTO?> GetUncollectedAsync(Guid userId, CancellationToken ct = default)
        {
            var job = await _jobs.GetUncollectedAsync(userId, DateTime.UtcNow - CollectWindow, ct);
            if (job is null) return null;
            _queue.Watched(job.Id);
            return AiGenerationJobDTO.From(job);
        }

        public async Task<bool> MarkSeenAsync(Guid userId, Guid jobId, CancellationToken ct = default)
        {
            var job = await _jobs.GetForUserAsync(jobId, userId, tracked: true, ct);
            if (job is null) return false;
            if (job.SeenAt is null)
            {
                job.SeenAt = DateTime.UtcNow;
                await _jobs.SaveChangesAsync(ct);
            }
            _queue.Forget(jobId);
            return true;
        }

        private static string? Truncate(string? value, int max) =>
            value is null ? null : value.Length <= max ? value : value[..max];
    }

    /// <summary>
    /// Runs one job: the same <see cref="IAiGenerationService.GenerateAsync(Guid, AiGenerationRequest, CancellationToken)"/>
    /// the synchronous endpoint calls, with its outcome stored instead of returned.
    ///
    /// <para><b>Every touch of the job row is its own scope.</b> The generation runs in one scope
    /// and owns that scope's <c>DbContext</c> — it opens a transaction and takes an advisory lock
    /// to reserve the quota slot. A progress update written through the same context would be a
    /// write inside someone else's unit of work, so the row is read and saved through a short
    /// scope of its own each time.</para>
    /// </summary>
    public sealed class AiGenerationJobRunner
    {
        /// <summary>A poll this recent means the author is looking at the card. The client polls every 1.5 s.</summary>
        internal static readonly TimeSpan WatchWindow = TimeSpan.FromSeconds(6);

        /// <summary>
        /// How long a watched job's result may sit uncollected before a notification is sent
        /// anyway — the tab closed in the last second, the laptop lid shut.
        /// </summary>
        internal static readonly TimeSpan CollectGrace = TimeSpan.FromSeconds(25);

        public const string NotificationType = "ai-quiz";

        private readonly IServiceScopeFactory _scopes;
        private readonly IAiGenerationJobQueue _queue;
        private readonly ILogger<AiGenerationJobRunner> _logger;

        public AiGenerationJobRunner(
            IServiceScopeFactory scopes, IAiGenerationJobQueue queue, ILogger<AiGenerationJobRunner> logger)
        {
            _scopes = scopes;
            _queue = queue;
            _logger = logger;
        }

        public async Task RunAsync(Guid jobId, CancellationToken ct)
        {
            var job = await UpdateAsync(jobId, j =>
            {
                if (j.Status != AiGenerationJobStatus.Queued) return false;
                j.Status = AiGenerationJobStatus.Running;
                return true;
            });
            // Gone, or already picked up: nothing to do, and nothing to charge.
            if (job is null || job.Status != AiGenerationJobStatus.Running) return;

            AiGenerationJobStatus status;
            object body;
            try
            {
                var cm = JsonSerializer.Deserialize<AiGenerateCM>(job.RequestJson, AiGenerationJobService.Json);
                var request = cm?.ToServiceRequest();
                if (request is null)
                {
                    (status, body) = Failed(AiErrorCodes.InvalidRequest, "That request couldn't be read. Try generating again.");
                }
                else
                {
                    await using var scope = _scopes.CreateAsyncScope();
                    var generation = scope.ServiceProvider.GetRequiredService<IAiGenerationService>();

                    var outcome = await generation.GenerateAsync(
                        job.UserId, request,
                        stage => UpdateAsync(jobId, j => { j.Stage = stage; return true; }),
                        ct);

                    if (outcome.Success)
                    {
                        status = AiGenerationJobStatus.Succeeded;
                        body = new AiGenerateResponse
                        {
                            Payload = outcome.PayloadJson!,
                            QuotaRemaining = outcome.QuotaRemaining,
                            InputTokens = outcome.Usage.InputTokens,
                            OutputTokens = outcome.Usage.OutputTokens,
                            Grounding = AiGroundingDTO.From(outcome.Grounding),
                        };
                        await AuditAsync(scope.ServiceProvider, job.UserId, request, outcome);
                    }
                    else
                    {
                        status = outcome.ErrorCode == AiErrorCodes.SourceNeedsChoice
                            ? AiGenerationJobStatus.NeedsChoice
                            : AiGenerationJobStatus.Failed;
                        body = new AiGenerateErrorResponse
                        {
                            Code = outcome.ErrorCode ?? "Unknown",
                            Message = outcome.Message ?? "Quiz generation failed.",
                            RetryAfter = outcome.RetryAfterUtc,
                            Grounding = AiGroundingDTO.From(outcome.Grounding),
                        };
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // The server is stopping. GenerateAsync has already given the slot back.
                (status, body) = Failed(
                    AiErrorCodes.ProviderUnavailable,
                    "The server restarted while your quiz was being written. Nothing was used — try again.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI generation job {JobId} failed unexpectedly.", jobId);
                (status, body) = Failed("Unknown", "Quiz generation failed. Nothing was used — try again.");
            }

            var json = JsonSerializer.Serialize(body, body.GetType(), AiGenerationJobService.Json);
            await UpdateAsync(jobId, j =>
            {
                j.Status = status;
                j.Stage = AiGenerationStages.Done;
                j.ResultJson = json;
                j.CompletedAt = DateTime.UtcNow;
                return true;
            });
        }

        /// <summary>
        /// After a job ends: tell the author, unless they are already looking at it.
        ///
        /// <para>"Looking at it" is a recent poll, not a flag the browser sets on its way out — a
        /// closed tab, a dead battery and a lost connection never send one. So with no recent
        /// poll the notification goes now; with one, the result is given a short while to be
        /// collected, and the notification goes if it wasn't.</para>
        /// </summary>
        public async Task FollowUpAsync(Guid jobId, CancellationToken ct)
        {
            if (_queue.IsWatched(jobId, WatchWindow))
            {
                try { await Task.Delay(CollectGrace, ct); }
                catch (OperationCanceledException) { /* stopping: notify now rather than never */ }
            }

            await NotifyIfUncollectedAsync(jobId);
            _queue.Forget(jobId);
        }

        internal async Task NotifyIfUncollectedAsync(Guid jobId)
        {
            try
            {
                await using var scope = _scopes.CreateAsyncScope();
                var jobs = scope.ServiceProvider.GetRequiredService<IAiGenerationJobRepository>();
                var job = await jobs.GetTrackedAsync(jobId);
                if (job is null || job.SeenAt is not null || job.Notified) return;
                if (job.Status is AiGenerationJobStatus.Queued or AiGenerationJobStatus.Running) return;

                var (title, message) = Wording(job);
                // Marked first: a notification sent twice is worse than one that, on a failure
                // here, isn't sent — the wizard still offers the result when it is next opened.
                job.Notified = true;
                await jobs.SaveChangesAsync();

                var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
                await notifications.CreateWithLinkAsync(job.UserId, NotificationType, title, message, job.ReturnPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Couldn't notify about AI generation job {JobId}.", jobId);
            }
        }

        /// <summary>What the bell says. The failure and the question use the message the wizard would have shown.</summary>
        internal static (string Title, string Message) Wording(AiGenerationJob job)
        {
            var named = string.IsNullOrWhiteSpace(job.Topic) ? "Your quiz" : $"“{job.Topic!.Trim()}”";
            switch (job.Status)
            {
                case AiGenerationJobStatus.Succeeded:
                    return ("Your quiz is ready", $"{named} has been written. Open it to review the questions.");
                case AiGenerationJobStatus.NeedsChoice:
                    return ("Your quiz needs an answer from you", ErrorMessage(job) ?? $"{named} needs one choice before it can be written.");
                default:
                    return ("Your quiz couldn't be written", ErrorMessage(job) ?? $"{named} couldn't be written. Nothing was used — try again.");
            }
        }

        private static string? ErrorMessage(AiGenerationJob job)
        {
            if (string.IsNullOrEmpty(job.ResultJson)) return null;
            try
            {
                using var doc = JsonDocument.Parse(job.ResultJson);
                return doc.RootElement.TryGetProperty("message", out var m) && m.ValueKind == JsonValueKind.String
                    ? m.GetString()
                    : null;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        /// <summary>
        /// On start-up: a job still queued or running belongs to a process that is gone. It ends
        /// here, as a failure the author can read, rather than showing "Writing…" for ever.
        /// </summary>
        public async Task<int> FailInterruptedAsync(DateTime createdBeforeUtc)
        {
            await using var scope = _scopes.CreateAsyncScope();
            var jobs = scope.ServiceProvider.GetRequiredService<IAiGenerationJobRepository>();
            var stale = await jobs.GetStaleUnfinishedAsync(createdBeforeUtc);
            if (stale.Count == 0) return 0;

            var (_, body) = Failed(
                AiErrorCodes.ProviderUnavailable,
                "The server restarted while your quiz was being written. Nothing was used — try again.");
            var json = JsonSerializer.Serialize(body, body.GetType(), AiGenerationJobService.Json);
            foreach (var job in stale)
            {
                job.Status = AiGenerationJobStatus.Failed;
                job.Stage = AiGenerationStages.Done;
                job.ResultJson = json;
                job.CompletedAt = DateTime.UtcNow;
            }
            await jobs.SaveChangesAsync();
            return stale.Count;
        }

        private static (AiGenerationJobStatus, object) Failed(string code, string message) =>
            (AiGenerationJobStatus.Failed, new AiGenerateErrorResponse { Code = code, Message = message });

        /// <summary>Loads the row in its own scope, applies the change, saves. Returns it, or null when it is gone.</summary>
        private async Task<AiGenerationJob?> UpdateAsync(Guid jobId, Func<AiGenerationJob, bool> change)
        {
            await using var scope = _scopes.CreateAsyncScope();
            var jobs = scope.ServiceProvider.GetRequiredService<IAiGenerationJobRepository>();
            var job = await jobs.GetTrackedAsync(jobId);
            if (job is null) return null;
            if (change(job)) await jobs.SaveChangesAsync();
            return job;
        }

        /// <summary>After the fact and never fatal, like the controller's: an audit write must not turn a success into a failure.</summary>
        private async Task AuditAsync(
            IServiceProvider services, Guid userId, AiGenerationRequest request, AiGenerationOutcome outcome)
        {
            try
            {
                await services.GetRequiredService<IAuditService>().LogAsync(
                    AuditActions.AiQuizGenerated,
                    entity: "Quiz",
                    entityId: null,
                    newValue: new
                    {
                        Mode = request.Mode.ToString(),
                        request.QuestionCount,
                        outcome.Usage.InputTokens,
                        outcome.Usage.OutputTokens,
                    },
                    // No request here to read the user from.
                    userId: userId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Audit of a generated quiz failed.");
            }
        }
    }

    /// <summary>
    /// The loop that takes job ids off the queue. A few at a time (<see cref="AiOptions.MaxConcurrentJobs"/>):
    /// each is mostly waiting on the vendor, so the bound is about not opening a burst of paid
    /// calls at once, not about this server's CPU.
    /// </summary>
    public sealed class AiGenerationJobWorker : BackgroundService
    {
        private readonly IAiGenerationJobQueue _queue;
        private readonly AiGenerationJobRunner _runner;
        private readonly AiOptions _options;
        private readonly ILogger<AiGenerationJobWorker> _logger;

        public AiGenerationJobWorker(
            IAiGenerationJobQueue queue, AiGenerationJobRunner runner, IOptions<AiOptions> options,
            ILogger<AiGenerationJobWorker> logger)
        {
            _queue = queue;
            _runner = runner;
            _options = options.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Let the host finish starting (migrations run on start-up) before the first query.
            await Task.Yield();
            try
            {
                var failed = await _runner.FailInterruptedAsync(DateTime.UtcNow);
                if (failed > 0)
                    _logger.LogWarning("Ended {Count} AI generation job(s) left unfinished by a restart.", failed);
            }
            catch (Exception ex)
            {
                // The table may not exist yet on a database that hasn't been migrated; the
                // recurring sweep fails the same jobs a few minutes later.
                _logger.LogWarning(ex, "Couldn't check for interrupted AI generation jobs at start-up.");
            }

            // Not disposed: jobs still running when the loop ends release it on their way out.
            var gate = new SemaphoreSlim(Math.Max(1, _options.MaxConcurrentJobs));
            try
            {
                await foreach (var jobId in _queue.ReadAllAsync(stoppingToken))
                {
                    await gate.WaitAsync(stoppingToken);
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _runner.RunAsync(jobId, stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "AI generation job {JobId} crashed its runner.", jobId);
                        }
                        finally
                        {
                            gate.Release();
                        }

                        // After the slot is free: this may wait on the author for a while.
                        await _runner.FollowUpAsync(jobId, stoppingToken);
                    }, CancellationToken.None);
                }
            }
            catch (OperationCanceledException)
            {
                // Stopping.
            }
        }
    }
}
