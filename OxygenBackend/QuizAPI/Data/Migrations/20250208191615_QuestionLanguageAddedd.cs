using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class QuestionLanguageAddedd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LanguageId",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "QuestionLanguageId",
                table: "Questions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "QuestionLanguages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Language = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionLanguages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionLanguages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Questions_LanguageId",
                table: "Questions",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_QuestionLanguageId",
                table: "Questions",
                column: "QuestionLanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionLanguages_UserId",
                table: "QuestionLanguages",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_QuestionLanguages_LanguageId",
                table: "Questions",
                column: "LanguageId",
                principalTable: "QuestionLanguages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_QuestionLanguages_QuestionLanguageId",
                table: "Questions",
                column: "QuestionLanguageId",
                principalTable: "QuestionLanguages",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_QuestionLanguages_LanguageId",
                table: "Questions");

            migrationBuilder.DropForeignKey(
                name: "FK_Questions_QuestionLanguages_QuestionLanguageId",
                table: "Questions");

            migrationBuilder.DropTable(
                name: "QuestionLanguages");

            migrationBuilder.DropIndex(
                name: "IX_Questions_LanguageId",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_QuestionLanguageId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "LanguageId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "QuestionLanguageId",
                table: "Questions");
        }
    }
}
