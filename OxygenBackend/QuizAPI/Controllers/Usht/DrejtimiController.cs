using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Controllers.Usht;
using QuizAPI.Data;
using QuizAPI.Models;

namespace QuizAPI.Controllers.Usht
{

    public class DrejtimiDTO
    {

        public string Name { get; set; }
        public string Duration { get; set; }
        public int UniversityId { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class DrejtimiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DrejtimiController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Drejtimis
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Drejtimi>>> GetDrejtimis()
        {
            if (_context.Drejtimet == null)
            {
                return NotFound();
            }
            return await _context.Drejtimet.ToListAsync();
        }

        // GET: api/Drejtimis/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Drejtimi>> GetDrejtimi(int id)
        {
            if (_context.Drejtimet == null)
            {
                return NotFound();
            }
            var Drejtimi = await _context.Drejtimet.FindAsync(id);

            if (Drejtimi == null)
            {
                return NotFound();
            }

            return Drejtimi;
        }

        // PUT: api/Drejtimis/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutDrejtimi(int id, Drejtimi Drejtimi)
        {
            if (id != Drejtimi.Id)
            {
                return BadRequest();
            }

            _context.Entry(Drejtimi).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!DrejtimiExists(id))
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

        // POST: api/Drejtimis
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Drejtimi>> PostDrejtimi(DrejtimiDTO Drejtimi)
        {
            if (_context.Drejtimet == null)
            {
                return Problem("Entity set 'ApplicationDbContext.Drejtimis'  is null.");
            }
            var NewContact = new Drejtimi
            {
                Name = Drejtimi.Name,
                Duration = Drejtimi.Duration,
                UniversitetiId = Drejtimi.UniversityId,
            };
            _context.Drejtimet.Add(NewContact);
            await _context.SaveChangesAsync();

            return Ok(NewContact);
        }

        // DELETE: api/Drejtimis/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDrejtimi(int id)
        {
            if (_context.Drejtimet == null)
            {
                return NotFound();
            }
            var Drejtimi = await _context.Drejtimet.FindAsync(id);
            if (Drejtimi == null)
            {
                return NotFound();
            }

            _context.Drejtimet.Remove(Drejtimi);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool DrejtimiExists(int id)
        {
            return (_context.Drejtimet?.Any(e => e.Id == id)).GetValueOrDefault();
        }
    }
}
