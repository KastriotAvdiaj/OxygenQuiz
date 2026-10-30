namespace QuizAPI.Models
{
    // Per-user preferences. One row per user (1:1, PK = UserId).
    public class UserSettings
    {
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        // Background music
        public bool MusicEnabled { get; set; } = true;
        public int MusicVolume { get; set; } = 50; // 0..100

        // UI / quiz sound effects
        public bool SoundEffectsEnabled { get; set; } = true;
        public int SoundEffectsVolume { get; set; } = 50; // 0..100

        // "light" | "dark" | "system"
        public string Theme { get; set; } = "system";

        // Show the countdown timer while taking a quiz
        public bool ShowTimer { get; set; } = true;

        // Quiz builder: confirm before removing a question from the quiz. Turned off by the
        // dialog's "Don't ask again", back on in Settings > Quiz. Removals can be undone either way.
        public bool AskBeforeRemovingQuestion { get; set; } = true;

        // Font family names (must be one the client preloads). Two zones:
        // AppFont = dashboard/UI body, QuizFont = quiz experience.
        public string AppFont { get; set; } = "Baloo 2";
        public string QuizFont { get; set; } = "DynaPuff";

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
