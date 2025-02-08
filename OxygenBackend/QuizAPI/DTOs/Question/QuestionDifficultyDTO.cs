namespace QuizAPI.DTOs.Question
{
    public class QuestionDifficultyDTO
    {
        public int ID { get; set; }

        public string Level { get; set; }

        public int? Weight { get; set; }

        public string Username { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class QuestionDifficultyCM
    {

        public string Level { get; set; }

        public int? Weight { get; set; }


    }



}
