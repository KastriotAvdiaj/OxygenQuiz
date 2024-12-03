using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class QuestionCategoryMistake : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_QuestionCategory_CategoryId",
                table: "Questions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_QuestionCategory",
                table: "QuestionCategory");

            migrationBuilder.RenameTable(
                name: "QuestionCategory",
                newName: "QuestionCategories");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QuestionCategories",
                table: "QuestionCategories",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_QuestionCategories_CategoryId",
                table: "Questions",
                column: "CategoryId",
                principalTable: "QuestionCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_QuestionCategories_CategoryId",
                table: "Questions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_QuestionCategories",
                table: "QuestionCategories");

            migrationBuilder.RenameTable(
                name: "QuestionCategories",
                newName: "QuestionCategory");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QuestionCategory",
                table: "QuestionCategory",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_QuestionCategory_CategoryId",
                table: "Questions",
                column: "CategoryId",
                principalTable: "QuestionCategory",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
