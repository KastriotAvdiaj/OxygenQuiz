using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// Generic stored-file record. Used for avatars, product photos, documents, etc.
    /// `Entity` + `EntityId` form a polymorphic association to whatever owns the file.
    /// </summary>
    public class FileRecord
    {
        public Guid Id { get; set; }

        /// <summary>Logical owner type, e.g. "User", "Product", "Document".</summary>
        [MaxLength(50)]
        public string Entity { get; set; } = string.Empty;

        /// <summary>Id of the owning entity (string so Guid- or int-keyed owners both fit).</summary>
        [MaxLength(64)]
        public string EntityId { get; set; } = string.Empty;

        [MaxLength(255)]
        public string Filename { get; set; } = string.Empty;

        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;

        public long FileSize { get; set; }

        public Guid? UploadedBy { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
