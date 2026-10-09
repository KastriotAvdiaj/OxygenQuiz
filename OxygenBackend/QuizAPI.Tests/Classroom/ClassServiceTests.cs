using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.DTOs.Classroom;
using QuizAPI.Exceptions;
using QuizAPI.Repositories;
using QuizAPI.Services.Classroom;
using QuizAPI.Tests.Associations;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Classroom;

/// <summary>A Teacher's Classes (docs/quiz/classroom.md, "Classes"): ownership, limits, cleaning.</summary>
public class ClassServiceTests
{
    private static readonly Guid Teacher = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    private sealed class World
    {
        private readonly string _db = Guid.NewGuid().ToString();
        public readonly TestClock Clock = new();

        public async Task<T> Call<T>(Func<ClassService, Task<T>> call)
        {
            await using var ctx = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(_db).Options, new TestCurrentUserService());
            return await call(new ClassService(new ClassRepository(ctx), Clock, NoPlanLimits.Instance));
        }

        public Task Do(Func<ClassService, Task> call) => Call(async s => { await call(s); return 0; });
    }

    private static SaveClassDTO Dto(string name, params string[] students) => new() { Name = name, Students = students.ToList() };

    [Fact]
    public async Task Create_CleansNames_DropsBlankLines_AndKeepsTheOrder()
    {
        var world = new World();
        var created = await world.Call(s => s.CreateAsync(Teacher, Dto("  7B  ", "Arta", "", "  Blerim   K. ", "   ", "Arta")));

        Assert.Equal("7B", created.Name);
        Assert.Equal(new[] { "Arta", "Blerim K.", "Arta" }, created.Students);
        var read = await world.Call(s => s.GetAsync(created.Id, Teacher));
        Assert.Equal(created.Students, read.Students);
    }

    [Fact]
    public async Task AnotherTeachersClass_IsNotFound_ForEveryOperation()
    {
        var world = new World();
        var mine = await world.Call(s => s.CreateAsync(Teacher, Dto("7B", "Arta")));

        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.GetAsync(mine.Id, Other)));
        await Assert.ThrowsAsync<NotFoundException>(() => world.Call(s => s.UpdateAsync(mine.Id, Other, Dto("Mine now"))));
        await Assert.ThrowsAsync<NotFoundException>(() => world.Do(s => s.DeleteAsync(mine.Id, Other)));
        Assert.Empty(await world.Call(s => s.ListAsync(Other)));
        Assert.Single(await world.Call(s => s.ListAsync(Teacher)));
    }

    [Fact]
    public async Task FortyStudentsFit_FortyOneDoNot()
    {
        var world = new World();
        var forty = Enumerable.Range(1, 40).Select(i => $"S{i}").ToArray();
        await world.Call(s => s.CreateAsync(Teacher, Dto("Big", forty)));

        await Assert.ThrowsAsync<AppValidationException>(() =>
            world.Call(s => s.CreateAsync(Teacher, Dto("Too big", forty.Append("S41").ToArray()))));
    }

    [Fact]
    public async Task Names_AreRequired_LimitedAndUniquePerTeacher()
    {
        var world = new World();
        await world.Call(s => s.CreateAsync(Teacher, Dto("7B")));

        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.CreateAsync(Teacher, Dto("   "))));
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.CreateAsync(Teacher, Dto(new string('x', 41)))));
        await Assert.ThrowsAsync<AppValidationException>(() => world.Call(s => s.CreateAsync(Teacher, Dto("8A", new string('y', 31)))));
        await Assert.ThrowsAsync<ConflictException>(() => world.Call(s => s.CreateAsync(Teacher, Dto("7b"))));
        // Another Teacher's 7B doesn't clash.
        await world.Call(s => s.CreateAsync(Other, Dto("7B")));
    }

    [Fact]
    public async Task Update_ReplacesTheList_AndMayKeepItsOwnName()
    {
        var world = new World();
        var created = await world.Call(s => s.CreateAsync(Teacher, Dto("7B", "Arta", "Blerim")));

        var updated = await world.Call(s => s.UpdateAsync(created.Id, Teacher, Dto("7B", "Dea")));

        Assert.Equal(new[] { "Dea" }, updated.Students);
        Assert.Equal(new[] { "Dea" }, (await world.Call(s => s.GetAsync(created.Id, Teacher))).Students);
    }

    [Fact]
    public async Task Delete_RemovesIt()
    {
        var world = new World();
        var created = await world.Call(s => s.CreateAsync(Teacher, Dto("7B", "Arta")));

        await world.Do(s => s.DeleteAsync(created.Id, Teacher));

        Assert.Empty(await world.Call(s => s.ListAsync(Teacher)));
    }
}
