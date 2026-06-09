namespace QuizAPI.DTOs.Settings
{
    // Returned to the client (GET /api/settings).
    public class SettingsDTO
    {
        public bool MusicEnabled { get; set; }
        public int MusicVolume { get; set; }
        public bool SoundEffectsEnabled { get; set; }
        public int SoundEffectsVolume { get; set; }
        public string Theme { get; set; } = "system";
        public bool ShowTimer { get; set; }
        public string AppFont { get; set; } = "Noto Sans";
        public string QuizFont { get; set; } = "DynaPuff";
    }
}
