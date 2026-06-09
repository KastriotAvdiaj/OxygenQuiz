using QuizAPI.DTOs.Settings;

namespace QuizAPI.Services.SettingsService
{
    public interface ISettingsService
    {
        // Returns the user's settings, creating a default row on first access.
        Task<SettingsDTO> GetForUserAsync(Guid userId, CancellationToken ct = default);

        // Replaces the editable fields and returns the updated settings.
        Task<SettingsDTO> UpdateForUserAsync(
            Guid userId,
            UpdateSettingsDTO dto,
            CancellationToken ct = default);
    }
}
