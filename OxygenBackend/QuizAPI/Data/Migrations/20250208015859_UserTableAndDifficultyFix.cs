using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class UserTableAndDifficultyFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "QuestionDifficulties",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "QuestionDifficulties",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDifficulties_UserId",
                table: "QuestionDifficulties",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_QuestionDifficulties_Users_UserId",
                table: "QuestionDifficulties",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QuestionDifficulties_Users_UserId",
                table: "QuestionDifficulties");

            migrationBuilder.DropIndex(
                name: "IX_QuestionDifficulties_UserId",
                table: "QuestionDifficulties");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "QuestionDifficulties");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "QuestionDifficulties");
        }
    }
}
