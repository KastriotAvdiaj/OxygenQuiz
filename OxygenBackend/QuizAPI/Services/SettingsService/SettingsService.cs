using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Settings;
using QuizAPI.Models;

namespace QuizAPI.Services.SettingsService
{
    public class SettingsService : ISettingsService
    {
        private readonly ApplicationDbContext _context;

        public SettingsService(ApplicationDbContext context) => _context = context;

        public async Task<SettingsDTO> GetForUserAsync(Guid userId, CancellationToken ct = default)
        {
            var settings = await _context.UserSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

            // First access: persist defaults so every user always has a row.
            if (settings == null)
            {
                settings = new UserSettings { UserId = userId };
                _context.UserSettings.Add(settings);
                await _context.SaveChangesAsync(ct);
            }

            return ToDto(settings);
        }

        public async Task<SettingsDTO> UpdateForUserAsync(
            Guid userId,
            UpdateSettingsDTO dto,
            CancellationToken ct = default)
        {
            var settings = await _context.UserSettings
                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

            if (settings == null)
            {
                settings = new UserSettings { UserId = userId };
                _context.UserSettings.Add(settings);
            }

            settings.MusicEnabled = dto.MusicEnabled;
            settings.MusicVolume = dto.MusicVolume;
            settings.SoundEffectsEnabled = dto.SoundEffectsEnabled;
            settings.SoundEffectsVolume = dto.SoundEffectsVolume;
            settings.Theme = dto.Theme;
            settings.ShowTimer = dto.ShowTimer;
            settings.AppFont = dto.AppFont;
            settings.QuizFont = dto.QuizFont;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);
            return ToDto(settings);
        }

        private static SettingsDTO ToDto(UserSettings s) => new()
        {
            MusicEnabled = s.MusicEnabled,
            MusicVolume = s.MusicVolume,
            SoundEffectsEnabled = s.SoundEffectsEnabled,
            SoundEffectsVolume = s.SoundEffectsVolume,
            Theme = s.Theme,
            ShowTimer = s.ShowTimer,
            AppFont = s.AppFont,
            QuizFont = s.QuizFont,
        };
    }
}
