namespace QuizAPI.DTOs.Authentication
{
    /// <summary>
    /// Internal result returned by the authentication service to the controller.
    /// The controller serializes <see cref="Response"/> as the JSON body and writes
    /// <see cref="RawRefreshToken"/> into an HttpOnly cookie — the refresh token never
    /// appears in the response body.
    /// </summary>
    public class AuthResult
    {
        public AuthResponseDTO Response { get; set; } = null!;
        public string RawRefreshToken { get; set; } = string.Empty;
        public DateTime RefreshTokenExpiresAt { get; set; }
    }
}
