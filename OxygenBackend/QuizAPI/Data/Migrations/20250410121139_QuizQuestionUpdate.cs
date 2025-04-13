using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class QuizQuestionUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AnswerOptions_Questions_MultipleChoiceQuestionId",
                table: "AnswerOptions");

            migrationBuilder.DropIndex(
                name: "IX_AnswerOptions_MultipleChoiceQuestionId",
                table: "AnswerOptions");

            migrationBuilder.DropColumn(
                name: "PointSystem",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "TimeLimitInSeconds",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "MultipleChoiceQuestionId",
                table: "AnswerOptions");

            migrationBuilder.RenameColumn(
                name: "Score",
                table: "QuizQuestions",
                newName: "TimeLimitInSeconds");

            migrationBuilder.AddColumn<int>(
                name: "PointSystem",
                table: "QuizQuestions",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PointSystem",
                table: "QuizQuestions");

            migrationBuilder.RenameColumn(
                name: "TimeLimitInSeconds",
                table: "QuizQuestions",
                newName: "Score");

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
    }
}
