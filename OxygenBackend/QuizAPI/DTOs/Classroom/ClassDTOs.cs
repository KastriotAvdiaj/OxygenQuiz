namespace QuizAPI.DTOs.Classroom
{
    public class SaveClassDTO
    {
        public string Name { get; set; } = string.Empty;
        /// <summary>The students' names in order. The whole list is replaced on save.</summary>
        public List<string> Students { get; set; } = new();
    }

    public class ClassDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<string> Students { get; set; } = new();
        public DateTime UpdatedAt { get; set; }
    }
}
