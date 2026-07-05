using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.ManyToManyTables;
using Xunit;

namespace QuizAPI.Tests.Editing;

/// <summary>
/// Unit tests for the copy-on-write quiz-edit diff (see docs/quiz/quiz-editing.md). The core invariant
/// under test: an edit NEVER mutates or deletes an existing live join row — it only retires rows
/// (RemovedInVersion) and inserts new ones — so in-flight sessions pinned to an older quiz version
/// keep replaying exactly the question set, order, points and time limits they started with.
/// </summary>
public class QuizQuestionVersioningTests
{
    private const int QuizId = 7;

    private static QuizQuestion LiveRow(
        int id, int questionId, int order,
        int timeLimit = 10,
        PointSystem points = PointSystem.Standard,
        int createdInVersion = 1) => new()
        {
            Id = id,
            QuizId = QuizId,
            QuestionId = questionId,
            OrderInQuiz = order,
            TimeLimitInSeconds = timeLimit,
            PointSystem = points,
            CreatedInVersion = createdInVersion,
            RemovedInVersion = null,
        };

    private static QuizQuestionUM Incoming(
        int questionId, int order, int timeLimit = 10, string points = "Standard") => new()
        {
            QuestionId = questionId,
            OrderInQuiz = order,
            TimeLimitInSeconds = timeLimit,
            PointSystem = points,
        };

    // ── Basic operations ─────────────────────────────────────────────────────

    [Fact]
    public void UnchangedQuestions_AreLeftCompletelyAlone()
    {
        var live = new[] { LiveRow(1, 101, 1), LiveRow(2, 102, 2) };
        var incoming = new[] { Incoming(101, 1), Incoming(102, 2) };

        var diff = QuizQuestionVersioning.Diff(live, incoming, QuizId, newVersion: 2);

        Assert.Empty(diff.ToRetire);
        Assert.Empty(diff.ToAdd);
        Assert.False(diff.HasQuestionChanges);
    }

    [Fact]
    public void RemovedQuestion_IsRetired_NeverDeleted()
    {
        var live = new[] { LiveRow(1, 101, 1), LiveRow(2, 102, 2) };
        var incoming = new[] { Incoming(101, 1) }; // 102 dropped

        var diff = QuizQuestionVersioning.Diff(live, incoming, QuizId, newVersion: 2);

        var retired = Assert.Single(diff.ToRetire);
        Assert.Equal(102, retired.QuestionId);
        Assert.Empty(diff.ToAdd);
        // The diff must hand back the SAME tracked entity so the caller can stamp it —
        // never a copy, and never a hard delete.
        Assert.Same(live[1], retired);
    }

    [Fact]
    public void AddedQuestion_GetsFreshRow_StampedWithNewVersion()
    {
        var live = new[] { LiveRow(1, 101, 1) };
        var incoming = new[] { Incoming(101, 1), Incoming(103, 2, timeLimit: 20) };

        var diff = QuizQuestionVersioning.Diff(live, incoming, QuizId, newVersion: 2);

        Assert.Empty(diff.ToRetire);
        var added = Assert.Single(diff.ToAdd);
        Assert.Equal(103, added.QuestionId);
        Assert.Equal(QuizId, added.QuizId);
        Assert.Equal(20, added.TimeLimitInSeconds);
        Assert.Equal(2, added.CreatedInVersion);
        Assert.Null(added.RemovedInVersion);
    }

    // ── Copy-on-write: settings changes never mutate in place ────────────────

    [Fact]
    public void ChangedTimeLimit_RetiresOldRow_AndInsertsReplacement()
    {
        var oldRow = LiveRow(1, 101, 1, timeLimit: 10);
        var incoming = new[] { Incoming(101, 1, timeLimit: 30) };

        var diff = QuizQuestionVersioning.Diff(new[] { oldRow }, incoming, QuizId, newVersion: 2);

        Assert.Same(oldRow, Assert.Single(diff.ToRetire));
        var replacement = Assert.Single(diff.ToAdd);
        Assert.Equal(101, replacement.QuestionId);
        Assert.Equal(30, replacement.TimeLimitInSeconds);
        Assert.Equal(2, replacement.CreatedInVersion);

        // Crucial: the old row object itself was not modified by the diff — the caller
        // stamps RemovedInVersion, and the row's gameplay fields stay what players saw.
        Assert.Equal(10, oldRow.TimeLimitInSeconds);
    }

    [Fact]
    public void ChangedPointSystem_IsCopyOnWrite()
    {
        var oldRow = LiveRow(1, 101, 1, points: PointSystem.Standard);
        var incoming = new[] { Incoming(101, 1, points: "Double") };

        var diff = QuizQuestionVersioning.Diff(new[] { oldRow }, incoming, QuizId, newVersion: 5);

        Assert.Single(diff.ToRetire);
        Assert.Equal(PointSystem.Double, Assert.Single(diff.ToAdd).PointSystem);
    }

    [Fact]
    public void Reordering_RewritesTheMovedRows()
    {
        var live = new[] { LiveRow(1, 101, 1), LiveRow(2, 102, 2) };
        // Client swaps the two questions (relative order is what counts).
        var incoming = new[] { Incoming(102, 1), Incoming(101, 2) };

        var diff = QuizQuestionVersioning.Diff(live, incoming, QuizId, newVersion: 2);

        Assert.Equal(2, diff.ToRetire.Count);
        Assert.Equal(2, diff.ToAdd.Count);
        Assert.Equal(1, diff.ToAdd.Single(r => r.QuestionId == 102).OrderInQuiz);
        Assert.Equal(2, diff.ToAdd.Single(r => r.QuestionId == 101).OrderInQuiz);
    }

    [Fact]
    public void IncomingOrder_IsNormalisedByRelativePosition_NotAbsoluteNumbers()
    {
        // Client sends gaps/odd numbers; the server stores 1..n like create does.
        var incoming = new[] { Incoming(101, 40), Incoming(102, 7), Incoming(103, 99) };

        var diff = QuizQuestionVersioning.Diff(
            Array.Empty<QuizQuestion>(), incoming, QuizId, newVersion: 1);

        Assert.Equal(1, diff.ToAdd.Single(r => r.QuestionId == 102).OrderInQuiz);
        Assert.Equal(2, diff.ToAdd.Single(r => r.QuestionId == 101).OrderInQuiz);
        Assert.Equal(3, diff.ToAdd.Single(r => r.QuestionId == 103).OrderInQuiz);
    }

    // ── Guard rails ──────────────────────────────────────────────────────────

    [Fact]
    public void DuplicateQuestionIds_AreRejected()
    {
        var incoming = new[] { Incoming(101, 1), Incoming(101, 2) };

        Assert.Throws<InvalidOperationException>(() =>
            QuizQuestionVersioning.Diff(Array.Empty<QuizQuestion>(), incoming, QuizId, 2));
    }

    [Fact]
    public void AlreadyRetiredRows_AreIgnoredByTheDiff()
    {
        var retired = LiveRow(1, 101, 1);
        retired.RemovedInVersion = 2; // retired in an earlier edit

        // Re-adding the same question after it was removed must produce a NEW row,
        // not resurrect or re-retire the old one.
        var diff = QuizQuestionVersioning.Diff(
            new[] { retired }, new[] { Incoming(101, 1) }, QuizId, newVersion: 3);

        Assert.Empty(diff.ToRetire);
        var readded = Assert.Single(diff.ToAdd);
        Assert.Equal(101, readded.QuestionId);
        Assert.Equal(3, readded.CreatedInVersion);
    }

    // ── Version visibility: what an in-flight session actually sees ──────────

    [Fact]
    public void IsVisibleToVersion_CoversTheRowsLifetime()
    {
        var row = LiveRow(1, 101, 1, createdInVersion: 2);
        row.RemovedInVersion = 4;

        Assert.False(row.IsVisibleToVersion(1)); // didn't exist yet
        Assert.True(row.IsVisibleToVersion(2));  // created here
        Assert.True(row.IsVisibleToVersion(3));  // still live
        Assert.False(row.IsVisibleToVersion(4)); // retired here
        Assert.False(row.IsVisibleToVersion(5));
    }

    [Fact]
    public void LiveRow_IsVisibleToEveryVersionFromCreation()
    {
        var row = LiveRow(1, 101, 1, createdInVersion: 3);

        Assert.False(row.IsVisibleToVersion(2));
        Assert.True(row.IsVisibleToVersion(3));
        Assert.True(row.IsVisibleToVersion(100));
    }

    /// <summary>
    /// End-to-end simulation of the concurrency scenario the design exists for: a player starts
    /// on version 1, then the owner removes a question, changes another and adds a third. The
    /// pinned session must keep seeing exactly the v1 rows; a new session sees only the v2 rows.
    /// </summary>
    [Fact]
    public void InFlightSession_KeepsItsVersion_WhileNewSessionsGetTheEdit()
    {
        var q1 = LiveRow(1, 101, 1, timeLimit: 10);
        var q2 = LiveRow(2, 102, 2, timeLimit: 15);
        var table = new List<QuizQuestion> { q1, q2 };

        // Owner edits while a session pinned to version 1 is in flight:
        // drop 102, change 101's time limit, add 103.
        var incoming = new[] { Incoming(101, 1, timeLimit: 30), Incoming(103, 2) };
        var diff = QuizQuestionVersioning.Diff(table, incoming, QuizId, newVersion: 2);

        foreach (var row in diff.ToRetire) row.RemovedInVersion = 2; // what UpdateQuizAsync does
        table.AddRange(diff.ToAdd);

        // The in-flight session (pinned to v1) still sees the original two rows, untouched.
        var v1View = table.Where(r => r.IsVisibleToVersion(1)).OrderBy(r => r.OrderInQuiz).ToList();
        Assert.Equal(new[] { 1, 2 }, v1View.Select(r => r.Id));
        Assert.Equal(10, v1View[0].TimeLimitInSeconds);
        Assert.Equal(15, v1View[1].TimeLimitInSeconds);

        // A session started after the edit (pinned to v2) sees the new content only.
        var v2View = table.Where(r => r.IsVisibleToVersion(2)).OrderBy(r => r.OrderInQuiz).ToList();
        Assert.Equal(new[] { 101, 103 }, v2View.Select(r => r.QuestionId));
        Assert.Equal(30, v2View[0].TimeLimitInSeconds);

        // And nothing was ever deleted: all four rows still exist for history/FKs.
        Assert.Equal(4, table.Count);
    }
}
