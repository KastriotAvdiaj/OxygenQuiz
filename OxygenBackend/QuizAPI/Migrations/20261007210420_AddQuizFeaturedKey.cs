using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizFeaturedKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FeaturedKey",
                table: "Quizzes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_FeaturedKey",
                table: "Quizzes",
                column: "FeaturedKey",
                unique: true,
                filter: "\"FeaturedKey\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Quizzes_FeaturedKey",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "FeaturedKey",
                table: "Quizzes");
        }
    }
}
