﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.DTOs.Question;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace QuizAPI.Controllers.Questions
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionDifficultiesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public QuestionDifficultiesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/QuestionDifficulties
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionDifficultyDTO>>> GetQuestionDifficulties()
        {
          if (_context.QuestionDifficulties == null)
          {
              return NotFound();
          }

          var questionDifficulties = await _context.QuestionDifficulties
              .Select(qd => new QuestionDifficultyDTO
              {
                  ID = qd.ID,
                  Level = qd.Level,
                  Weight = qd.Weight,
                  CreatedAt = qd.CreatedAt,
                  Username = qd.User.Username
              })
              .ToListAsync();
            return Ok(questionDifficulties);
        }

        // GET: api/QuestionDifficulties/5
        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionDifficulty>> GetQuestionDifficulty(int id)
        {
          if (_context.QuestionDifficulties == null)
          {
              return NotFound();
          }
            var questionDifficulty = await _context.QuestionDifficulties.FindAsync(id);

            if (questionDifficulty == null)
            {
                return NotFound();
            }

            return questionDifficulty;
        }

        // PUT: api/QuestionDifficulties/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutQuestionDifficulty(int id, QuestionDifficulty questionDifficulty)
        {
            if (id != questionDifficulty.ID)
            {
                return BadRequest();
            }

            _context.Entry(questionDifficulty).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!QuestionDifficultyExists(id))
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

        // POST: api/QuestionDifficulties
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<QuestionDifficulty>> PostQuestionDifficulty(QuestionDifficultyCM questionDifficulty)
        {
            if (_context.QuestionDifficulties == null)
            {
                return Problem("Entity set 'ApplicationDbContext.QuestionDifficulties'  is null.");
            }


            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User ID not found in token." });
            }

            var qDifficulty = new QuestionDifficulty
            {
                Level = questionDifficulty.Level,
                Weight = questionDifficulty.Weight,
                CreatedAt = DateTime.UtcNow,
                UserId = Guid.Parse(userId)
            };
            _context.QuestionDifficulties.Add(qDifficulty);
            await _context.SaveChangesAsync();

            return Ok(qDifficulty);
        }

        // DELETE: api/QuestionDifficulties/5
        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuestionDifficulty(int id)
        {
            if (_context.QuestionDifficulties == null)
            {
                return NotFound();
            }
            var questionDifficulty = await _context.QuestionDifficulties.FindAsync(id);
            if (questionDifficulty == null)
            {
                return NotFound();
            }

            _context.QuestionDifficulties.Remove(questionDifficulty);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool QuestionDifficultyExists(int id)
        {
            return (_context.QuestionDifficulties?.Any(e => e.ID == id)).GetValueOrDefault();
        }
    }
}
