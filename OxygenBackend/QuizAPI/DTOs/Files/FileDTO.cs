namespace QuizAPI.DTOs.Files
{
    public class FileDTO
    {
        public Guid Id { get; set; }
        public string Entity { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Filename { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public Guid? UploadedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
