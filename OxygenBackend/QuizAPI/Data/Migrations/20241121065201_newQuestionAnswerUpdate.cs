using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class newQuestionAnswerUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_AnswerOptions_CorrectAnswerOptionId",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_CorrectAnswerOptionId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CorrectAnswerOptionId",
                table: "Questions");

            migrationBuilder.AddColumn<bool>(
                name: "IsCorrect",
                table: "AnswerOptions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsCorrect",
                table: "AnswerOptions");

            migrationBuilder.AddColumn<int>(
                name: "CorrectAnswerOptionId",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Questions_CorrectAnswerOptionId",
                table: "Questions",
                column: "CorrectAnswerOptionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_AnswerOptions_CorrectAnswerOptionId",
                table: "Questions",
                column: "CorrectAnswerOptionId",
                principalTable: "AnswerOptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
