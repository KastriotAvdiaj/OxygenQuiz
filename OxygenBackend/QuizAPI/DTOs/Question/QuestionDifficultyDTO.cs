namespace QuizAPI.DTOs.Question
{
    public class QuestionDifficultyDTO
    {
        public int ID { get; set; }

        public string Level { get; set; }

        public int? Weight { get; set; }


        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// The difficulty as the admin dashboard sees it: everything public plus who created it.
    /// Served only from the role-gated <c>GET /api/questiondifficulties/admin</c>. See
    /// <see cref="QuestionCategoryAdminDTO"/> for why the public shape omits it.
    /// </summary>
    public class QuestionDifficultyAdminDTO : QuestionDifficultyDTO
    {
        public string? Username { get; set; }
    }

    public class QuestionDifficultyCM
    {
        public string Level { get; set; }

        public int? Weight { get; set; }
    }

}
