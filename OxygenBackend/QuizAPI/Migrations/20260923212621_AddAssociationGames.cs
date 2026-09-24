using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAssociationGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssociationGames",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BoardId = table.Column<int>(type: "integer", nullable: false),
                    PlayStyle = table.Column<int>(type: "integer", nullable: false),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    FirstSeat = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeadlineUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndReason = table.Column<int>(type: "integer", nullable: true),
                    RulesJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssociationGames", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssociationGames_AssociationBoards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "AssociationBoards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssociationGames_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AssociationGameMoves",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    Seq = table.Column<int>(type: "integer", nullable: false),
                    Seat = table.Column<int>(type: "integer", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    TileId = table.Column<int>(type: "integer", nullable: true),
                    Target = table.Column<int>(type: "integer", nullable: true),
                    GuessText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: true),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    At = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssociationGameMoves", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssociationGameMoves_AssociationGames_GameId",
                        column: x => x.GameId,
                        principalTable: "AssociationGames",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AssociationGamePlayers",
                columns: table => new
                {
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Seat = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssociationGamePlayers", x => new { x.GameId, x.SessionId });
                    table.ForeignKey(
                        name: "FK_AssociationGamePlayers_AssociationGames_GameId",
                        column: x => x.GameId,
                        principalTable: "AssociationGames",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssociationGamePlayers_QuizSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "QuizSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssociationGameMoves_GameId_Seq",
                table: "AssociationGameMoves",
                columns: new[] { "GameId", "Seq" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssociationGamePlayers_SessionId",
                table: "AssociationGamePlayers",
                column: "SessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssociationGames_BoardId",
                table: "AssociationGames",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_AssociationGames_MatchId",
                table: "AssociationGames",
                column: "MatchId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssociationGameMoves");

            migrationBuilder.DropTable(
                name: "AssociationGamePlayers");

            migrationBuilder.DropTable(
                name: "AssociationGames");
        }
    }
}
