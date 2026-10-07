using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Classroom;
using QuizAPI.Services.Classroom;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.Roles;

namespace QuizAPI.Controllers.Classroom
{
    /// <summary>
    /// A Teacher's Classes (docs/quiz/classroom.md, "Classes"). Teacher or SuperAdmin
    /// (<see cref="RoleRules.HostRoles"/>); every call is clamped
    /// to the caller's own Classes in the repository, so another Teacher's id is a 404.
    /// </summary>
    [ApiController]
    [Authorize(Roles = RoleRules.HostRoles)]
    [Route("api/classes")]
    public class ClassesController : ControllerBase
    {
        private readonly IClassService _classes;
        private readonly ICurrentUserService _current;

        public ClassesController(IClassService classes, ICurrentUserService current)
        {
            _classes = classes;
            _current = current;
        }

        private Guid TeacherId => _current.UserId ?? throw new InvalidOperationException("User ID not found or invalid");

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<ClassDTO>>> List(CancellationToken ct) => Ok(await _classes.ListAsync(TeacherId, ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ClassDTO>> Get(int id, CancellationToken ct) => Ok(await _classes.GetAsync(id, TeacherId, ct));

        [HttpPost]
        public async Task<ActionResult<ClassDTO>> Create([FromBody] SaveClassDTO dto, CancellationToken ct)
        {
            var created = await _classes.CreateAsync(TeacherId, dto, ct);
            return Created($"/api/classes/{created.Id}", created);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ClassDTO>> Update(int id, [FromBody] SaveClassDTO dto, CancellationToken ct) =>
            Ok(await _classes.UpdateAsync(id, TeacherId, dto, ct));

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            await _classes.DeleteAsync(id, TeacherId, ct);
            return NoContent();
        }
    }
}
