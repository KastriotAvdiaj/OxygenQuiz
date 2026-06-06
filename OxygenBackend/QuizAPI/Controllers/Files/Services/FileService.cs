using QuizAPI.DTOs.Files;
using QuizAPI.Exceptions;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Controllers.Files.Services
{
    public class FileService : IFileService
    {
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB
        private const string UploadsSubfolder = "uploads/files";

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",   // avatars, product photos
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt" // documents
        };

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

            if (file.Length > MaxFileSizeBytes)
                throw new AppValidationException("File exceeds the 10 MB limit.");

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
                throw new AppValidationException($"File type '{ext}' is not allowed.");

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

        private static FileDTO ToDto(FileRecord r) => new()
        {
            Id = r.Id,
            Entity = r.Entity,
            EntityId = r.EntityId,
            Filename = r.Filename,
            Url = "/" + r.FilePath.TrimStart('/'),
            FileSize = r.FileSize,
            UploadedBy = r.UploadedBy,
            CreatedAt = r.CreatedAt
        };
    }
}
