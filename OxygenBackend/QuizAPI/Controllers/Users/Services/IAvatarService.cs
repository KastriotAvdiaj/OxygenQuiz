using Microsoft.AspNetCore.Http;

namespace QuizAPI.Controllers.Users.Services
{
    /// <summary>
    /// Handles a user changing their profile picture: validates the image (type + real content),
    /// stores it through the generic Files store, swaps it in as the user's avatar, and removes the
    /// previous one. Returns the absolute URL of the new avatar.
    /// </summary>
    public interface IAvatarService
    {
        Task<string> UpdateAvatarAsync(Guid userId, IFormFile file, CancellationToken ct = default);
    }
}
