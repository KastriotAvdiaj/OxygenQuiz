using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddHostedGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "GameDeadlineUtc",
                table: "AssociationGames",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GameSeconds",
                table: "AssociationGames",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "HostUserId",
                table: "AssociationGames",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityAt",
                table: "AssociationGames",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "LastRound",
                table: "AssociationGames",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PausedAt",
                table: "AssociationGames",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScreenCode",
                table: "AssociationGames",
                type: "character varying(8)",
                maxLength: 8,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TurnDeadlineUtc",
                table: "AssociationGames",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TurnSeconds",
                table: "AssociationGames",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CancelsSeq",
                table: "AssociationGameMoves",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HostedTeams",
                columns: table => new
                {
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    Seat = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Colour = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    StudentsJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HostedTeams", x => new { x.GameId, x.Seat });
                    table.ForeignKey(
                        name: "FK_HostedTeams_AssociationGames_GameId",
                        column: x => x.GameId,
                        principalTable: "AssociationGames",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssociationGames_HostUserId",
                table: "AssociationGames",
                column: "HostUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssociationGames_ScreenCode",
                table: "AssociationGames",
                column: "ScreenCode",
                unique: true,
                filter: "\"ScreenCode\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HostedTeams");

            migrationBuilder.DropIndex(
                name: "IX_AssociationGames_HostUserId",
                table: "AssociationGames");

            migrationBuilder.DropIndex(
                name: "IX_AssociationGames_ScreenCode",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "GameDeadlineUtc",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "GameSeconds",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "HostUserId",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "LastRound",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "PausedAt",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "ScreenCode",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "TurnDeadlineUtc",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "TurnSeconds",
                table: "AssociationGames");

            migrationBuilder.DropColumn(
                name: "CancelsSeq",
                table: "AssociationGameMoves");
        }
    }
}
