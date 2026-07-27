using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using QuizAPI.Exceptions;
using System.IdentityModel.Tokens.Jwt;

namespace QuizAPI.Services.AuthenticationService.External
{
    /// <summary>
    /// Validates Google ID tokens against Google's published OIDC metadata / JWKS.
    /// Uses the same Microsoft.IdentityModel stack as our own JWT middleware (no extra package):
    /// <see cref="ConfigurationManager{T}"/> fetches and caches the signing keys, refreshing
    /// automatically when Google rotates them. Registered as a singleton so the cache is shared.
    /// </summary>
    public sealed class GoogleIdentityVerifier : IExternalIdentityVerifier
    {
        private const string MetadataUrl = "https://accounts.google.com/.well-known/openid-configuration";

        // Google's issuer appears in both forms in the wild.
        private static readonly string[] ValidIssuers =
            ["https://accounts.google.com", "accounts.google.com"];

        private readonly IConfiguration _configuration;
        private readonly ConfigurationManager<OpenIdConnectConfiguration> _metadata;

        public GoogleIdentityVerifier(IConfiguration configuration)
        {
            _configuration = configuration;
            _metadata = new ConfigurationManager<OpenIdConnectConfiguration>(
                MetadataUrl, new OpenIdConnectConfigurationRetriever());
        }

        public string Provider => ExternalProviders.Google;

        public async Task<ExternalIdentity> VerifyAsync(string idToken, CancellationToken ct = default)
        {
            var clientId = _configuration["Authentication:Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
                throw new InvalidOperationException("Authentication:Google:ClientId is not configured.");

            OpenIdConnectConfiguration metadata;
            try
            {
                metadata = await _metadata.GetConfigurationAsync(ct);
            }
            catch
            {
                // Metadata unreachable is an infrastructure failure, not a bad token — but the
                // caller can't tell the difference safely, so fail closed.
                throw new UnauthorizedException("Could not verify the Google token.");
            }

            var parameters = new TokenValidationParameters
            {
                ValidIssuers = ValidIssuers,
                // The audience is OUR client id: a token minted for another app must not log
                // anyone in here, even though Google signed it.
                ValidAudience = clientId,
                IssuerSigningKeys = metadata.SigningKeys,
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
            };

            try
            {
                // Keep claim types literal ('sub', 'email'), same convention as our middleware.
                var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
                var principal = handler.ValidateToken(idToken, parameters, out _);

                var sub = principal.FindFirst("sub")?.Value;
                if (string.IsNullOrWhiteSpace(sub))
                    throw new UnauthorizedException("Invalid Google token.");

                return new ExternalIdentity(
                    Provider: Provider,
                    SubjectId: sub,
                    Email: principal.FindFirst("email")?.Value,
                    EmailVerified: string.Equals(
                        principal.FindFirst("email_verified")?.Value, "true",
                        StringComparison.OrdinalIgnoreCase),
                    DisplayName: principal.FindFirst("name")?.Value);
            }
            catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
            {
                // Covers bad signature, wrong issuer/audience, expiry, and malformed JWTs alike.
                throw new UnauthorizedException("Invalid Google token.");
            }
        }
    }
}
