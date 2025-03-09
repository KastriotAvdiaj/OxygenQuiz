using System.Text.Json.Serialization;

namespace QuizAPI.Models
{
    public class Drejtimi
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public string Duration { get; set; }

        public int UniversitetiId { get; set; }

        [JsonIgnore]
        public Universiteti Universiteti { get; set; }
    }
}
