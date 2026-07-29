using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <summary>
    /// Data-only migration accompanying the QuizScoring change from a 10-point base to a
    /// 1000-point base (see <c>Services/Scoring/QuizScoring.cs</c>). Historical scores were
    /// recorded on the old scale; multiplying them by 100 keeps every past session, leaderboard
    /// entry, and profile stat directly comparable with newly played sessions.
    ///
    /// Written by hand (no model change, so no scaffolding needed). The Designer snapshot is a
    /// verbatim copy of the model as of AddExternalLogins.
    ///
    /// Also creates the covering index for the profile history/stats read path
    /// (sessions by user, filtered on completion, newest first) via raw SQL — IF NOT EXISTS keeps
    /// it idempotent and out of the EF model on purpose: it's a pure read optimisation the model
    /// doesn't need to know about.
    /// </summary>
    public partial class RescaleScoresToHighResolutionBase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rescale historical per-answer scores and session totals to the new 1000-point base.
            // Runs exactly once — EF's __EFMigrationsHistory guards against re-application, and
            // this deploys atomically with the QuizScoring change so no new-scale rows can exist yet.
            migrationBuilder.Sql("""UPDATE "UserAnswers" SET "Score" = "Score" * 100;""");
            migrationBuilder.Sql("""UPDATE "QuizSessions" SET "TotalScore" = "TotalScore" * 100;""");

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_QuizSessions_UserId_IsCompleted_StartTime"
                ON "QuizSessions" ("UserId", "IsCompleted", "StartTime" DESC);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_QuizSessions_UserId_IsCompleted_StartTime";""");

            // Integer division mirrors the Up scaling; sub-100 remainders can only exist for rows
            // written AFTER the rescale, which a rollback is expected to discard anyway.
            migrationBuilder.Sql("""UPDATE "QuizSessions" SET "TotalScore" = "TotalScore" / 100;""");
            migrationBuilder.Sql("""UPDATE "UserAnswers" SET "Score" = "Score" / 100;""");
        }
    }
}
