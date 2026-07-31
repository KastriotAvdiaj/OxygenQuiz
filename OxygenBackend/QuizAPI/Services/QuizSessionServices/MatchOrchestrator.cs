using Microsoft.AspNetCore.SignalR;
using QuizAPI.Controllers.Quizzes.Services.AnswerGradingServices;
using QuizAPI.Hubs;
using QuizAPI.Hubs.Clients;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Interfaces;
using QuizAPI.Services.Scoring;

namespace QuizAPI.Services.QuizSessionServices
{
    /// <summary>
    /// Server-authoritative match loop. See <see cref="IMatchOrchestrator"/>.
    ///
    /// Timing and correctness live entirely on the server: clients only render what they're told
    /// and submit answers. Each session id doubles as its SignalR group name (set up in QuizHub),
    /// so the loop broadcasts to <c>Clients.Group(sessionId)</c>.
    /// </summary>
    public class MatchOrchestrator : IMatchOrchestrator
    {
        private const int CountdownSeconds = 3;
        private const int InterQuestionPauseMs = 3000;
        private const int PollIntervalMs = 250;
        private const int DefaultTimeLimitSeconds = 30;

        private readonly IHubContext<QuizHub, IQuizClient> _hub;
        private readonly IQuizSessionManager _sessions;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MatchOrchestrator> _logger;

        public MatchOrchestrator(
            IHubContext<QuizHub, IQuizClient> hub,
            IQuizSessionManager sessions,
            IServiceScopeFactory scopeFactory,
            ILogger<MatchOrchestrator> logger)
        {
            _hub = hub;
            _sessions = sessions;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public async Task StartMatchAsync(string sessionId)
        {
            var session = await _sessions.GetSessionAsync(sessionId)
                ?? throw new InvalidOperationException("Lobby not found.");

            // A *running loop* is the real "already started" condition — not the QuizState. State
            // alone would reject every match after the first: the loop leaves the session in
            // QuizEnded (or wherever it crashed), and nothing used to put it back to Lobby.
            if (session.MatchCts != null)
                throw new InvalidOperationException("The match has already started.");

            // Safety net for a session left dirty by a loop that died without running its cleanup.
            // The normal path is already reset by RunMatchAsync's finally block.
            if (session.QuizState != QuizState.Lobby)
                await ResetToLobbyAsync(sessionId);

            if (string.IsNullOrEmpty(session.SelectedQuizId) || !int.TryParse(session.SelectedQuizId, out var quizId))
                throw new InvalidOperationException("Pick a quiz before starting.");

            var participants = await _sessions.GetParticipantsAsync(sessionId);
            if (participants.Count < 2)
                throw new InvalidOperationException("Need at least 2 players to start.");

            // Load the quiz's questions once, as server-side round questions.
            session.Questions = await LoadRoundQuestionsAsync(quizId);
            if (session.Questions.Count == 0)
                throw new InvalidOperationException("This quiz has no questions.");

            // Reset scores/correct counts for everyone currently in the lobby.
            session.PlayerScores.Clear();
            session.PlayerCorrect.Clear();
            foreach (var p in participants)
            {
                session.PlayerScores[p.Username] = 0;
                session.PlayerCorrect[p.Username] = 0;
            }

            session.CurrentQuestionIndex = 0;
            session.QuizState = QuizState.Starting;
            session.MatchCts = new CancellationTokenSource();

            // Fire-and-forget the loop; it owns its own lifetime via the session's CTS.
            var token = session.MatchCts.Token;
            _ = Task.Run(() => RunMatchAsync(sessionId, token));
        }

        /// <inheritdoc />
        public async Task ResetToLobbyAsync(string sessionId)
        {
            var session = await _sessions.GetSessionAsync(sessionId);
            if (session == null)
                return;

            // Don't yank state out from under a live loop.
            if (session.MatchCts != null)
                return;

            session.QuizState = QuizState.Lobby;
            session.Questions = new List<RoundQuestion>();
            session.CurrentQuestionIndex = 0;
            session.QuestionStartTime = default;
            session.QuestionDeadlineUtc = default;
            session.CurrentRoundAnswers.Clear();
            session.PlayerScores.Clear();
            session.PlayerCorrect.Clear();
            session.PlayerAnswers.Clear();

            // Un-ready everyone: a rematch should need a fresh opt-in, not fire the instant the
            // final scoreboard renders while someone is still reading it. Broadcast each change so
            // the clients' rosters (which track ready state locally) don't drift from the server.
            var participants = await _sessions.GetParticipantsAsync(sessionId);
            foreach (var participant in participants.Where(p => p.IsReady))
            {
                await _sessions.SetPlayerReadyAsync(sessionId, participant.Username, false);
                await _hub.Clients.Group(sessionId).PlayerReadyChanged(participant.Username, false);
            }

            _logger.LogInformation("Session {SessionId} returned to the lobby.", sessionId);
        }

        private async Task RunMatchAsync(string sessionId, CancellationToken ct)
        {
            var clients = _hub.Clients.Group(sessionId);

            try
            {
                var session = await _sessions.GetSessionAsync(sessionId);
                if (session == null) return;

                await clients.MatchStarting(CountdownSeconds);
                await Task.Delay(TimeSpan.FromSeconds(CountdownSeconds), ct);

                for (var index = 0; index < session.Questions.Count; index++)
                {
                    ct.ThrowIfCancellationRequested();

                    var round = session.Questions[index];
                    var limit = round.TimeLimitSeconds > 0 ? round.TimeLimitSeconds : DefaultTimeLimitSeconds;

                    session.CurrentQuestionIndex = index;
                    session.CurrentRoundAnswers.Clear();
                    session.QuestionStartTime = DateTime.UtcNow;
                    session.QuestionDeadlineUtc = session.QuestionStartTime.AddSeconds(limit);
                    session.QuizState = QuizState.QuestionActive;

                    await clients.QuestionStarted(ToView(round, index, session.Questions.Count), session.QuestionDeadlineUtc);

                    await WaitForRoundEndAsync(sessionId, session, ct);

                    session.QuizState = QuizState.QuestionEnded;
                    var result = await GradeRoundAsync(sessionId, session, round, index);
                    await clients.QuestionEnded(result);

                    await Task.Delay(InterQuestionPauseMs, ct);
                }

                session.QuizState = QuizState.QuizEnded;
                await clients.MatchEnded(BuildMatchResult(session));
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Match {SessionId} was cancelled.", sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Match {SessionId} failed.", sessionId);
            }
            finally
            {
                var session = await _sessions.GetSessionAsync(sessionId);
                if (session != null)
                {
                    session.MatchCts?.Dispose();
                    session.MatchCts = null;
                }

                // Hand the lobby back in a startable state. This lives in `finally`, after the CTS
                // is cleared, so it runs for a crashed or cancelled match too — otherwise the
                // session would sit in QuestionActive/QuizEnded and every later StartMatch would
                // fail with "The match has already started."
                await ResetToLobbyAsync(sessionId);
            }
        }

        // Ends the round as soon as the deadline passes or every current player has answered.
        private async Task WaitForRoundEndAsync(string sessionId, MultiplayerSession session, CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                if (DateTime.UtcNow >= session.QuestionDeadlineUtc)
                    return;

                var participants = await _sessions.GetParticipantsAsync(sessionId);
                if (participants.Count > 0 && session.CurrentRoundAnswers.Count >= participants.Count)
                    return;

                await Task.Delay(PollIntervalMs, ct);
            }
        }

        // Grades every player's submission for the round and rolls the results into the standings.
        private async Task<QuestionResult> GradeRoundAsync(
            string sessionId, MultiplayerSession session, RoundQuestion round, int index)
        {
            using var scope = _scopeFactory.CreateScope();
            var grading = scope.ServiceProvider.GetRequiredService<IAnswerGradingService>();

            var participants = await _sessions.GetParticipantsAsync(sessionId);
            var playerResults = new List<PlayerRoundResult>();

            foreach (var p in participants)
            {
                var answered = session.CurrentRoundAnswers.TryGetValue(p.Username, out var submission);
                var isCorrect = false;
                var points = 0;

                if (answered && submission != null)
                {
                    var userAnswer = BuildUserAnswer(round, submission, session.QuestionStartTime);
                    var grade = await grading.GradeAnswerAsync(round.QuizQuestionId, userAnswer, session.QuestionStartTime);
                    isCorrect = grade.IsCorrect;
                    points = grade.Score;
                }

                // Make sure every player has a standings entry, then add this round's gains.
                session.PlayerScores.AddOrUpdate(p.Username, points, (_, total) => total + points);
                session.PlayerCorrect.AddOrUpdate(p.Username, isCorrect ? 1 : 0, (_, total) => total + (isCorrect ? 1 : 0));

                playerResults.Add(new PlayerRoundResult
                {
                    Username = p.Username,
                    Answered = answered,
                    IsCorrect = isCorrect,
                    PointsAwarded = points,
                    TotalScore = session.PlayerScores.GetValueOrDefault(p.Username),
                });
            }

            return new QuestionResult
            {
                Index = index,
                QuestionId = round.QuestionId,
                Players = playerResults,
                Scoreboard = BuildScoreboard(session),
            };
        }

        // Maps a stored submission to the UserAnswer shape AnswerGradingService grades. Multiple
        // choice answers arrive as an option id; true/false and type-the-answer arrive as text.
        private static UserAnswer BuildUserAnswer(RoundQuestion round, RoundAnswer submission, DateTime startTime)
        {
            // Score on the latency-compensated elapsed time, mirroring single player
            // (SubmitAnswerService.CreateUserAnswer): prefer the player's own validated think-time
            // measurement so ping doesn't decide close rounds; fall back to the server window.
            var serverElapsed = submission.SubmittedUtc - startTime;
            var effectiveElapsed = QuizTiming.EffectiveElapsed(serverElapsed, submission.ClientElapsedMs);

            var userAnswer = new UserAnswer
            {
                QuestionStartTime = startTime,
                SubmittedTime = startTime + effectiveElapsed,
                Status = AnswerStatus.Pending,
            };

            if (round.Type == QuestionType.MultipleChoice.ToString()
                && int.TryParse(submission.Raw, out var optionId))
            {
                userAnswer.SelectedOptionId = optionId;
            }
            else
            {
                userAnswer.SubmittedAnswer = submission.Raw;
            }

            return userAnswer;
        }

        private async Task<List<RoundQuestion>> LoadRoundQuestionsAsync(int quizId)
        {
            using var scope = _scopeFactory.CreateScope();
            var quizzes = scope.ServiceProvider.GetRequiredService<IQuizRepository>();

            // ignoreFilters: the match runs in a background scope (no current user), and the host's
            // selection was already authorized in QuizHub.SelectQuiz, so it's safe to load an owned
            // Unlisted quiz's questions here.
            var quizQuestions = await quizzes.GetQuizQuestionsAsync(quizId, ignoreFilters: true);

            return quizQuestions.Select(qq => new RoundQuestion
            {
                QuizQuestionId = qq.Id,
                QuestionId = qq.QuestionId,
                Type = qq.Question.Type.ToString(),
                Text = qq.Question.Text,
                ImageUrl = qq.Question.ImageUrl,
                TimeLimitSeconds = qq.TimeLimitInSeconds,
                Options = qq.Question is MultipleChoiceQuestion mc
                    ? mc.AnswerOptions.Select(o => new RoundOption { Id = o.Id, Text = o.Text }).ToList()
                    : new List<RoundOption>(),
                AllowMultipleSelections = qq.Question is MultipleChoiceQuestion { AllowMultipleSelections: true },
            }).ToList();
        }

        private static RoundQuestionView ToView(RoundQuestion round, int index, int total) => new()
        {
            Index = index,
            Total = total,
            QuestionId = round.QuestionId,
            Type = round.Type,
            Text = round.Text,
            ImageUrl = round.ImageUrl,
            TimeLimitSeconds = round.TimeLimitSeconds,
            Options = round.Options,
            AllowMultipleSelections = round.AllowMultipleSelections,
        };

        private static List<ScoreboardEntry> BuildScoreboard(MultiplayerSession session) =>
            session.PlayerScores
                .Select(kv => new ScoreboardEntry
                {
                    Username = kv.Key,
                    Score = kv.Value,
                    Correct = session.PlayerCorrect.GetValueOrDefault(kv.Key),
                })
                .OrderByDescending(e => e.Score)
                .ThenByDescending(e => e.Correct)
                .ThenBy(e => e.Username)
                .ToList();

        private static MatchResult BuildMatchResult(MultiplayerSession session)
        {
            var scoreboard = BuildScoreboard(session);

            // Winner = top of the board, unless the top two are exactly tied (shared 1st → no single winner).
            string? winner = null;
            if (scoreboard.Count == 1)
                winner = scoreboard[0].Username;
            else if (scoreboard.Count > 1 &&
                     !(scoreboard[0].Score == scoreboard[1].Score && scoreboard[0].Correct == scoreboard[1].Correct))
                winner = scoreboard[0].Username;

            return new MatchResult { Scoreboard = scoreboard, WinnerUsername = winner };
        }
    }
}
