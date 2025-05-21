namespace QuizAPI.DTOs.Question
{
    public class QuestionLanguageDTO
    {
        public int ID { get; set; }

        public string Language { get; set; }

        public string Username { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class QuestionLanguageCM
    {
        public string Language { get; set; }
    }
}
