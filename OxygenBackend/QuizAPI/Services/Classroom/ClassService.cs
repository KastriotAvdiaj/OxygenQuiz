using QuizAPI.DTOs.Classroom;
using QuizAPI.Exceptions;
using QuizAPI.Models.Classroom;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Classroom
{
    public interface IClassService
    {
        Task<IReadOnlyList<ClassDTO>> ListAsync(Guid teacherId, CancellationToken ct = default);
        Task<ClassDTO> GetAsync(int id, Guid teacherId, CancellationToken ct = default);
        Task<ClassDTO> CreateAsync(Guid teacherId, SaveClassDTO dto, CancellationToken ct = default);
        Task<ClassDTO> UpdateAsync(int id, Guid teacherId, SaveClassDTO dto, CancellationToken ct = default);
        Task DeleteAsync(int id, Guid teacherId, CancellationToken ct = default);
    }

    /// <summary>
    /// A Teacher's Classes (docs/quiz/classroom.md, "Classes"). The rules: a name, unique per
    /// Teacher; up to <see cref="Class.MaxStudents"/> students, each a non-empty first name; blank
    /// lines dropped, whitespace collapsed. Duplicate names are allowed — two Arta in one class
    /// happens, and the Teacher tells them apart.
    /// </summary>
    public class ClassService : IClassService
    {
        private readonly IClassRepository _classes;
        private readonly TimeProvider _clock;

        public ClassService(IClassRepository classes, TimeProvider clock)
        {
            _classes = classes;
            _clock = clock;
        }

        public async Task<IReadOnlyList<ClassDTO>> ListAsync(Guid teacherId, CancellationToken ct = default) =>
            (await _classes.ListAsync(teacherId, ct)).Select(ToDto).ToList();

        public async Task<ClassDTO> GetAsync(int id, Guid teacherId, CancellationToken ct = default) =>
            ToDto(await _classes.GetAsync(id, teacherId, ct: ct) ?? throw new NotFoundException("No such class."));

        public async Task<ClassDTO> CreateAsync(Guid teacherId, SaveClassDTO dto, CancellationToken ct = default)
        {
            var (name, students) = await ValidateAsync(teacherId, dto, null, ct);
            var now = _clock.GetUtcNow().UtcDateTime;
            var @class = new Class
            {
                OwnerUserId = teacherId,
                Name = name,
                CreatedAt = now,
                UpdatedAt = now,
                Students = students.Select((s, i) => new ClassStudent { Name = s, Order = i }).ToList(),
            };
            await _classes.AddAsync(@class, ct);
            await _classes.SaveChangesAsync(ct);
            return ToDto(@class);
        }

        public async Task<ClassDTO> UpdateAsync(int id, Guid teacherId, SaveClassDTO dto, CancellationToken ct = default)
        {
            var @class = await _classes.GetAsync(id, teacherId, tracked: true, ct)
                ?? throw new NotFoundException("No such class.");
            var (name, students) = await ValidateAsync(teacherId, dto, id, ct);

            @class.Name = name;
            @class.UpdatedAt = _clock.GetUtcNow().UtcDateTime;
            @class.Students.Clear();
            @class.Students.AddRange(students.Select((s, i) => new ClassStudent { Name = s, Order = i }));
            await _classes.SaveChangesAsync(ct);
            return ToDto(@class);
        }

        public async Task DeleteAsync(int id, Guid teacherId, CancellationToken ct = default)
        {
            var @class = await _classes.GetAsync(id, teacherId, tracked: true, ct)
                ?? throw new NotFoundException("No such class.");
            _classes.Remove(@class);
            await _classes.SaveChangesAsync(ct);
        }

        private async Task<(string Name, List<string> Students)> ValidateAsync(Guid teacherId, SaveClassDTO dto, int? id, CancellationToken ct)
        {
            var name = Clean(dto.Name);
            if (name.Length == 0) throw new AppValidationException("Give the class a name.");
            if (name.Length > Class.MaxNameLength)
                throw new AppValidationException($"A class name can be at most {Class.MaxNameLength} characters.");
            if (await _classes.NameTakenAsync(teacherId, name, id, ct))
                throw new ConflictException($"You already have a class called \"{name}\".");

            var students = (dto.Students ?? new()).Select(Clean).Where(s => s.Length > 0).ToList();
            if (students.Count > Class.MaxStudents)
                throw new AppValidationException($"A class can have at most {Class.MaxStudents} students.");
            var tooLong = students.FirstOrDefault(s => s.Length > ClassStudent.MaxNameLength);
            if (tooLong is not null)
                throw new AppValidationException($"\"{tooLong}\" is longer than {ClassStudent.MaxNameLength} characters.");
            return (name, students);
        }

        /// <summary>Trims and collapses inner whitespace, so "  Arta   B. " is "Arta B.".</summary>
        internal static string Clean(string? value) =>
            string.Join(' ', (value ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

        private static ClassDTO ToDto(Class c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Students = c.Students.OrderBy(s => s.Order).Select(s => s.Name).ToList(),
            UpdatedAt = c.UpdatedAt,
        };
    }
}
