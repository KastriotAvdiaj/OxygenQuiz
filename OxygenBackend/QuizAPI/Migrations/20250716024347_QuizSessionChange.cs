using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class QuizSessionChange : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QuizSessions_Quizzes_QuizId",
                table: "QuizSessions");

            migrationBuilder.DropColumn(
                name: "IsCorrect",
                table: "UserAnswers");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "UserAnswers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedTime",
                table: "UserAnswers",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CurrentQuestionStartTime",
                table: "QuizSessions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CurrentQuizQuestionId",
                table: "QuizSessions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCompleted",
                table: "QuizSessions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_QuizSessions_CurrentQuizQuestionId",
                table: "QuizSessions",
                column: "CurrentQuizQuestionId");

            migrationBuilder.AddForeignKey(
                name: "FK_QuizSessions_QuizQuestions_CurrentQuizQuestionId",
                table: "QuizSessions",
                column: "CurrentQuizQuestionId",
                principalTable: "QuizQuestions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_QuizSessions_Quizzes_QuizId",
                table: "QuizSessions",
                column: "QuizId",
                principalTable: "Quizzes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QuizSessions_QuizQuestions_CurrentQuizQuestionId",
                table: "QuizSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_QuizSessions_Quizzes_QuizId",
                table: "QuizSessions");

            migrationBuilder.DropIndex(
                name: "IX_QuizSessions_CurrentQuizQuestionId",
                table: "QuizSessions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "UserAnswers");

            migrationBuilder.DropColumn(
                name: "SubmittedTime",
                table: "UserAnswers");

            migrationBuilder.DropColumn(
                name: "CurrentQuestionStartTime",
                table: "QuizSessions");

            migrationBuilder.DropColumn(
                name: "CurrentQuizQuestionId",
                table: "QuizSessions");

            migrationBuilder.DropColumn(
                name: "IsCompleted",
                table: "QuizSessions");

            migrationBuilder.AddColumn<bool>(
                name: "IsCorrect",
                table: "UserAnswers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddForeignKey(
                name: "FK_QuizSessions_Quizzes_QuizId",
                table: "QuizSessions",
                column: "QuizId",
                principalTable: "Quizzes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
