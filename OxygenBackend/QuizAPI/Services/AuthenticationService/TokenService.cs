using Microsoft.IdentityModel.Tokens;
using QuizAPI.Models;
using QuizAPI.Services.AuthenticationService.External;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace QuizAPI.Services.AuthenticationService
{
    public class TokenService(IConfiguration configuration) : ITokenService
    {
        private readonly IConfiguration _configuration = configuration;

        private const int RefreshTokenBytes = 32;     // 256-bit token
        private const int RefreshTokenDays = 7;       // session lifetime
        private const int EmailVerificationTokenHours = 24; // confirmation-link lifetime
        private const int ExternalSignupTicketMinutes = 10; // external signup completion window

        // A ticket is a JWT signed with our key but addressed to THIS audience, not Jwt:Audience.
        // That single difference makes the JWT middleware reject a ticket on any [Authorize]
        // endpoint (audience mismatch) — a ticket can never impersonate an access token.
        private const string ExternalSignupAudience = "oxygenquiz:external-signup";
        private const string PurposeClaim = "purpose";
        private const string PurposeValue = "external_signup";

        public string GenerateToken(User user, IReadOnlyCollection<string> roleNames)
        {
            var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            // Also emit the .NET-conventional id claim. Because MapInboundClaims = false
            // keeps 'sub' literal (so /me can read it), 'sub' is NOT auto-mapped to
            // NameIdentifier — so anything reading ClaimTypes.NameIdentifier (controllers,
            // ICurrentUserService, query filters) needs this claim explicitly.
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("username", user.Username),
        };

            // Many-to-many now: one role claim per role, not a single user.Role.Name
            claims.AddRange(roleNames.Select(r => new Claim(ClaimTypes.Role, r)));

            var keyValue = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key is not configured.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyValue));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public (string rawToken, string tokenHash, DateTime expiresAt) GenerateRefreshToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(RefreshTokenBytes);
            var rawToken = Base64UrlEncode(bytes);
            var tokenHash = HashRefreshToken(rawToken);
            var expiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays);
            return (rawToken, tokenHash, expiresAt);
        }

        public string HashRefreshToken(string rawToken) => HashToken(rawToken);

        public (string rawToken, string tokenHash, DateTime expiresAt) GenerateEmailVerificationToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(RefreshTokenBytes); // 256-bit, same strength
            var rawToken = Base64UrlEncode(bytes);
            var tokenHash = HashToken(rawToken);
            var expiresAt = DateTime.UtcNow.AddHours(EmailVerificationTokenHours);
            return (rawToken, tokenHash, expiresAt);
        }

        public string GenerateExternalSignupTicket(ExternalIdentity identity)
        {
            var claims = new List<Claim>
            {
                new(PurposeClaim, PurposeValue),
                new("provider", identity.Provider),
                new("ext_sub", identity.SubjectId),
                new("email_verified", identity.EmailVerified ? "true" : "false"),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };
            if (identity.Email is not null)
                claims.Add(new Claim(JwtRegisteredClaimNames.Email, identity.Email));
            if (identity.DisplayName is not null)
                claims.Add(new Claim("name", identity.DisplayName));

            var creds = new SigningCredentials(SigningKey(), SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: ExternalSignupAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(ExternalSignupTicketMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public ExternalIdentity? ValidateExternalSignupTicket(string ticket)
        {
            if (string.IsNullOrWhiteSpace(ticket))
                return null;

            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidAudience = ExternalSignupAudience, // rejects real access tokens outright
                IssuerSigningKey = SigningKey(),
                // Tickets live 10 minutes by design; don't stretch that with the default 5-min skew.
                ClockSkew = TimeSpan.FromSeconds(30),
            };

            try
            {
                var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
                var principal = handler.ValidateToken(ticket, parameters, out _);

                // Belt-and-braces alongside the audience check.
                if (principal.FindFirst(PurposeClaim)?.Value != PurposeValue)
                    return null;

                var provider = principal.FindFirst("provider")?.Value;
                var sub = principal.FindFirst("ext_sub")?.Value;
                if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(sub))
                    return null;

                return new ExternalIdentity(
                    Provider: provider,
                    SubjectId: sub,
                    Email: principal.FindFirst(JwtRegisteredClaimNames.Email)?.Value,
                    EmailVerified: principal.FindFirst("email_verified")?.Value == "true",
                    DisplayName: principal.FindFirst("name")?.Value);
            }
            catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
            {
                return null; // expired, tampered, or not a ticket at all
            }
        }

        private SymmetricSecurityKey SigningKey()
        {
            var keyValue = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key is not configured.");
            return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyValue));
        }

        public string HashToken(string rawToken)
        {
            var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
            return Convert.ToHexString(hashBytes); // 64 hex chars
        }

        private static string Base64UrlEncode(byte[] bytes) =>
            Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
    }
}