using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Files.Services;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// The generic file store has no HTTP surface (docs/media/file-storage.md, "No public endpoints").
///
/// <para>It used to: <c>FilesController</c> exposed upload, list and delete under
/// <c>/api/files</c> to any signed-in caller, with no ownership check — anyone could delete any
/// file by id, list any owner's files, and write up to 100 MB of unchecked bytes under an
/// owner name they made up. Nothing in the SPA called it; avatars reach
/// <see cref="IFileService"/> through <c>AvatarService</c>, which decides the owner itself.</para>
///
/// <para>Checked by reflection over the whole API assembly, so a controller that injects the
/// store again — under any name or route — fails here and has to be a deliberate, reviewed
/// change with its own ownership rules.</para>
/// </summary>
public class FileStoreEndpointsTests
{
    private static IEnumerable<Type> Controllers() =>
        typeof(IFileService).Assembly.GetTypes()
            .Where(t => !t.IsAbstract && typeof(ControllerBase).IsAssignableFrom(t));

    [Fact]
    public void No_controller_hands_the_file_store_to_callers_directly()
    {
        var exposing = Controllers()
            .Where(t => t.GetConstructors()
                .SelectMany(c => c.GetParameters())
                .Any(p => p.ParameterType == typeof(IFileService)))
            .Select(t => t.Name)
            .ToList();

        Assert.Empty(exposing);
    }

    [Fact]
    public void The_reflection_actually_sees_the_api_controllers()
    {
        // Guards the check above against silently scanning nothing (a moved assembly, a renamed
        // base type): a controller we know exists must be in the set.
        Assert.Contains(Controllers(), t => t.Name == "QuestionsController");
    }
}
