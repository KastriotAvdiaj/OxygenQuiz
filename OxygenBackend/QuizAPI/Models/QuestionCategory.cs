using System.ComponentModel.DataAnnotations.Schema;

namespace QuizAPI.Models
{
    public class QuestionCategory
    {
        public int Id { get; set; }

        public string Name { get; set; }


        [InverseProperty("Category")]
        public ICollection<Question> Questions { get; set; }

    }
}
