namespace QuizAPI.DTOs.Question
{
    public class QuestionLanguageDTO
    {
        public int ID { get; set; }

        public string Language { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// The language as the admin dashboard sees it. Role-gated; see
    /// <see cref="QuestionCategoryAdminDTO"/>.
    /// </summary>
    public class QuestionLanguageAdminDTO : QuestionLanguageDTO
    {
        public string? Username { get; set; }
    }

    public class QuestionLanguageCM
    {
        public string Language { get; set; }
    }
}
