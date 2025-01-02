using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.User;
using QuizAPI.Models;
using QuizAPI.Services;

namespace QuizAPI.Controllers.Users
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly DashboardService _dashboardService;

        public UsersController(ApplicationDbContext context, DashboardService dashboardService)
        {
            _context = context;
            _dashboardService = dashboardService;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FullUserDTO>>> GetUsers()
        {
            if (_context.Users == null)
            {
                return NotFound();
            }
            var totalUsers = _dashboardService.GetTotalCount<User>();
            var users = await _context.Users.Include(u => u.Role).ToListAsync();

            var userDTOs = users.Select(user => new FullUserDTO
            {
                Id = user.Id,
                ImmutableName = user.ImmutableName,
                Username = user.Username,
                Email = user.Email,
                PasswordHash = user.PasswordHash,
                DateRegistered = user.DateRegistered,
                Role = MapRoleIdToRole(user.RoleId),
                IsDeleted = user.IsDeleted,
                TotalUsers = totalUsers,
                LastLogin = user.LastLogin,
                ProfileImageUrl = user.ProfileImageUrl
            }).ToList();

            return Ok(userDTOs);
        }

        private static string MapRoleIdToRole(int roleId)
        {
            return roleId switch
            {
                1 => "admin",
                2 => "user",
                3 => "superadmin",
                _ => "user"
            };
        }

        private static int MapRoleToRoleId(string role)
        {
            return role.ToLower() switch
            {
                "admin" => 1,
                "user" => 2,
                "superadmin" => 3,
                _ => 2 // default to user if role is unknown
            };
        }


        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(Guid id)
        {
            if (_context.Users == null)
            {
                return NotFound();
            }
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return user;
        }

        // PUT: api/Users/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUser(Guid id, User user)
        {
            if (id != user.Id)
            {
                return BadRequest();
            }

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Users
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<User>> PostUser(TemporaryUserCR user)
        {
            if (_context.Users == null)
            {
                return Problem("Entity set 'ApplicationDbContext.Users'  is null.");
            }

            int roleId = !string.IsNullOrEmpty(user.Role)
                ? MapRoleToRoleId(user.Role)
                : 2;

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Username = user.Username,
                Email = user.Email,
                ImmutableName = user.Username.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.Password),
                DateRegistered = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow,
                RoleId = roleId,
                IsDeleted = false,
                ProfileImageUrl = string.Empty
            };
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetUser", new { id = newUser.Id }, newUser);
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            if (_context.Users == null)
            {
                return NotFound();
            }
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            user.IsDeleted = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UserExists(Guid id)
        {
            return (_context.Users?.Any(e => e.Id == id)).GetValueOrDefault();
        }
    }
}
