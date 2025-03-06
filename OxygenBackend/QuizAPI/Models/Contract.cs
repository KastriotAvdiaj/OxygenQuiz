namespace QuizAPI.Models
{
    public class Contract
    {

        public int Id  { get; set; }

        public string Title { get; set; }

        public string Description { get; set; }

        public int EmployeeId { get; set; }

        public Employee Employee { get; set; }
    }
}
