using System.Text.Json;
using Xunit;

namespace QuizAPI.Tests.Associations;

/// <summary>
/// What the client may see (docs/quiz/associations.md, "What the client sees"). A hidden value that
/// reaches the browser is not hidden, so these tests serialise real responses — the whole JSON, not
/// the fields someone thought to check — and search it for the secrets.
///
/// <para>The same kind of pin the Classic answer key has (<c>RoundQuestion</c> vs
/// <c>RoundQuestionView</c>, docs/quiz/multiplayer.md §1): a field added to a view DTO that leaks
/// fails here without anyone having to remember to add an assertion.</para>
/// </summary>
public class AssociationViewSecrecyTests
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task A_half_played_board_sends_no_closed_tile_and_no_unsolved_solution()
    {
        var world = new PlayWorld();
        var player = PlayWorld.PlayerId;
        var start = await world.Call(s => s.StartAsync(player, world.QuizId, null));
        await world.Call(s => s.OpenTileAsync(start.SessionId, player, world.Tiles[1][0]));
        await world.Call(s => s.GuessAsync(start.SessionId, player, "A", "Solution A"));
        var wrong = await world.Call(s => s.GuessAsync(start.SessionId, player, "C", "Not it"));

        foreach (var json in new[]
        {
            JsonSerializer.Serialize(wrong, Web),
            JsonSerializer.Serialize(await world.Call(s => s.GetAsync(start.SessionId, player, false)), Web),
            JsonSerializer.Serialize(await world.Call(s => s.StartAsync(player, world.QuizId, null)), Web),   // the resume answer
        })
        {
            // Revealed: column A (solved) and B1 (opened).
            Assert.Contains("\"A4\"", json);
            Assert.Contains("\"B1\"", json);
            Assert.Contains("Solution A", json);

            // Hidden: every other Tile, every other solution, and the Final.
            foreach (var hidden in new[] { "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D1", "D2", "D3", "D4" })
                Assert.DoesNotContain($"\"{hidden}\"", json);
            Assert.DoesNotContain("Solution B", json);
            Assert.DoesNotContain("Solution C", json);
            Assert.DoesNotContain("Solution D", json);
            Assert.DoesNotContain("\"Final\"", json);
            Assert.DoesNotContain("The final", json);
        }
    }

    [Fact]
    public async Task A_finished_board_is_revealed_but_never_its_other_spellings()
    {
        var world = new PlayWorld();
        var start = await world.Call(s => s.StartAsync(PlayWorld.PlayerId, world.QuizId, null));
        var over = await world.Call(s => s.GiveUpAsync(start.SessionId, PlayWorld.PlayerId));

        var json = JsonSerializer.Serialize(over, Web);

        Assert.Contains("\"D4\"", json);
        Assert.Contains("Solution D", json);
        Assert.Contains("\"Final\"", json);
        // FinalAcceptableSolutions is ["The final"]: acceptable spellings are never sent.
        Assert.DoesNotContain("The final", json);
        Assert.DoesNotContain("cceptable", json);
    }
}
