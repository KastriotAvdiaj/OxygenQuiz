using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiplayerMatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuizSessions_QuizId",
                table: "QuizSessions");

            migrationBuilder.AddColumn<Guid>(
                name: "MatchId",
                table: "QuizSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Mode",
                table: "QuizSessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Matches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuizId = table.Column<int>(type: "integer", nullable: false),
                    QuizVersion = table.Column<int>(type: "integer", nullable: false),
                    RoomCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    HostUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WinnerUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Matches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Matches_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quizzes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Matches_Users_HostUserId",
                        column: x => x.HostUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Matches_Users_WinnerUserId",
                        column: x => x.WinnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuizSessions_MatchId",
                table: "QuizSessions",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSessions_QuizId_Mode",
                table: "QuizSessions",
                columns: new[] { "QuizId", "Mode" });

            migrationBuilder.CreateIndex(
                name: "IX_Matches_HostUserId",
                table: "Matches",
                column: "HostUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Matches_QuizId",
                table: "Matches",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_Matches_WinnerUserId",
                table: "Matches",
                column: "WinnerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_QuizSessions_Matches_MatchId",
                table: "QuizSessions",
                column: "MatchId",
                principalTable: "Matches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_QuizSessions_Matches_MatchId",
                table: "QuizSessions");

            migrationBuilder.DropTable(
                name: "Matches");

            migrationBuilder.DropIndex(
                name: "IX_QuizSessions_MatchId",
                table: "QuizSessions");

            migrationBuilder.DropIndex(
                name: "IX_QuizSessions_QuizId_Mode",
                table: "QuizSessions");

            migrationBuilder.DropColumn(
                name: "MatchId",
                table: "QuizSessions");

            migrationBuilder.DropColumn(
                name: "Mode",
                table: "QuizSessions");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSessions_QuizId",
                table: "QuizSessions",
                column: "QuizId");
        }
    }
}
