using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using QuizAPI.Exceptions;
using System.IdentityModel.Tokens.Jwt;

namespace QuizAPI.Services.AuthenticationService.External
{
    /// <summary>
    /// Validates Microsoft (Entra ID) ID tokens against the tenant's OIDC metadata / JWKS.
    /// <para>
    /// The tenant comes from <c>Authentication:Microsoft:TenantId</c> — "consumers" (personal
    /// Microsoft accounts only; the default and simplest), "common" / "organizations" (also
    /// org accounts; issuer is then per-tenant and validated structurally), or a specific
    /// tenant GUID. See docs/auth/social-login-plan.md §4.
    /// </para>
    /// <para>
    /// Email trust is stricter than Google's: Entra's <c>email</c> claim is not guaranteed
    /// verified. We treat it as verified only for personal accounts (the consumers tenant,
    /// where the email *is* the login) or when the app registration's optional
    /// <c>xms_edov</c> ("email domain owner verified") claim says so. See plan §2.4.
    /// </para>
    /// </summary>
    public sealed class MicrosoftIdentityVerifier : IExternalIdentityVerifier
    {
        /// <summary>The fixed tenant id behind "consumers" (personal Microsoft accounts).</summary>
        private const string ConsumersTenantId = "9188040d-6c67-4c5b-b112-36a304b66dad";

        private readonly IConfiguration _configuration;
        private readonly ConfigurationManager<OpenIdConnectConfiguration> _metadata;
        private readonly string _tenant;

        public MicrosoftIdentityVerifier(IConfiguration configuration)
        {
            _configuration = configuration;
            _tenant = configuration["Authentication:Microsoft:TenantId"] ?? "consumers";
            _metadata = new ConfigurationManager<OpenIdConnectConfiguration>(
                $"https://login.microsoftonline.com/{_tenant}/v2.0/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever());
        }

        public string Provider => ExternalProviders.Microsoft;

        public async Task<ExternalIdentity> VerifyAsync(string idToken, CancellationToken ct = default)
        {
            var clientId = _configuration["Authentication:Microsoft:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
                throw new InvalidOperationException("Authentication:Microsoft:ClientId is not configured.");

            OpenIdConnectConfiguration metadata;
            try
            {
                metadata = await _metadata.GetConfigurationAsync(ct);
            }
            catch
            {
                // Fail closed on metadata problems — see GoogleIdentityVerifier.
                throw new UnauthorizedException("Could not verify the Microsoft token.");
            }

            var parameters = new TokenValidationParameters
            {
                ValidAudience = clientId,
                IssuerSigningKeys = metadata.SigningKeys,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidateIssuer = true,
                // Multi-tenant endpoints ("common"/"organizations") publish the literal template
                // "https://login.microsoftonline.com/{tenantid}/v2.0" as their issuer, so an exact
                // string match is impossible. Validate structurally instead: the issuer must be
                // the v2.0 issuer for the token's own `tid` claim, and that tid must match the
                // configured tenant when one is pinned.
                IssuerValidator = ValidateIssuer,
            };

            try
            {
                var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
                var principal = handler.ValidateToken(idToken, parameters, out var validated);

                var sub = principal.FindFirst("sub")?.Value;
                if (string.IsNullOrWhiteSpace(sub))
                    throw new UnauthorizedException("Invalid Microsoft token.");

                var tid = principal.FindFirst("tid")?.Value;
                var isPersonalAccount = string.Equals(
                    tid, ConsumersTenantId, StringComparison.OrdinalIgnoreCase);
                var edov = principal.FindFirst("xms_edov")?.Value;
                var emailVerified = isPersonalAccount
                    || string.Equals(edov, "true", StringComparison.OrdinalIgnoreCase)
                    || edov == "1";

                return new ExternalIdentity(
                    Provider: Provider,
                    SubjectId: sub,
                    Email: principal.FindFirst("email")?.Value,
                    EmailVerified: emailVerified,
                    DisplayName: principal.FindFirst("name")?.Value);
            }
            catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
            {
                throw new UnauthorizedException("Invalid Microsoft token.");
            }
        }

        private string ValidateIssuer(string issuer, SecurityToken token, TokenValidationParameters _)
        {
            var tid = (token as JwtSecurityToken)?
                .Claims.FirstOrDefault(c => c.Type == "tid")?.Value;

            var expected = $"https://login.microsoftonline.com/{tid}/v2.0";
            if (string.IsNullOrWhiteSpace(tid) ||
                !string.Equals(issuer, expected, StringComparison.OrdinalIgnoreCase))
                throw new SecurityTokenInvalidIssuerException("Issuer does not match the token's tenant.");

            // Pin the tenant unless the app is deliberately multi-tenant.
            var requiredTenant = _tenant.ToLowerInvariant() switch
            {
                "common" or "organizations" => null,
                "consumers" => ConsumersTenantId,
                var specific => specific,
            };

            if (requiredTenant is not null &&
                !string.Equals(tid, requiredTenant, StringComparison.OrdinalIgnoreCase))
                throw new SecurityTokenInvalidIssuerException("Token is from an unexpected tenant.");

            return issuer;
        }
    }
}
