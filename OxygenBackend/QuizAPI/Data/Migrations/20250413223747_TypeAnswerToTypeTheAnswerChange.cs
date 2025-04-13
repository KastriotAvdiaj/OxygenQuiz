using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class TypeAnswerToTypeTheAnswerChange : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TypeAnswerQuestion_CorrectAnswer",
                table: "Questions",
                newName: "TypeTheAnswerQuestion_CorrectAnswer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TypeTheAnswerQuestion_CorrectAnswer",
                table: "Questions",
                newName: "TypeAnswerQuestion_CorrectAnswer");
        }
    }
}
