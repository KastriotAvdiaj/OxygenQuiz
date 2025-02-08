using Microsoft.CodeAnalysis.Scripting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuizAPI.Data;
using QuizAPI.DTOs.User;
using QuizAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace QuizAPI.Services
{
    public interface IAuthenticationService
    {
        Task<AuthResult> SignupAsync(string email, string username, string password);
        Task<AuthResult> LoginAsync(string email, string password);
    }

    public class AuthenticationService : IAuthenticationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthenticationService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResult> SignupAsync(string email, string username, string password)
        {
            // Check if the user already exists
            var existingUser = await _context.Users.SingleOrDefaultAsync(u => u.Email == email);
            if (existingUser != null)
            {
                return new AuthResult { Success = false, Message = "Email is already in use." };
            }

            // Create a new user
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                DateRegistered = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow,
                RoleId = 2, 
                IsDeleted = false,
                ImmutableName = username.ToLower(), // Immutable Name
                ProfileImageUrl = string.Empty
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Generate JWT token
            var token = GenerateJwtToken(user);
            return new AuthResult { Success = true, Token = token };
        }

        public async Task<AuthResult> LoginAsync(string email, string password)
        {
            // Check if the user exists
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == email && !u.IsDeleted);
            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                return new AuthResult { Success = false, Message = "Invalid credentials." };
            }

            var role = await _context.Roles.SingleOrDefaultAsync(r => r.Id == user.RoleId);
            if(role == null)
            {
                return new AuthResult { Success = false, Message = "Invalid credentials." };
            }

            var userDTO = new UserDTO
            {
                Id = user.Id,
                Email = email,
                Username = user.Username,
                Role = role.Name,
            };

            // Update last login
            user.LastLogin = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Generate JWT token
            var token = GenerateJwtToken(user);
            return new AuthResult { Success = true, Token = token, User = userDTO, Message="Successfully logged in!" };
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("Username", user.Username)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(0.40),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class AuthResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public UserDTO User { get; set; }
        public string Token { get; set; }
    }
}
