using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Usht
{

    public class UniversityDTO
    {
        public string Name { get; set; }
        public string City { get; set; }

    }

    [Route("api/[controller]")]
    [ApiController]
    public class UniversityController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UniversityController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Universitys
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Universiteti>>> GetUniversitys()
        {
            if (_context.Universitetet == null)
            {
                return NotFound();
            }
            return await _context.Universitetet.ToListAsync();
        }

        // GET: api/Universitys/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Universiteti>> GetUniversity(int id)
        {
            if (_context.Universitetet == null)
            {
                return NotFound();
            }
            var University = await _context.Universitetet.FindAsync(id);

            if (University == null)
            {
                return NotFound();
            }

            return University;
        }

        // PUT: api/Universitys/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUniversity(int id, UniversityDTO NewUniversity)
        {
            var University = _context.Universitetet.FirstOrDefault(e => e.Id == id);

            University.City = NewUniversity.City;
            University.Name = NewUniversity.Name;


            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UniversityExists(id))
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

        // POST: api/Universitys
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Universiteti>> PostUniversity(UniversityDTO RUniversitet)
        {
            if (_context.Universitetet == null)
            {
                return Problem("Entity set 'ApplicationDbContext.Universitys'  is null.");
            }

            var newUniversity = new Universiteti
            {
                Name = RUniversitet.Name,
                City = RUniversitet.City
            };
            _context.Universitetet.Add(newUniversity);
            await _context.SaveChangesAsync();

            return Ok(newUniversity);
        }

        // DELETE: api/Universitys/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUniversity(int id)
        {
            if (_context.Universitetet == null)
            {
                return NotFound();
            }
            var University = await _context.Universitetet.FindAsync(id);
            if (University == null)
            {
                return NotFound();
            }

            _context.Universitetet.Remove(University);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool UniversityExists(int id)
        {
            return (_context.Universitetet?.Any(e => e.Id == id)).GetValueOrDefault();
        }
    }
}
