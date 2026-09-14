using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Data;
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
            //
            // One fresh seed per match. Unlike single-player — where the DTO is rebuilt on every
            // poll and the order therefore has to be re-derivable — this list is materialised once
            // and held in memory for the whole match, so the shuffle happens exactly once. Every
            // player in the match is served from this one list and so sees the same board (they
            // are talking to each other; "it's the third one" has to mean the same thing to all of
            // them), and the next match in the same lobby gets a different seed and a new order.
            var loaded = await LoadRoundQuestionsAsync(quizId, Guid.NewGuid().ToString());
            session.Questions = loaded.Questions;
            if (session.Questions.Count == 0)
                throw new InvalidOperationException("This quiz has no questions.");

            // ── What this match will be written down as, decided now rather than at the end ──
            // The version, because the author may edit the quiz while it is being played. The host,
            // because they may have left by the time there is a match to record — and a match row
            // needs a host. Both are cheap here, before the countdown, and impossible later.
            session.MatchQuizVersion = loaded.QuizVersion;
            session.MatchStartedUtc = DateTime.UtcNow;
            session.RecordedAnswers.Clear();

            using (var scope = _scopeFactory.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                var host = await users.GetByUsernameAsync(session.HostUsername)
                    ?? throw new InvalidOperationException("The host's account could not be found.");
                session.MatchHostUserId = host.Id;
            }

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
            session.RecordedAnswers.Clear();

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

                // Written here and nowhere else: after the last round, before the lobby reset
                // below wipes the scoreboard this reads. A match that was cancelled or crashed
                // never reaches this line and therefore leaves no row at all, which is the
                // intended shape — half a match is not a record of anything.
                //
                // Its own try/catch: the match is over and the players have their results, so a
                // failed write must not read as "Match failed" in the log, and must not stop the
                // lobby from becoming startable again. What is lost is the record, which is worth
                // an error line of its own.
                try
                {
                    await PersistMatchAsync(sessionId, session);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Match {SessionId} finished but could not be recorded.", sessionId);
                }
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

                // The graded answer, kept rather than discarded — this is the row that will be
                // written at match end. Present-and-silent is recorded too, as TimedOut: a player
                // who sat out a question was there for it, and the review screen has to be able to
                // say so rather than showing the same blank it shows for someone who had left.
                UserAnswer recorded;

                if (answered && submission != null)
                {
                    var userAnswer = BuildUserAnswer(round, submission, session.QuestionStartTime);
                    var grade = await grading.GradeAnswerAsync(round.QuizQuestionId, userAnswer, session.QuestionStartTime);
                    isCorrect = grade.IsCorrect;
                    points = grade.Score;

                    userAnswer.QuizQuestionId = round.QuizQuestionId;
                    userAnswer.Status = grade.Status;
                    userAnswer.Score = grade.Score;
                    recorded = userAnswer;
                }
                else
                {
                    recorded = new UserAnswer
                    {
                        QuizQuestionId = round.QuizQuestionId,
                        Status = AnswerStatus.TimedOut,
                        Score = 0,
                        QuestionStartTime = session.QuestionStartTime,
                        SubmittedTime = null,
                    };
                }

                session.RecordedAnswers
                    .GetOrAdd(p.Username, _ => new ConcurrentDictionary<int, UserAnswer>())
                    [round.QuizQuestionId] = recorded;

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

        /// <summary>
        /// Writes the whole match: one <see cref="Match"/> header, one <see cref="QuizSession"/> per
        /// player, and every <see cref="UserAnswer"/> — the same tables single player writes, which
        /// is what lets analytics, personal stats and the results pages read a match without being
        /// taught what one is (docs/quiz/multiplayer.md §7).
        ///
        /// <para><b>Once, at the end, in one SaveChanges.</b> Per round would put a database round
        /// trip per player per question inside a loop the players are watching a timer in. It also
        /// means an interrupted match writes nothing rather than a partial record of itself.</para>
        ///
        /// <para><b>It touches DbContext directly</b> rather than going through repositories, for
        /// the reason <c>AccountClosureService</c> does: this is one atomic act across three tables,
        /// and routing it through per-entity repositories would spread a single transaction across
        /// interfaces that exist to serve unrelated read paths.</para>
        ///
        /// <para><b>A player who never answered anything gets no row.</b> Multiplayer counts toward
        /// personal stats, so a row of blanks scoring zero would drag down the average of someone
        /// who joined, saw one question and left — a game they did not play should not look like a
        /// game they played badly. The match still happened; they are simply not in it.</para>
        /// </summary>
        private async Task PersistMatchAsync(string sessionId, MultiplayerSession session)
        {
            if (!int.TryParse(session.SelectedQuizId, out var quizId))
                return;

            // "Played" means submitted something. Everyone else — present and silent throughout,
            // or gone after the first question — leaves no session row.
            var played = session.RecordedAnswers
                .Where(kv => kv.Value.Values.Any(a => a.SubmittedTime is not null))
                .ToDictionary(kv => kv.Key, kv => kv.Value);

            if (played.Count == 0)
                return;

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // The match loop knows players by username; the tables know them by id. Resolved in one
            // query, through the ordinary filter: an account closed or removed mid-match drops out
            // here rather than being written into a permanent record.
            var immutableNames = played.Keys.Select(n => n.ToLowerInvariant()).ToList();
            var userIds = await db.Users
                .Where(u => immutableNames.Contains(u.ImmutableName))
                .ToDictionaryAsync(u => u.ImmutableName, u => u.Id);

            var endedAt = DateTime.UtcNow;
            var winnerUsername = BuildMatchResult(session).WinnerUsername;

            var match = new Match
            {
                Id = Guid.NewGuid(),
                QuizId = quizId,
                QuizVersion = session.MatchQuizVersion,
                RoomCode = sessionId,
                HostUserId = session.MatchHostUserId,
                StartedAt = session.MatchStartedUtc,
                EndedAt = endedAt,
                // Null on a tie — BuildMatchResult returns no winner when the top two are level,
                // and that is the same answer the players were just shown.
                WinnerUserId = winnerUsername is not null
                    && userIds.TryGetValue(winnerUsername.ToLowerInvariant(), out var winnerId)
                        ? winnerId
                        : null,
            };
            db.Matches.Add(match);

            var everyQuestionId = session.Questions.Select(q => q.QuizQuestionId).ToList();

            foreach (var (username, answers) in played)
            {
                if (!userIds.TryGetValue(username.ToLowerInvariant(), out var userId))
                    continue;   // account gone mid-match; the other players' rows still land

                var quizSession = new QuizSession
                {
                    Id = Guid.NewGuid(),
                    QuizId = quizId,
                    UserId = userId,
                    StartTime = session.MatchStartedUtc,
                    EndTime = endedAt,
                    TotalScore = session.PlayerScores.GetValueOrDefault(username),
                    IsCompleted = true,
                    QuizVersion = session.MatchQuizVersion,
                    Mode = QuizSessionMode.Multiplayer,
                    Match = match,
                };

                // Every question gets a row, in the match's order, for every player who stayed and
                // for every player who did not. A missing entry means they were no longer in the
                // room, which NotAnswered records — the review screen reads the difference between
                // that and TimedOut and can say "left" instead of showing silent blanks.
                foreach (var quizQuestionId in everyQuestionId)
                {
                    if (answers.TryGetValue(quizQuestionId, out var recorded))
                    {
                        quizSession.UserAnswers.Add(recorded);
                        continue;
                    }

                    quizSession.UserAnswers.Add(new UserAnswer
                    {
                        QuizQuestionId = quizQuestionId,
                        Status = AnswerStatus.NotAnswered,
                        Score = 0,
                        // The round they were absent for has no start time we kept; the match's own
                        // start is the honest stand-in, and nothing reads it for an unanswered row.
                        QuestionStartTime = session.MatchStartedUtc,
                        SubmittedTime = null,
                    });
                }

                db.QuizSessions.Add(quizSession);
            }

            await db.SaveChangesAsync();

            _logger.LogInformation(
                "Match {SessionId} recorded as {MatchId}: {Players} player session(s), {Questions} question(s).",
                sessionId, match.Id, played.Count, everyQuestionId.Count);
        }

        private async Task<(List<RoundQuestion> Questions, int QuizVersion)> LoadRoundQuestionsAsync(
            int quizId, string matchSeed)
        {
            using var scope = _scopeFactory.CreateScope();
            var quizzes = scope.ServiceProvider.GetRequiredService<IQuizRepository>();

            // ignoreFilters: the match runs in a background scope (no current user), and the host's
            // selection was already authorized in QuizHub.SelectQuiz, so it's safe to load an owned
            // Unlisted quiz's questions here.
            var quizQuestions = await quizzes.GetQuizQuestionsAsync(quizId, ignoreFilters: true);

            // Quiz.ShuffleQuestions is read here for the first time since the column was added.
            // Unfiltered for the same reason as above: no current user in this scope.
            var quiz = await quizzes.GetByIdUnfilteredAsync(quizId);
            if (quiz?.ShuffleQuestions == true)
                quizQuestions = DeterministicShuffle.By(quizQuestions, matchSeed, qq => qq.Id);

            var questions = quizQuestions.Select(qq => new RoundQuestion
            {
                QuizQuestionId = qq.Id,
                QuestionId = qq.QuestionId,
                Type = qq.Question.Type.ToString(),
                Text = qq.Question.Text,
                ImageUrl = qq.Question.ImageUrl,
                TimeLimitSeconds = qq.TimeLimitInSeconds,
                // Options were served in stored order, which is authoring order, which for a
                // model-written question is correct-answer-first — 68% of them, measured. Seeded
                // per question so two questions in a match do not share a permutation.
                Options = qq.Question is MultipleChoiceQuestion mc
                    ? DeterministicShuffle.By(
                        mc.AnswerOptions.Select(o => new RoundOption { Id = o.Id, Text = o.Text }),
                        $"{matchSeed}:{qq.Id}",
                        o => o.Id)
                    : new List<RoundOption>(),
                AllowMultipleSelections = qq.Question is MultipleChoiceQuestion { AllowMultipleSelections: true },
            }).ToList();

            // The version is returned with the questions because it has to be the version these
            // questions came from: reading it separately later would be a second answer to the
            // same question, free to disagree after an edit.
            return (questions, quiz?.Version ?? 1);
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
