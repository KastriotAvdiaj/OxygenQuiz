using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <summary>
    /// Collapses the Quizzes Visibility / IsPublished / IsActive trio into a single Status enum
    /// (0 = Draft, 1 = Unlisted, 2 = Public) and adds the nullable ShareToken that backs Unlisted
    /// share links. See docs/quiz-visibility.md.
    ///
    /// The Visibility column is renamed to Status (both int), then its values are remapped from the
    /// old QuizVisibility (Private=0, Public=1, Friends=2) using IsActive/IsPublished — done BEFORE
    /// those two columns are dropped:
    ///   - active + published + Public visibility  → Public   (2)
    ///   - active + published + Private/Friends     → Unlisted (1)
    ///   - everything else (drafts / inactive)      → Draft    (0)
    /// </summary>
    /// <inheritdoc />
    public partial class ReworkQuizVisibilityToStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShareToken",
                table: "Quizzes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_ShareToken",
                table: "Quizzes",
                column: "ShareToken",
                unique: true,
                filter: "\"ShareToken\" IS NOT NULL");

            // Rename first so the column survives (preserving values), then remap them below.
            migrationBuilder.RenameColumn(
                name: "Visibility",
                table: "Quizzes",
                newName: "Status");

            migrationBuilder.RenameIndex(
                name: "IX_Quizzes_UserId_Visibility_Id",
                table: "Quizzes",
                newName: "IX_Quizzes_UserId_Status_Id");

            // At this point "Status" still holds the old QuizVisibility ints. Remap while the
            // IsActive / IsPublished columns are still present.
            migrationBuilder.Sql(@"
                UPDATE ""Quizzes"" SET ""Status"" = CASE
                    WHEN ""IsActive"" = TRUE AND ""IsPublished"" = TRUE AND ""Status"" = 1 THEN 2
                    WHEN ""IsActive"" = TRUE AND ""IsPublished"" = TRUE THEN 1
                    ELSE 0
                END;");

            migrationBuilder.DropColumn(name: "IsActive", table: "Quizzes");
            migrationBuilder.DropColumn(name: "IsPublished", table: "Quizzes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Quizzes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "Quizzes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Quizzes",
                newName: "Visibility");

            migrationBuilder.RenameIndex(
                name: "IX_Quizzes_UserId_Status_Id",
                table: "Quizzes",
                newName: "IX_Quizzes_UserId_Visibility_Id");

            // "Visibility" now holds the new Status ints (Draft=0, Unlisted=1, Public=2). Reverse-map
            // back to the legacy flags as best as possible.
            //   Public   → active + published + Public visibility
            //   Unlisted → active + published + Private visibility
            //   Draft    → inactive + unpublished + Private visibility
            migrationBuilder.Sql(@"
                UPDATE ""Quizzes"" SET
                    ""IsPublished"" = CASE WHEN ""Visibility"" IN (1, 2) THEN TRUE ELSE FALSE END,
                    ""IsActive""    = CASE WHEN ""Visibility"" = 0 THEN FALSE ELSE TRUE END,
                    ""Visibility""  = CASE WHEN ""Visibility"" = 2 THEN 1 ELSE 0 END;");

            migrationBuilder.DropIndex(
                name: "IX_Quizzes_ShareToken",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "ShareToken",
                table: "Quizzes");
        }
    }
}
