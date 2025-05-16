
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models
{
    public class ImageAsset
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string FileName { get; set; }

        [MaxLength(255)]
        public string OriginalFileName { get; set; }

        [MaxLength(10)]
        public string FileFormat { get; set; }

        [MaxLength(500)]
        public string FilePath { get; set; }

        public bool IsUsed { get; set; }

        [MaxLength(50)]
        public string? EntityType { get; set; }

        public int? EntityId { get; set; }

        public DateTime CreatedDate { get; set; }

        public DateTime? LastModifiedDate { get; set; }
    }
}