namespace QuizAPI.Services.AuthenticationService.External
{
    /// <summary>Canonical provider names. Always lowercase — they are stored in ExternalLogins.Provider.</summary>
    public static class ExternalProviders
    {
        public const string Google = "google";
        public const string Microsoft = "microsoft";
    }

    /// <summary>
    /// A provider-verified identity extracted from a validated ID token.
    /// <para>
    /// <see cref="EmailVerified"/> means the *provider* asserts ownership of the email
    /// (Google's <c>email_verified</c>; for Microsoft see MicrosoftIdentityVerifier). Only a
    /// verified email may auto-link to an existing local account — an unverified one would let
    /// anyone claim someone else's address and take over their account.
    /// </para>
    /// </summary>
    public sealed record ExternalIdentity(
        string Provider,
        string SubjectId,
        string? Email,
        bool EmailVerified,
        string? DisplayName);
}
