namespace QuizAPI.Services.AuthenticationService.External
{
    /// <summary>
    /// Verifies a provider-issued ID token (signature against the provider's published JWKS,
    /// issuer, audience, lifetime) and extracts the identity claims. One implementation per
    /// provider; a new provider is one class + one registration away.
    /// </summary>
    public interface IExternalIdentityVerifier
    {
        /// <summary>Canonical provider name (see <see cref="ExternalProviders"/>).</summary>
        string Provider { get; }

        /// <summary>
        /// Validates the raw ID token and returns the verified identity.
        /// Throws <see cref="QuizAPI.Exceptions.UnauthorizedException"/> on any validation failure —
        /// callers never see a half-verified identity.
        /// </summary>
        Task<ExternalIdentity> VerifyAsync(string idToken, CancellationToken ct = default);
    }
}
