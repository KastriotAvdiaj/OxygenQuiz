using QuizAPI.Models.Quiz;
using QuizAPI.Models;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace QuizAPI.ManyToManyTables
{

    public enum PointSystem
    {
        Standard,
        Double,
        Quadruple,
    }

    [Index(nameof(QuizId), nameof(QuestionId), IsUnique = true)]
    public class QuizQuestion
    {

        // --- The Surrogate Primary Key ---
        // This is the simple, single key that other tables will reference.
        [Key]
        public int Id { get; set; }
        public int QuizId { get; set; }
        public virtual Quiz Quiz { get; set; } = null!;

        public int QuestionId { get; set; }
        public virtual QuestionBase Question { get; set; } = null!;


        // --- Contextual Data ---
        // This data belongs to the question *in the context of this specific quiz*
        public int TimeLimitInSeconds { get; set; } = 10;

        public PointSystem PointSystem { get; set; } = PointSystem.Standard;
        public int OrderInQuiz { get; set; }

        // A QuizQuestion can have many user answers across different sessions
        public virtual ICollection<UserAnswer> UserAnswers { get; set; } = new List<UserAnswer>();

    }
}
