using System.Collections.Generic;

namespace QuizAPI.Services.QuizSessionServices
{
    public class MultiplayerSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string HostUsername { get; set; } = string.Empty;
        public List<Participant> Participants { get; set; } = new();
    }

    public class Participant
    {
        public string Username { get; set; } = string.Empty;
        public bool IsReady { get; set; } = false;
        public bool IsHost { get; set; } = false;
        public string ConnectionId { get; set; } = string.Empty; // Useful for targeted messages
    }
}
