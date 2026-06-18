using QuizAPI.DTOs.Files;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Controllers.Files.Services
{
    public class FileService : IFileService
    {
        private const string UploadsSubfolder = "uploads/files";

        // Per-kind extension allowlists. Adding a new supported type is a one-line change here.
        private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
        };

        private static readonly HashSet<string> AudioExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm",
        };

        private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".mp4", ".webm", ".ogg", ".mov", ".m4v",
        };

        private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
        };

        // Per-kind size caps. Video is the largest; tune as needed (or move to config).
        private const long ImageMaxBytes = 5L * 1024 * 1024;    // 5 MB
        private const long AudioMaxBytes = 20L * 1024 * 1024;   // 20 MB
        private const long VideoMaxBytes = 100L * 1024 * 1024;  // 100 MB
        private const long DocumentMaxBytes = 10L * 1024 * 1024; // 10 MB

        private readonly IFileRepository _repository;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<FileService> _logger;

        public FileService(IFileRepository repository, IWebHostEnvironment env, ILogger<FileService> logger)
        {
            _repository = repository;
            _env = env;
            _logger = logger;
        }

        public async Task<FileDTO> UploadAsync(IFormFile file, string entity, string entityId, Guid? uploadedBy, CancellationToken ct = default)
        {
            if (file is null || file.Length == 0)
                throw new AppValidationException("No file was provided.");

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext) || !IsAllowed(ext))
                throw new AppValidationException($"File type '{ext}' is not allowed.");

            var kind = ResolveKind(ext);
            var maxBytes = MaxBytesFor(kind);
            if (file.Length > maxBytes)
                throw new AppValidationException($"File exceeds the {maxBytes / (1024 * 1024)} MB limit for {kind} files.");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var targetDir = Path.Combine(webRoot, UploadsSubfolder);
            Directory.CreateDirectory(targetDir);

            var storedName = $"{Guid.NewGuid()}{ext.ToLowerInvariant()}";
            var absolutePath = Path.Combine(targetDir, storedName);

            await using (var stream = new FileStream(absolutePath, FileMode.Create))
            {
                await file.CopyToAsync(stream, ct);
            }

            var record = new FileRecord
            {
                Id = Guid.NewGuid(),
                Entity = entity,
                EntityId = entityId,
                Filename = file.FileName,
                FilePath = Path.Combine(UploadsSubfolder, storedName).Replace('\\', '/'),
                ContentType = file.ContentType,
                FileSize = file.Length,
                UploadedBy = uploadedBy,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(record, ct);
            await _repository.SaveChangesAsync(ct);

            return ToDto(record);
        }

        public async Task<IReadOnlyList<FileDTO>> GetByEntityAsync(string entity, string entityId, CancellationToken ct = default)
        {
            var records = await _repository.GetByEntityAsync(entity, entityId, ct);
            return records.Select(ToDto).ToList();
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var record = await _repository.GetByIdAsync(id, ct);
            if (record is null) return false;

            try
            {
                var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                var absolutePath = Path.Combine(webRoot, record.FilePath.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(absolutePath))
                    File.Delete(absolutePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed deleting physical file for {FileId}", id);
            }

            _repository.Remove(record);
            await _repository.SaveChangesAsync(ct);
            return true;
        }

        private static bool IsAllowed(string ext) =>
            ImageExtensions.Contains(ext) || AudioExtensions.Contains(ext) ||
            VideoExtensions.Contains(ext) || DocumentExtensions.Contains(ext);

        // Video is checked before audio because ".webm"/".ogg" are valid for both;
        // when a container can hold video we treat the upload as video (the larger limit).
        private static string ResolveKind(string ext)
        {
            if (VideoExtensions.Contains(ext)) return "video";
            if (AudioExtensions.Contains(ext)) return "audio";
            if (ImageExtensions.Contains(ext)) return "image";
            return "file";
        }

        private static long MaxBytesFor(string kind) => kind switch
        {
            "video" => VideoMaxBytes,
            "audio" => AudioMaxBytes,
            "image" => ImageMaxBytes,
            _ => DocumentMaxBytes,
        };

        private static string KindFromContentType(string? contentType, string fallbackExt)
        {
            if (!string.IsNullOrEmpty(contentType))
            {
                if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) return "image";
                if (contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase)) return "audio";
                if (contentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase)) return "video";
            }
            return ResolveKind(fallbackExt);
        }

        private static FileDTO ToDto(FileRecord r) => new()
        {
            Id = r.Id,
            Entity = r.Entity,
            EntityId = r.EntityId,
            Filename = r.Filename,
            Url = "/" + r.FilePath.TrimStart('/'),
            ContentType = r.ContentType,
            Kind = KindFromContentType(r.ContentType, Path.GetExtension(r.Filename)),
            FileSize = r.FileSize,
            UploadedBy = r.UploadedBy,
            CreatedAt = r.CreatedAt
        };
    }
}
