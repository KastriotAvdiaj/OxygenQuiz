using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models.Classroom
{
    /// <summary>
    /// A Teacher's saved, named list of students — first names only, not accounts — that Teams are
    /// formed from when hosting (docs/quiz/classroom.md, "Classes"). Owned by one Teacher; nobody
    /// else can read it.
    /// </summary>
    public class Class
    {
        public const int MaxNameLength = 40;
        public const int MaxStudents = 40;

        public int Id { get; set; }
        public Guid OwnerUserId { get; set; }
        public User Owner { get; set; } = null!;

        [MaxLength(MaxNameLength)]
        public string Name { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public List<ClassStudent> Students { get; set; } = new();
    }

    /// <summary>One student of a <see cref="Class"/>: a first name, in the Teacher's order.</summary>
    public class ClassStudent
    {
        public const int MaxNameLength = 30;

        public int Id { get; set; }
        public int ClassId { get; set; }
        public Class Class { get; set; } = null!;

        [MaxLength(MaxNameLength)]
        public string Name { get; set; } = string.Empty;

        public int Order { get; set; }
    }
}
