using Microsoft.IdentityModel.Tokens;
using QuizAPI.Models;
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