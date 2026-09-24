using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAssociationBoards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssociationBoards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizId = table.Column<int>(type: "integer", nullable: false),
                    FinalSolution = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FinalAcceptableSolutions = table.Column<string>(type: "text", nullable: false),
                    CreatedInVersion = table.Column<int>(type: "integer", nullable: false),
                    RemovedInVersion = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssociationBoards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssociationBoards_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quizzes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AssociationColumns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BoardId = table.Column<int>(type: "integer", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    Solution = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AcceptableSolutions = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssociationColumns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssociationColumns_AssociationBoards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "AssociationBoards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AssociationTiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ColumnId = table.Column<int>(type: "integer", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    Text = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssociationTiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssociationTiles_AssociationColumns_ColumnId",
                        column: x => x.ColumnId,
                        principalTable: "AssociationColumns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssociationBoards_QuizId_CreatedInVersion",
                table: "AssociationBoards",
                columns: new[] { "QuizId", "CreatedInVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_AssociationBoards_QuizId_Live",
                table: "AssociationBoards",
                column: "QuizId",
                unique: true,
                filter: "\"RemovedInVersion\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AssociationColumns_BoardId_Position",
                table: "AssociationColumns",
                columns: new[] { "BoardId", "Position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssociationTiles_ColumnId_Position",
                table: "AssociationTiles",
                columns: new[] { "ColumnId", "Position" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssociationTiles");

            migrationBuilder.DropTable(
                name: "AssociationColumns");

            migrationBuilder.DropTable(
                name: "AssociationBoards");
        }
    }
}
