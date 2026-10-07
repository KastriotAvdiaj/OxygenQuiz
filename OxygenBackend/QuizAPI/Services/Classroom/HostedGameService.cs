using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.DTOs.Classroom;
using QuizAPI.Exceptions;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Associations;

namespace QuizAPI.Services.Classroom
{
    public interface IHostedGameService
    {
        Task<HostedGameViewDTO> StartAsync(Guid hostId, StartHostedGameRequest request);
        Task<HostedGameViewDTO> GetAsync(Guid id, Guid hostId);
        Task<IReadOnlyList<HostedGameSummaryDTO>> ListAsync(Guid hostId);
        Task<HostedMoveResultDTO> OpenAsync(Guid id, Guid hostId, int tileId);
        Task<HostedMoveResultDTO> GuessAsync(Guid id, Guid hostId, string target, string text);
        Task<HostedMoveResultDTO> PassAsync(Guid id, Guid hostId);
        Task<HostedGameViewDTO> UndoAsync(Guid id, Guid hostId);
        Task<HostedGameViewDTO> PauseAsync(Guid id, Guid hostId);
        Task<HostedGameViewDTO> ResumeAsync(Guid id, Guid hostId);
        Task<HostedGameViewDTO> EndAsync(Guid id, Guid hostId);
        Task<HostedGameViewDTO> PlayAgainAsync(Guid id, Guid hostId, PlayHostedGameAgainRequest request);
        /// <summary>The game's Screen code, issued now if it has none.</summary>
        Task<HostedGameViewDTO> IssueScreenCodeAsync(Guid id, Guid hostId);
        /// <summary>Disconnects every Display and replaces the code (ADR 0024).</summary>
        Task<HostedGameViewDTO> DisconnectScreensAsync(Guid id, Guid hostId);
        /// <summary>A Display joining with a code: the game and its Display view, or null for no such live game.</summary>
        Task<(Guid GameId, HostedGameViewDTO View)?> GetForScreenCodeAsync(string code);
        /// <summary>A Display's view of a game by id — after it has joined with a valid code.</summary>
        Task<HostedGameViewDTO?> GetDisplayViewAsync(Guid id);
        /// <summary>Whether this user hosts this game — the hub's check before a Controller joins its group.</summary>
        Task<bool> IsHostAsync(Guid id, Guid userId);
        /// <summary>Pauses a running game (the Controller's tab closed). No-op when over or already paused.</summary>
        Task PauseIfRunningAsync(Guid id);
        /// <summary>Ends hosted games idle for <see cref="HostedGameService.AbandonAfter"/>. Returns how many.</summary>
        Task<int> EndIdleGamesAsync();
    }

    /// <summary>
    /// Host mode (docs/quiz/classroom.md): a Teacher plays a Board for 2–4 Teams on one screen.
    ///
    /// <para><b>The game is its move log</b> (ADR 0020), saved move by move like Solo, under the
    /// Duel's turn rules with one Seat per Team (ADR 0023). Undo appends a move that cancels the
    /// last one (ADR 0025).</para>
    ///
    /// <para><b>The clocks are this service's, not the engine's</b>, because they pause. While a game
    /// runs they are deadlines on the row; a pause freezes them and resume pushes them back. Every
    /// read and move first <i>settles</i> the game: a turn whose deadline has passed is recorded as
    /// <c>TurnExpired</c> (as many as have passed, in order), and a game clock that has run out
    /// starts the last round, which ends when the turn comes back to the Team that started (C6).
    /// The Controller asks again when its countdown reaches zero, so the screens move on time.</para>
    ///
    /// <para><b>Access:</b> a game is its host's; anyone else's id is "not found". The Teacher role
    /// and the preview gate are the controller's.</para>
    /// </summary>
    public class HostedGameService : IHostedGameService
    {
        public static readonly TimeSpan AbandonAfter = TimeSpan.FromDays(7);
        public const int MinGameSeconds = 300;
        public const int MaxGameSeconds = 3600;
        public static readonly int[] TurnSecondsOptions = { 30, 60, 90, 120 };
        public static readonly string[] Colours = { "red", "blue", "green", "yellow" };
        private static readonly string[] DefaultNames = { "Red", "Blue", "Green", "Yellow" };
        public const int MaxStudentsPerTeam = 40;

        /// <summary>No 0/O, 1/I/L: a code read off a phone and typed on a school PC.</summary>
        private const string CodeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

        private const string NotFound = "Game not found.";

        private readonly IHostedGameRepository _games;
        private readonly IAssociationBoardRepository _boards;
        private readonly IAssociationRulesProvider _rules;
        private readonly IHostedDisplayRegistry _screens;
        private readonly IHostedGameNotifier _notifier;
        private readonly TimeProvider _clock;

        public HostedGameService(
            IHostedGameRepository games, IAssociationBoardRepository boards, IAssociationRulesProvider rules,
            IHostedDisplayRegistry screens, IHostedGameNotifier notifier, TimeProvider clock)
        {
            _games = games;
            _boards = boards;
            _rules = rules;
            _screens = screens;
            _notifier = notifier;
            _clock = clock;
        }

        private DateTime Now()
        {
            var now = _clock.GetUtcNow().UtcDateTime;
            return new DateTime(now.Ticks - now.Ticks % TimeSpan.TicksPerMillisecond, DateTimeKind.Utc);
        }

        // ── Start ──────────────────────────────────────────────────────────

        public async Task<HostedGameViewDTO> StartAsync(Guid hostId, StartHostedGameRequest request)
        {
            var teams = ValidateTeams(request.Teams);
            ValidateClocks(request.GameSeconds, request.TurnSeconds);
            var firstSeat = RandomNumberGenerator.GetInt32(teams.Count);
            var game = await CreateAsync(hostId, request.QuizId, request.ShareToken, teams, request.GameSeconds, request.TurnSeconds, firstSeat);
            return await ViewAsync(game, hostId);
        }

        private async Task<AssociationGame> CreateAsync(
            Guid hostId, int quizId, string? shareToken, List<HostedTeam> teams, int? gameSeconds, int? turnSeconds, int firstSeat)
        {
            var quiz = await _games.GetQuizAsync(quizId);
            // Any board the Teacher could play, and their own in any status (C10) — IsPlayAuthorized
            // already lets an owner play their own. Same answer for missing and forbidden.
            if (quiz is null || !QuizPlayAccess.IsPlayAuthorized(quiz, hostId, shareToken))
                throw new NotFoundException("Quiz not found or not available.");
            QuizFormatGuard.EnsureFormat(quiz.Format, QuizFormat.Associations);

            var board = await _boards.GetForVersionAsync(quiz.Id, quiz.Version)
                ?? throw new AppValidationException("This quiz has no board to play.");
            var rules = _rules.GetRulesFor(quiz.Id);
            var now = Now();

            var game = new AssociationGame
            {
                Id = Guid.NewGuid(),
                BoardId = board.Id,
                PlayStyle = PlayStyle.Hosted,
                HostUserId = hostId,
                SeatCount = teams.Count,
                FirstSeat = firstSeat,
                StartedAt = now,
                RulesJson = rules.ToJson(),
                GameSeconds = gameSeconds,
                TurnSeconds = turnSeconds,
                GameDeadlineUtc = gameSeconds is int g ? now.AddSeconds(g) : null,
                TurnDeadlineUtc = turnSeconds is int t ? now.AddSeconds(t) : null,
                LastActivityAt = now,
            };
            foreach (var team in teams)
            {
                team.GameId = game.Id;
                game.Teams.Add(team);
            }
            _games.AddGame(game);
            await _games.SaveChangesAsync();

            game.Board = board;
            return game;
        }

        private static List<HostedTeam> ValidateTeams(List<HostedTeamInput>? input)
        {
            var teams = input ?? new();
            if (teams.Count is < AssociationEngine.MinHostedSeats or > AssociationEngine.MaxHostedSeats)
                throw new AppValidationException($"A hosted game has {AssociationEngine.MinHostedSeats} to {AssociationEngine.MaxHostedSeats} teams.");

            var result = new List<HostedTeam>();
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var teamsWithStudents = 0;
            for (var seat = 0; seat < teams.Count; seat++)
            {
                var name = ClassService.Clean(teams[seat].Name);
                if (name.Length == 0) name = DefaultNames[seat];
                if (name.Length > HostedTeam.MaxNameLength)
                    throw new AppValidationException($"A team name can be at most {HostedTeam.MaxNameLength} characters.");
                if (!names.Add(name))
                    throw new AppValidationException($"Two teams are called \"{name}\".");

                var colour = teams[seat].Colour?.Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(colour)) colour = Colours[seat];
                if (!Colours.Contains(colour))
                    throw new AppValidationException("A team's colour is red, blue, green or yellow.");

                var students = (teams[seat].Students ?? new()).Select(ClassService.Clean).Where(s => s.Length > 0).ToList();
                if (students.Count > MaxStudentsPerTeam)
                    throw new AppValidationException($"A team can have at most {MaxStudentsPerTeam} students.");
                if (students.Any(s => s.Length > Models.Classroom.ClassStudent.MaxNameLength))
                    throw new AppValidationException($"A student's name can be at most {Models.Classroom.ClassStudent.MaxNameLength} characters.");

                if (students.Count > 0) teamsWithStudents++;
                result.Add(new HostedTeam { Seat = seat, Name = name, Colour = colour, StudentsJson = JsonSerializer.Serialize(students) });
            }
            if (result.Select(t => t.Colour).Distinct().Count() != result.Count)
                throw new AppValidationException("Each team needs its own colour.");
            // Students on every team, or on none. "None" is a game without a Class — teams are just
            // names. "Some" is a Class split unevenly, and an empty team would take turns with
            // nobody to play them. The request carries no class id, so this is the rule the
            // server can see; the setup form also stops more teams than students.
            if (teamsWithStudents > 0 && teamsWithStudents < result.Count)
                throw new AppValidationException("Every team needs at least one student.");
            return result;
        }

        private static void ValidateClocks(int? gameSeconds, int? turnSeconds)
        {
            if (gameSeconds is null && turnSeconds is null) return;   // No time limit
            if (gameSeconds is null || turnSeconds is null)
                throw new AppValidationException("A timed game needs both a game time and a turn time.");
            if (gameSeconds is < MinGameSeconds or > MaxGameSeconds)
                throw new AppValidationException($"The game time is {MinGameSeconds / 60} to {MaxGameSeconds / 60} minutes.");
            if (!TurnSecondsOptions.Contains(turnSeconds.Value))
                throw new AppValidationException("The turn time is 30, 60, 90 or 120 seconds.");
        }

        // ── Reads ──────────────────────────────────────────────────────────

        public async Task<HostedGameViewDTO> GetAsync(Guid id, Guid hostId)
        {
            var loaded = await LoadAsync(id, hostId);
            var changed = Settle(loaded);
            await _games.SaveChangesAsync();
            if (changed) await NotifyAsync(loaded);
            return Build(loaded, forController: true);
        }

        public async Task<IReadOnlyList<HostedGameSummaryDTO>> ListAsync(Guid hostId)
        {
            var games = await _games.ListForHostAsync(hostId);
            var titles = await _games.GetQuizTitlesAsync(games.Select(g => g.Board.QuizId).Distinct().ToList());
            return games.Select(game =>
            {
                var loaded = Replay(game);
                var view = Build(loaded, forController: false);
                return new HostedGameSummaryDTO
                {
                    Id = game.Id,
                    QuizId = game.Board.QuizId,
                    QuizTitle = titles.GetValueOrDefault(game.Board.QuizId, string.Empty),
                    StartedAt = game.StartedAt,
                    EndedAt = game.EndedAt,
                    IsOver = loaded.State.IsOver,
                    IsPaused = view.IsPaused,
                    EndReason = loaded.State.EndReason?.ToString(),
                    Teams = view.Teams,
                };
            }).ToList();
        }

        public async Task<bool> IsHostAsync(Guid id, Guid userId) => await _games.GetAsync(id, userId) is not null;

        // ── Moves ──────────────────────────────────────────────────────────

        public Task<HostedMoveResultDTO> OpenAsync(Guid id, Guid hostId, int tileId) =>
            MoveAsync(id, hostId, (seat, at) => AssociationMove.Open(seat, tileId, at));

        public Task<HostedMoveResultDTO> GuessAsync(Guid id, Guid hostId, string target, string text)
        {
            if (!AssociationMoveInput.TryParseTarget(target, out var parsed))
                throw new AppValidationException(AssociationMoveInput.BadTarget);
            if (AssociationMoveInput.CheckGuess(text, out var trimmed) is string problem)
                throw new AppValidationException(problem);
            return MoveAsync(id, hostId, (seat, at) => AssociationMove.Guess(seat, parsed, trimmed, at));
        }

        public Task<HostedMoveResultDTO> PassAsync(Guid id, Guid hostId) =>
            MoveAsync(id, hostId, (seat, at) => AssociationMove.Pass(seat, at));

        private async Task<HostedMoveResultDTO> MoveAsync(Guid id, Guid hostId, Func<int, DateTime, AssociationMove> makeMove)
        {
            var loaded = await LoadAsync(id, hostId);
            var seatBefore = loaded.State.CurrentSeat;
            var settled = Settle(loaded);

            if (loaded.State.IsOver)
            {
                if (settled)
                {
                    await SaveAsync();
                    await NotifyAsync(loaded);
                    return new HostedMoveResultDTO { Game = Build(loaded, forController: true) };
                }
                throw new AppValidationException("This game is already over.");
            }
            if (loaded.Game.PausedAt is not null)
                throw new AppValidationException("The game is paused. Resume it first.");
            if (settled && loaded.State.CurrentSeat != seatBefore)
            {
                // The turn ran out before this move arrived: it is refused, and the screens move on.
                await SaveAsync();
                await NotifyAsync(loaded);
                throw new AppValidationException($"Time ran out — it's {TeamName(loaded, loaded.State.CurrentSeat)}'s turn.");
            }

            var now = Now();
            var move = makeMove(loaded.State.CurrentSeat, now);
            var outcome = Apply(loaded, move, now);
            if (!outcome.Accepted)
            {
                if (settled) { await SaveAsync(); await NotifyAsync(loaded); }
                throw new AppValidationException(AssociationMoveInput.Describe(outcome.Rejection!.Value));
            }

            await SaveAsync();
            await NotifyAsync(loaded);
            return new HostedMoveResultDTO
            {
                Game = Build(loaded, forController: true),
                IsCorrect = outcome.IsCorrect,
                Points = outcome.Points,
            };
        }

        public async Task<HostedGameViewDTO> UndoAsync(Guid id, Guid hostId)
        {
            var loaded = await LoadAsync(id, hostId);
            Settle(loaded);
            if (loaded.State.IsOver) throw new AppValidationException("This game is already over.");
            if (loaded.Game.PausedAt is not null) throw new AppValidationException("The game is paused. Resume it first.");

            var last = UndoableMove(loaded.Game)
                ?? throw new AppValidationException("There's nothing to undo.");
            var now = Now();
            var record = new AssociationGameMove
            {
                GameId = loaded.Game.Id,
                Seq = NextSeq(loaded.Game),
                Seat = last.Seat,
                Kind = MoveKind.Undo,
                CancelsSeq = last.Seq,
                At = now,
            };
            _games.AddMove(record);
            if (!loaded.Game.Moves.Contains(record)) loaded.Game.Moves.Add(record);
            loaded.Game.LastActivityAt = now;
            // The clock doesn't give time back (ADR 0025): the deadline stays where it is.
            Reload(loaded);

            await SaveAsync();
            await NotifyAsync(loaded);
            return Build(loaded, forController: true);
        }

        public async Task<HostedGameViewDTO> PauseAsync(Guid id, Guid hostId)
        {
            var loaded = await LoadAsync(id, hostId);
            Settle(loaded);
            if (!loaded.State.IsOver && loaded.Game.PausedAt is null)
            {
                loaded.Game.PausedAt = Now();
                loaded.Game.LastActivityAt = loaded.Game.PausedAt;
            }
            await SaveAsync();
            await NotifyAsync(loaded);
            return Build(loaded, forController: true);
        }

        public async Task<HostedGameViewDTO> ResumeAsync(Guid id, Guid hostId)
        {
            var loaded = await LoadAsync(id, hostId);
            if (!loaded.State.IsOver && loaded.Game.PausedAt is DateTime pausedAt)
            {
                var now = Now();
                var paused = now - pausedAt;
                // Push both clocks back by the pause: no time is lost to the bell.
                if (loaded.Game.GameDeadlineUtc is DateTime g) loaded.Game.GameDeadlineUtc = g + paused;
                if (loaded.Game.TurnDeadlineUtc is DateTime t) loaded.Game.TurnDeadlineUtc = t + paused;
                loaded.Game.PausedAt = null;
                loaded.Game.LastActivityAt = now;
            }
            await SaveAsync();
            await NotifyAsync(loaded);
            return Build(loaded, forController: true);
        }

        public async Task PauseIfRunningAsync(Guid id)
        {
            var game = await _games.GetByIdAsync(id);
            if (game?.HostUserId is not Guid host) return;
            var loaded = Replay(game);
            Settle(loaded);
            if (!loaded.State.IsOver && game.PausedAt is null)
            {
                game.PausedAt = Now();
                game.LastActivityAt = game.PausedAt;
            }
            await SaveAsync();
            await NotifyAsync(loaded);
        }

        public async Task<HostedGameViewDTO> EndAsync(Guid id, Guid hostId)
        {
            var loaded = await LoadAsync(id, hostId);
            Settle(loaded);
            if (!loaded.State.IsOver)
                Finish(loaded, GameEndReason.EndedByHost, Now());
            await SaveAsync();
            await NotifyAsync(loaded);
            return Build(loaded, forController: true);
        }

        // ── Play again ─────────────────────────────────────────────────────

        public async Task<HostedGameViewDTO> PlayAgainAsync(Guid id, Guid hostId, PlayHostedGameAgainRequest request)
        {
            var loaded = await LoadAsync(id, hostId);
            var old = loaded.Game;
            Settle(loaded);
            if (!loaded.State.IsOver) Finish(loaded, GameEndReason.EndedByHost, Now());
            await SaveAsync();
            await NotifyAsync(loaded);

            var teams = old.Teams.OrderBy(t => t.Seat)
                .Select(t => new HostedTeam { Seat = t.Seat, Name = t.Name, Colour = t.Colour, StudentsJson = t.StudentsJson })
                .ToList();
            // The Team after the one that started last time starts (C14).
            var firstSeat = (old.FirstSeat + 1) % old.SeatCount;
            var quizId = request.QuizId ?? old.Board.QuizId;
            var game = await CreateAsync(hostId, quizId, request.ShareToken, teams, old.GameSeconds, old.TurnSeconds, firstSeat);
            return await ViewAsync(game, hostId);
        }

        // ── Screens ────────────────────────────────────────────────────────

        public async Task<HostedGameViewDTO> IssueScreenCodeAsync(Guid id, Guid hostId)
        {
            var loaded = await LoadAsync(id, hostId);
            Settle(loaded);
            if (loaded.State.IsOver) throw new AppValidationException("This game is already over.");
            loaded.Game.ScreenCode ??= await NewCodeAsync();
            await SaveAsync();
            return Build(loaded, forController: true);
        }

        public async Task<HostedGameViewDTO> DisconnectScreensAsync(Guid id, Guid hostId)
        {
            var loaded = await LoadAsync(id, hostId);
            Settle(loaded);
            loaded.Game.ScreenCode = loaded.State.IsOver ? null : await NewCodeAsync();
            await SaveAsync();
            await _notifier.DisplaysRevokedAsync(_screens.RemoveDisplays(id));
            return Build(loaded, forController: true);
        }

        public async Task<(Guid GameId, HostedGameViewDTO View)?> GetForScreenCodeAsync(string code)
        {
            var normalised = NormaliseCode(code);
            if (normalised is null) return null;
            var game = await _games.GetByScreenCodeAsync(normalised);
            if (game is null) return null;
            var loaded = Replay(game);
            var changed = Settle(loaded);
            if (changed) await SaveAsync();
            // A finished game's code stops working (ADR 0024); a Display already connected keeps the
            // final screen, but a new one can't join.
            if (loaded.State.IsOver && !changed) return null;
            return (game.Id, Build(loaded, forController: false));
        }

        public async Task<HostedGameViewDTO?> GetDisplayViewAsync(Guid id)
        {
            var game = await _games.GetByIdAsync(id);
            if (game is null) return null;
            var loaded = Replay(game);
            if (Settle(loaded)) await SaveAsync();
            return Build(loaded, forController: false);
        }

        /// <summary>Upper-cased, separators and spaces dropped; null if it can't be a code.</summary>
        internal static string? NormaliseCode(string? code)
        {
            var cleaned = new string((code ?? string.Empty).Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
            return cleaned.Length == HostedTeam.ScreenCodeLength ? cleaned : null;
        }

        private async Task<string> NewCodeAsync()
        {
            for (var attempt = 0; attempt < 10; attempt++)
            {
                var code = new string(Enumerable.Range(0, HostedTeam.ScreenCodeLength)
                    .Select(_ => CodeAlphabet[RandomNumberGenerator.GetInt32(CodeAlphabet.Length)]).ToArray());
                if (!await _games.ScreenCodeExistsAsync(code)) return code;
            }
            throw new InvalidOperationException("Could not find a free screen code.");
        }

        // ── Abandonment ────────────────────────────────────────────────────

        public async Task<int> EndIdleGamesAsync()
        {
            var now = Now();
            var idle = await _games.GetIdleAsync(now - AbandonAfter);
            foreach (var game in idle)
            {
                var loaded = Replay(game);
                Settle(loaded);
                if (!loaded.State.IsOver) Finish(loaded, GameEndReason.Abandoned, now);
            }
            if (idle.Count > 0) await SaveAsync();
            return idle.Count;
        }

        // ── Loading, settling, applying ────────────────────────────────────

        private sealed class Loaded
        {
            public required AssociationGame Game { get; init; }
            public required BoardKey Key { get; init; }
            public required AssociationRules Rules { get; init; }
            public required AssociationState State { get; set; }
        }

        private async Task<Loaded> LoadAsync(Guid id, Guid hostId)
        {
            var game = await _games.GetAsync(id, hostId) ?? throw new NotFoundException(NotFound);
            return Replay(game);
        }

        private static Loaded Replay(AssociationGame game)
        {
            var loaded = new Loaded
            {
                Game = game,
                Key = AssociationBoardMapping.ToKey(game.Board),
                Rules = AssociationRules.FromJson(game.RulesJson),
                State = null!,
            };
            Reload(loaded);
            return loaded;
        }

        /// <summary>Rebuilds the state from the log — after an Undo, which no single Apply expresses.</summary>
        private static void Reload(Loaded loaded)
        {
            var game = loaded.Game;
            var start = AssociationEngine.StartHosted(game.StartedAt, game.SeatCount, game.FirstSeat);
            var moves = game.Moves.OrderBy(m => m.Seq).Select(m => new AssociationMove(m.Seat, m.Kind, m.At, m.TileId, m.Target, m.GuessText, m.CancelsSeq));
            var serverEnd = game.EndReason is GameEndReason.TimeUp or GameEndReason.Abandoned or GameEndReason.EndedByHost
                ? game.EndReason
                : null;
            loaded.State = AssociationEngine.Replay(start, loaded.Key, loaded.Rules, moves, serverEnd);
        }

        /// <summary>
        /// Brings a timed, running game up to now: the game clock starting the last round, and every
        /// turn that has run out recorded as <c>TurnExpired</c>, in the order they happened. Returns
        /// whether anything changed. Paused and untimed games have nothing to settle.
        /// </summary>
        private bool Settle(Loaded loaded)
        {
            var game = loaded.Game;
            if (loaded.State.IsOver || game.PausedAt is not null || game.TurnSeconds is not int turnSeconds) return false;

            var now = Now();
            var changed = false;
            // Bounded: a game left running is caught up turn by turn, but the endgame or the last
            // round ends it within a few dozen turns; the cap only guards against a bug looping.
            for (var guard = 0; guard < 500 && !loaded.State.IsOver; guard++)
            {
                var turnDue = game.TurnDeadlineUtc;
                var gameDue = game.LastRound ? null : game.GameDeadlineUtc;
                var next = Min(turnDue, gameDue);
                if (next is not DateTime at || at > now) break;

                if (gameDue is DateTime g && g <= at && (turnDue is null || g <= turnDue))
                {
                    game.LastRound = true;
                    changed = true;
                    continue;
                }

                var outcome = Apply(loaded, AssociationMove.TurnExpired(loaded.State.CurrentSeat, at), at);
                if (!outcome.Accepted) break;
                game.TurnDeadlineUtc ??= at.AddSeconds(turnSeconds);
                changed = true;
            }
            return changed;
        }

        private static DateTime? Min(DateTime? a, DateTime? b) =>
            a is null ? b : b is null ? a : (a < b ? a : b);

        /// <summary>
        /// Applies one move, appends it, and runs the clock rules that follow it: a new turn or a
        /// correct Guess restarts the turn clock, and in the last round the game ends when the turn
        /// comes back to the first Team.
        /// </summary>
        private MoveOutcome Apply(Loaded loaded, AssociationMove move, DateTime at)
        {
            var game = loaded.Game;
            var outcome = AssociationEngine.Apply(loaded.State, loaded.Key, loaded.Rules, move);
            if (!outcome.Accepted) return outcome;

            var record = new AssociationGameMove
            {
                GameId = game.Id,
                Seq = NextSeq(game),
                Seat = move.Seat,
                Kind = move.Kind,
                TileId = move.TileId,
                Target = move.Target,
                GuessText = move.GuessText,
                IsCorrect = outcome.IsCorrect,
                Points = outcome.Points,
                At = at,
            };
            _games.AddMove(record);
            if (!game.Moves.Contains(record)) game.Moves.Add(record);
            loaded.State = outcome.State;
            if (move.Kind != MoveKind.TurnExpired) game.LastActivityAt = at;

            if (outcome.GameEnded is GameEndReason reason)
            {
                Finish(loaded, reason, at);
                return outcome;
            }

            if (game.LastRound && outcome.TurnPassed && loaded.State.CurrentSeat == game.FirstSeat)
            {
                Finish(loaded, GameEndReason.TimeUp, at);
                return outcome;
            }

            if (game.TurnSeconds is int turnSeconds && (outcome.TurnPassed || outcome.IsCorrect == true))
                game.TurnDeadlineUtc = at.AddSeconds(turnSeconds);
            return outcome;
        }

        private static void Finish(Loaded loaded, GameEndReason reason, DateTime at)
        {
            var game = loaded.Game;
            // An ending a move reached is already in the state; a server-decided one is applied here
            // and stored, for replay to reapply.
            if (!loaded.State.IsOver) loaded.State = AssociationEngine.End(loaded.State, reason);
            game.EndReason = loaded.State.EndReason;
            game.EndedAt = at;
            game.PausedAt = null;
            game.TurnDeadlineUtc = null;
            // The code dies with the game (ADR 0024); connected Displays keep the final screen.
            game.ScreenCode = null;
        }

        private static int NextSeq(AssociationGame game) => game.Moves.Count == 0 ? 1 : game.Moves.Max(m => m.Seq) + 1;

        /// <summary>The last move, if the Teacher may take it back: an Open, Guess or Pass not already undone.</summary>
        private static AssociationGameMove? UndoableMove(AssociationGame game)
        {
            var last = game.Moves.OrderBy(m => m.Seq).LastOrDefault();
            return last?.Kind is MoveKind.OpenTile or MoveKind.Guess or MoveKind.Pass ? last : null;
        }

        private static string TeamName(Loaded loaded, int seat) =>
            loaded.Game.Teams.FirstOrDefault(t => t.Seat == seat)?.Name ?? $"Team {seat + 1}";

        private static string? UndoLabel(Loaded loaded)
        {
            var last = UndoableMove(loaded.Game);
            if (last is null || loaded.State.IsOver) return null;
            var team = TeamName(loaded, last.Seat);
            return last.Kind switch
            {
                MoveKind.OpenTile => $"{team} opened {TileName(loaded.Game.Board, last.TileId)}",
                MoveKind.Guess => $"{team} guessed {(last.Target == GuessTarget.Final ? "the final" : last.Target.ToString())}: {last.GuessText}",
                _ => $"{team} passed",
            };
        }

        private static string TileName(AssociationBoard board, int? tileId)
        {
            foreach (var column in board.Columns)
                foreach (var tile in column.Tiles)
                    if (tile.Id == tileId)
                        return $"{(char)('A' + column.Position)}{tile.Position + 1}";
            return "a tile";
        }

        private async Task SaveAsync()
        {
            try
            {
                await _games.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // The unique (GameId, Seq) index: another request appended this move first — a double
                // tap, or the Controller open in two tabs.
                throw new ConflictException("The board changed in the meantime. Refresh to see where it stands.");
            }
        }

        private async Task<HostedGameViewDTO> ViewAsync(AssociationGame game, Guid hostId)
        {
            var loaded = Replay(game);
            await Task.CompletedTask;
            return Build(loaded, forController: true);
        }

        private HostedGameViewDTO Build(Loaded loaded, bool forController)
        {
            var view = AssociationViews.BuildHosted(loaded.Game, loaded.Game.Board, loaded.State, loaded.Rules, Now(),
                forController, _screens.DisplayCount(loaded.Game.Id), forController ? UndoLabel(loaded) : null);
            return view;
        }

        private Task NotifyAsync(Loaded loaded) =>
            _notifier.GameChangedAsync(loaded.Game.Id, Build(loaded, forController: false));
    }
}
