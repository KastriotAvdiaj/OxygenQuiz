using QuizAPI.DTOs.Files;

namespace QuizAPI.Controllers.Files.Services
{
    public interface IFileService
    {
        Task<FileDTO> UploadAsync(IFormFile file, string entity, string entityId, Guid? uploadedBy, CancellationToken ct = default);
        Task<IReadOnlyList<FileDTO>> GetByEntityAsync(string entity, string entityId, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    }
}
