namespace QuizAPI.DTOs.Files
{
    public class FileDTO
    {
        public Guid Id { get; set; }
        public string Entity { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Filename { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string? ContentType { get; set; }
        /// <summary>High-level media kind derived from the content type: "image", "audio", "video", or "file".</summary>
        public string Kind { get; set; } = "file";
        public long FileSize { get; set; }
        public Guid? UploadedBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
