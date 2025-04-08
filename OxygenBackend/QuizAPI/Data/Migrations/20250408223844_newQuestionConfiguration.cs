using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class newQuestionConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AcceptableAnswers",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowMultipleSelections",
                table: "Questions",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowPartialMatch",
                table: "Questions",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CorrectAnswer",
                table: "Questions",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCaseSensitive",
                table: "Questions",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PointSystem",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TimeLimitInSeconds",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TypeAnswerQuestion_CorrectAnswer",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MultipleChoiceQuestionId",
                table: "AnswerOptions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AnswerOptions_MultipleChoiceQuestionId",
                table: "AnswerOptions",
                column: "MultipleChoiceQuestionId");

            migrationBuilder.AddForeignKey(
                name: "FK_AnswerOptions_Questions_MultipleChoiceQuestionId",
                table: "AnswerOptions",
                column: "MultipleChoiceQuestionId",
                principalTable: "Questions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AnswerOptions_Questions_MultipleChoiceQuestionId",
                table: "AnswerOptions");

            migrationBuilder.DropIndex(
                name: "IX_AnswerOptions_MultipleChoiceQuestionId",
                table: "AnswerOptions");

            migrationBuilder.DropColumn(
                name: "AcceptableAnswers",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "AllowMultipleSelections",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "AllowPartialMatch",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CorrectAnswer",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "IsCaseSensitive",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "PointSystem",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "TimeLimitInSeconds",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "TypeAnswerQuestion_CorrectAnswer",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "MultipleChoiceQuestionId",
                table: "AnswerOptions");
        }
    }
}
