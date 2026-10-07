using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Models.Associations;
using QuizAPI.Models.Classroom;
using QuizAPI.Services.AccountClosure;
using QuizAPI.Services.Associations;
using QuizAPI.Services.Audit;
using QuizAPI.Services.Email;
using QuizAPI.Tests.TestSupport;
using Xunit;

namespace QuizAPI.Tests.Classroom;

/// <summary>
/// A Teacher's students' names are other people's personal data, kept for that account only:
/// anonymising the account removes the Classes and blanks the names on hosted games' Teams,
/// while the games stay as a record (docs/quiz/classroom.md).
/// </summary>
public class TeacherAccountClosureTests
{
    [Fact]
    public async Task Anonymising_ATeacher_RemovesTheirClasses_AndTheStudentsOnTheirGames()
    {
        await using var ctx = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
            new TestCurrentUserService());
        var teacher = new User
        {
            Id = Guid.NewGuid(), Username = "teacher", ImmutableName = "teacher", Email = "t@example.com",
            PasswordHash = "x", ProfileImageUrl = string.Empty,
            DeletionRequestedAt = DateTime.UtcNow.AddDays(-31), IsDeleted = true,
        };
        ctx.Users.Add(teacher);
        ctx.Classes.Add(new Class { OwnerUserId = teacher.Id, Name = "7B", Students = { new ClassStudent { Name = "Arta" } } });
        var game = new AssociationGame { Id = Guid.NewGuid(), BoardId = 1, PlayStyle = PlayStyle.Hosted, HostUserId = teacher.Id, SeatCount = 2, RulesJson = "{}" };
        game.Teams.Add(new HostedTeam { Seat = 0, Name = "Red", Colour = "red", StudentsJson = "[\"Arta\"]" });
        game.Teams.Add(new HostedTeam { Seat = 1, Name = "Blue", Colour = "blue", StudentsJson = "[\"Blerim\"]" });
        ctx.AssociationGames.Add(game);
        await ctx.SaveChangesAsync();

        var sut = new AccountClosureService(ctx, new Mock<IAuditService>().Object,
            Options.Create(new AccountClosureOptions { GracePeriodDays = 30 }), NullLogger<AccountClosureService>.Instance,
            new Mock<IEmailSender>().Object, new ConfigurationBuilder().Build());
        Assert.Equal(1, await sut.AnonymisePendingAsync());

        Assert.Empty(ctx.Classes);
        Assert.Empty(ctx.ClassStudents);
        var teams = await ctx.HostedTeams.AsNoTracking().OrderBy(t => t.Seat).ToListAsync();
        Assert.Equal(new[] { "Red", "Blue" }, teams.Select(t => t.Name));   // the game is still a record
        Assert.All(teams, t => Assert.Equal("[]", t.StudentsJson));
    }
}
