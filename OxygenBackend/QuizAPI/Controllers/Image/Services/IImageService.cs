namespace QuizAPI.Controllers.Image.Services
{
    public interface IImageService
    {
        Task<string> SaveImageAsync(Stream imageStream, string fileName, string format);
        Task<bool> AssociateImageWithEntityAsync(string imageUrl, string entityType, int entityId);

        Task DeleteAssociatedImageAsync(string imageUrl, string entityType, int entityId);
        Task<int> CleanUpUnusedImagesAsync();
    }
}
