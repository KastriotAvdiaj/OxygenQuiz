namespace QuizAPI.DTOs.Question
{

    //CM = Create Model
    public class QuestionCategoryCM
    {
        public string Name { get; set; }
        public List<string>? ColorPalette { get; set; }
    }

    public class QuestionCategoryDTO {

        public int Id { get; set; }
        public string Name { get; set; }
        public string Username { get; set; }
        public DateTime CreatedAt { get; set; }
    }

}
