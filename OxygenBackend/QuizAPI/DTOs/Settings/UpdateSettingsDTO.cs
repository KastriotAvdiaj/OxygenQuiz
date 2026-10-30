using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Settings
{
    // Sent by the client (PUT /api/settings). Full replace of the editable fields.
    public class UpdateSettingsDTO
    {
        public bool MusicEnabled { get; set; }

        [Range(0, 100)]
        public int MusicVolume { get; set; }

        public bool SoundEffectsEnabled { get; set; }

        [Range(0, 100)]
        public int SoundEffectsVolume { get; set; }

        [RegularExpression("^(light|dark|system)$",
            ErrorMessage = "Theme must be 'light', 'dark', or 'system'.")]
        public string Theme { get; set; } = "system";

        public bool ShowTimer { get; set; }

        // Nullable on purpose: PUT is a full replace, and a client built before this field existed
        // would otherwise send nothing and quietly reset it to false. Null = leave it as it is.
        public bool? AskBeforeRemovingQuestion { get; set; }

        [MaxLength(64)]
        public string AppFont { get; set; } = "Noto Sans";

        [MaxLength(64)]
        public string QuizFont { get; set; } = "DynaPuff";
    }
}
