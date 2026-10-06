using System.Text.Json;

namespace QuizAPI.Services.Associations
{
    /// <summary>
    /// Every tunable number in an Associations game, travelling together as one value.
    ///
    /// <para><b>Nothing in the engine or the scoring is a literal.</b> They take an
    /// <see cref="AssociationRules"/> as a parameter, so changing a number here — or, later, letting
    /// an author override one per quiz — changes no code that computes a score or runs a turn.
    /// Where a game's rules come from is <see cref="IAssociationRulesProvider"/>.</para>
    ///
    /// <para><b>A game keeps its own copy.</b> Scores are recomputed by replaying a game's moves, so
    /// the rules a game was played under are snapshotted onto it at the start
    /// (<see cref="ToJson"/>) and replay reads the snapshot, never the current configuration.
    /// Otherwise changing <see cref="FinalBase"/> would silently rewrite every past game's
    /// score.</para>
    ///
    /// See docs/quiz/associations.md, "Scoring" and "Rules are settings".
    /// </summary>
    public sealed record AssociationRules
    {
        /// <summary>Points for a Column solution — the "main tile", worth more than any one Tile.</summary>
        public int ColumnBase { get; init; } = 5;

        /// <summary>Extra points per Tile of that Column still closed when it is solved.</summary>
        public int PerClosedTile { get; init; } = 1;

        /// <summary>Points for the Final solution, before the unsolved Columns it collects.</summary>
        public int FinalBase { get; init; } = 10;

        /// <summary>Length of a Duel turn. Restarts after each correct Guess.</summary>
        public int DuelTurnSeconds { get; init; } = 30;

        /// <summary>
        /// Once every Tile is open, how many guess-only turns each Seat gets before the Duel ends.
        /// At least 1 — with 0 a board nobody solved would end the moment the last Tile opened.
        /// </summary>
        public int EndgameTurnsPerSeat { get; init; } = 2;

        /// <summary>Board time the builder proposes for a new Solo board.</summary>
        public int SoloDefaultBoardSeconds { get; init; } = 240;

        /// <summary>Shortest board time an author may set.</summary>
        public int SoloMinBoardSeconds { get; init; } = 60;

        /// <summary>Longest board time an author may set.</summary>
        public int SoloMaxBoardSeconds { get; init; } = 1800;

        /// <summary>The defaults, as documented. What a game gets when nothing is configured.</summary>
        public static AssociationRules Default { get; } = new();

        /// <summary>
        /// Every reason these rules can't run a game; empty when they can. Checked at startup for
        /// the configured rules (a bad value fails the boot, not the first game), and would be
        /// checked for any per-quiz override the same way.
        /// </summary>
        public IReadOnlyList<string> Validate()
        {
            var errors = new List<string>();
            if (ColumnBase < 0) errors.Add($"{nameof(ColumnBase)} can't be negative.");
            if (PerClosedTile < 0) errors.Add($"{nameof(PerClosedTile)} can't be negative.");
            if (FinalBase < 0) errors.Add($"{nameof(FinalBase)} can't be negative.");
            if (DuelTurnSeconds < 5) errors.Add($"{nameof(DuelTurnSeconds)} must be at least 5.");
            if (EndgameTurnsPerSeat < 1) errors.Add($"{nameof(EndgameTurnsPerSeat)} must be at least 1.");
            if (SoloMinBoardSeconds < 10) errors.Add($"{nameof(SoloMinBoardSeconds)} must be at least 10.");
            if (SoloMaxBoardSeconds < SoloMinBoardSeconds)
                errors.Add($"{nameof(SoloMaxBoardSeconds)} can't be less than {nameof(SoloMinBoardSeconds)}.");
            if (SoloDefaultBoardSeconds < SoloMinBoardSeconds || SoloDefaultBoardSeconds > SoloMaxBoardSeconds)
                errors.Add($"{nameof(SoloDefaultBoardSeconds)} must be between {nameof(SoloMinBoardSeconds)} and {nameof(SoloMaxBoardSeconds)}.");
            return errors;
        }

        private static readonly JsonSerializerOptions Json = new() { WriteIndented = false };

        /// <summary>The snapshot stored on a game (<c>AssociationGame.RulesJson</c>).</summary>
        public string ToJson() => JsonSerializer.Serialize(this, Json);

        /// <summary>
        /// Reads a snapshot back. A property missing from an old snapshot takes its default — so a
        /// setting added later doesn't break replay of games recorded before it existed, and those
        /// games replay with the value that setting implicitly had then.
        /// </summary>
        public static AssociationRules FromJson(string json) =>
            JsonSerializer.Deserialize<AssociationRules>(json, Json)
            ?? throw new InvalidOperationException("Associations rules snapshot is empty.");
    }

    /// <summary>
    /// The <c>Associations:Rules</c> configuration section. A mutable class because the options
    /// binder needs one; turned into an <see cref="AssociationRules"/> before anything uses it.
    /// Every property defaults to <see cref="AssociationRules.Default"/>, so the section is optional.
    /// </summary>
    public sealed class AssociationRulesOptions
    {
        public const string SectionName = "Associations:Rules";

        public int ColumnBase { get; set; } = AssociationRules.Default.ColumnBase;
        public int PerClosedTile { get; set; } = AssociationRules.Default.PerClosedTile;
        public int FinalBase { get; set; } = AssociationRules.Default.FinalBase;
        public int DuelTurnSeconds { get; set; } = AssociationRules.Default.DuelTurnSeconds;
        public int EndgameTurnsPerSeat { get; set; } = AssociationRules.Default.EndgameTurnsPerSeat;
        public int SoloDefaultBoardSeconds { get; set; } = AssociationRules.Default.SoloDefaultBoardSeconds;
        public int SoloMinBoardSeconds { get; set; } = AssociationRules.Default.SoloMinBoardSeconds;
        public int SoloMaxBoardSeconds { get; set; } = AssociationRules.Default.SoloMaxBoardSeconds;

        public AssociationRules ToRules() => new()
        {
            ColumnBase = ColumnBase,
            PerClosedTile = PerClosedTile,
            FinalBase = FinalBase,
            DuelTurnSeconds = DuelTurnSeconds,
            EndgameTurnsPerSeat = EndgameTurnsPerSeat,
            SoloDefaultBoardSeconds = SoloDefaultBoardSeconds,
            SoloMinBoardSeconds = SoloMinBoardSeconds,
            SoloMaxBoardSeconds = SoloMaxBoardSeconds,
        };
    }

    /// <summary>
    /// Where a game about to start gets its rules. The one seam for "make the numbers changeable":
    /// v1 returns the configured defaults; a per-quiz, author-editable override would be layered
    /// on here without any caller changing.
    /// </summary>
    public interface IAssociationRulesProvider
    {
        /// <param name="quizId">The quiz about to be played. Unused in v1 — it is the parameter a per-quiz override will need.</param>
        AssociationRules GetRulesFor(int quizId);
    }

    /// <summary>v1: the rules from configuration, for every quiz.</summary>
    public sealed class ConfiguredAssociationRulesProvider : IAssociationRulesProvider
    {
        private readonly AssociationRules _rules;

        public ConfiguredAssociationRulesProvider(Microsoft.Extensions.Options.IOptions<AssociationRulesOptions> options)
        {
            _rules = options.Value.ToRules();
        }

        public AssociationRules GetRulesFor(int quizId) => _rules;
    }
}
