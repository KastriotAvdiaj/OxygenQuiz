using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoverCredit",
                table: "Quizzes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverCreditUrl",
                table: "Quizzes",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MediaCredit",
                table: "Questions",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MediaCreditUrl",
                table: "Questions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoverCredit",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "CoverCreditUrl",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "MediaCredit",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "MediaCreditUrl",
                table: "Questions");
        }
    }
}
