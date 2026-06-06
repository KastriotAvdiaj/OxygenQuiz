namespace QuizAPI.DTOs.User
{
    /// <summary>
    /// Result of a username/email availability check. A field is null when the
    /// corresponding query parameter wasn't supplied, so the client can ask about
    /// one field at a time.
    /// </summary>
    public class AvailabilityDTO
    {
        public bool? UsernameAvailable { get; set; }
        public bool? EmailAvailable { get; set; }
    }
}
