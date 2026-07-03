using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class QuizEditingVersioning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuizQuestions_QuizId_QuestionId",
                table: "QuizQuestions");

            migrationBuilder.AddColumn<int>(
                name: "QuizVersion",
                table: "QuizSessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CreatedInVersion",
                table: "QuizQuestions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RemovedInVersion",
                table: "QuizQuestions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestions_QuizId_QuestionId",
                table: "QuizQuestions",
                columns: new[] { "QuizId", "QuestionId" },
                unique: true,
                filter: "\"RemovedInVersion\" IS NULL");


            // Backfill: pre-existing sessions must pin to their quiz's CURRENT version,
            // not the column default (0), or they'd see no questions / wrong versions.
            migrationBuilder.Sql("""
                UPDATE "QuizSessions" s
                SET    "QuizVersion" = q."Version"
                FROM   "Quizzes" q
                WHERE  s."QuizId" = q."Id";
                """);

            // Pre-existing join rows have been part of their quiz since version 1.
            migrationBuilder.Sql("""
                UPDATE "QuizQuestions"
                SET    "CreatedInVersion" = 1
                WHERE  "CreatedInVersion" = 0;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuizQuestions_QuizId_QuestionId",
                table: "QuizQuestions");

            migrationBuilder.DropColumn(
                name: "QuizVersion",
                table: "QuizSessions");

            migrationBuilder.DropColumn(
                name: "CreatedInVersion",
                table: "QuizQuestions");

            migrationBuilder.DropColumn(
                name: "RemovedInVersion",
                table: "QuizQuestions");

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestions_QuizId_QuestionId",
                table: "QuizQuestions",
                columns: new[] { "QuizId", "QuestionId" },
                unique: true);
        }
    }
}
