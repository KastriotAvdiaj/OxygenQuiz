using Microsoft.AspNetCore.Http;
using QuizAPI.Controllers.Files.Services;
using QuizAPI.Exceptions;
using QuizAPI.Repositories.Interfaces;
using SixLabors.ImageSharp;

namespace QuizAPI.Controllers.Users.Services
{
    /// <summary>
    /// Avatars are stored in the generic Files store (<c>entity = "User"</c>), but with stricter,
    /// avatar-specific validation than the generic store: an image-only allowlist plus a real
    /// content check (we decode the bytes with ImageSharp and confirm the actual format), which
    /// defends against a non-image file renamed to look like a picture. SVG is intentionally
    /// excluded (it can carry scripts → stored XSS).
    /// </summary>
    public class AvatarService : IAvatarService
    {
        private const long MaxAvatarBytes = 5 * 1024 * 1024; // 5 MB
        private const string OwnerEntity = "User";

        private static readonly HashSet<string> AllowedExtensions =
            new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" };

        // ImageSharp's IImageFormat.Name values for the formats we accept.
        private static readonly HashSet<string> AllowedFormats =
            new(StringComparer.OrdinalIgnoreCase) { "JPEG", "PNG", "WEBP" };

        private readonly IFileService _fileService;
        private readonly IUserRepository _userRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AvatarService> _logger;

        public AvatarService(
            IFileService fileService,
            IUserRepository userRepository,
            IHttpContextAccessor httpContextAccessor,
            ILogger<AvatarService> logger)
        {
            _fileService = fileService;
            _userRepository = userRepository;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<string> UpdateAvatarAsync(Guid userId, IFormFile file, CancellationToken ct = default)
        {
            await ValidateImageAsync(file, ct);

            var user = await _userRepository.GetByIdAsync(userId, tracked: true, ct)
                ?? throw new AppValidationException("User not found.");

            // Capture existing avatars so we can clean them up only AFTER the new one is stored
            // (a failed upload must not leave the user with no picture).
            var previous = await _fileService.GetByEntityAsync(OwnerEntity, userId.ToString(), ct);

            var stored = await _fileService.UploadAsync(file, OwnerEntity, userId.ToString(), userId, ct);
            var absoluteUrl = ToAbsoluteUrl(stored.Url);

            user.ProfileImageUrl = absoluteUrl;
            await _userRepository.SaveChangesAsync(ct);

            foreach (var old in previous)
            {
                try { await _fileService.DeleteAsync(old.Id, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "Could not delete old avatar {FileId}", old.Id); }
            }

            return absoluteUrl;
        }

        private static async Task ValidateImageAsync(IFormFile file, CancellationToken ct)
        {
            if (file is null || file.Length == 0)
                throw new AppValidationException("No image was provided.");

            if (file.Length > MaxAvatarBytes)
                throw new AppValidationException("Avatar must be 5 MB or smaller.");

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
                throw new AppValidationException("Avatar must be a JPG, PNG, or WebP image.");

            // Content check: decode the bytes and confirm the real format — an extension alone is
            // not trustworthy.
            try
            {
                await using var ms = new MemoryStream();
                await file.CopyToAsync(ms, ct);
                ms.Position = 0;

                // Fully qualified: a bare `Image` would resolve to the QuizAPI.Controllers.Image
                // namespace, not the ImageSharp type.
                using var image = SixLabors.ImageSharp.Image.Load(ms);
                var formatName = image.Metadata.DecodedImageFormat?.Name;
                if (formatName is null || !AllowedFormats.Contains(formatName))
                    throw new AppValidationException("Avatar must be a JPG, PNG, or WebP image.");
            }
            catch (UnknownImageFormatException)
            {
                throw new AppValidationException("The file is not a valid image.");
            }
            catch (InvalidImageContentException)
            {
                throw new AppValidationException("The image appears to be corrupted.");
            }
        }

        // The Files store returns a root-relative path (e.g. "/uploads/files/<guid>.png"). Profile
        // pictures are rendered cross-origin (the SPA runs on a different host than the API), so we
        // store an absolute URL pointing at the API.
        private string ToAbsoluteUrl(string url)
        {
            if (url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                return url;

            var request = _httpContextAccessor.HttpContext?.Request;
            if (request is null)
                return url;

            return $"{request.Scheme}://{request.Host.Value}{url}";
        }
    }
}
