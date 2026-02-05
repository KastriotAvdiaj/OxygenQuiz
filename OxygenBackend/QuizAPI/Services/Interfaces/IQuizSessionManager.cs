using QuizAPI.Services.QuizSessionServices;

namespace QuizAPI.Services.Interfaces;

public interface IQuizSessionManager
{
    Task<Participant> AddParticipantAsync(string sessionId, string username, string connectionId);
    Task RemoveParticipantAsync(string sessionId, string username);
    Task<List<Participant>> GetParticipantsAsync(string sessionId);
}
