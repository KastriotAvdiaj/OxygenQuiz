using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class PrivateQuestionModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PrivateQuestionId",
                table: "AnswerOptions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PrivateQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DifficultyId = table.Column<int>(type: "int", nullable: true),
                    CategoryId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrivateQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrivateQuestions_QuestionCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "QuestionCategories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PrivateQuestions_QuestionDifficulties_DifficultyId",
                        column: x => x.DifficultyId,
                        principalTable: "QuestionDifficulties",
                        principalColumn: "ID");
                    table.ForeignKey(
                        name: "FK_PrivateQuestions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnswerOptions_PrivateQuestionId",
                table: "AnswerOptions",
                column: "PrivateQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivateQuestions_CategoryId",
                table: "PrivateQuestions",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivateQuestions_DifficultyId",
                table: "PrivateQuestions",
                column: "DifficultyId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivateQuestions_UserId",
                table: "PrivateQuestions",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_AnswerOptions_PrivateQuestions_PrivateQuestionId",
                table: "AnswerOptions",
                column: "PrivateQuestionId",
                principalTable: "PrivateQuestions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AnswerOptions_PrivateQuestions_PrivateQuestionId",
                table: "AnswerOptions");

            migrationBuilder.DropTable(
                name: "PrivateQuestions");

            migrationBuilder.DropIndex(
                name: "IX_AnswerOptions_PrivateQuestionId",
                table: "AnswerOptions");

            migrationBuilder.DropColumn(
                name: "PrivateQuestionId",
                table: "AnswerOptions");
        }
    }
}
