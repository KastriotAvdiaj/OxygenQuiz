using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace QuizAPI.Migrations
{
    /// <summary>
    /// Removes the unused Universitetet and Drejtimet tables (leftover test entities that were not
    /// part of the quiz domain). Down recreates them exactly as InitialCreate defined them.
    /// </summary>
    /// <inheritdoc />
    public partial class RemoveUniversitetiDrejtimi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drejtimet first: it holds the FK into Universitetet.
            migrationBuilder.DropTable(
                name: "Drejtimet");

            migrationBuilder.DropTable(
                name: "Universitetet");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Universitetet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Universitetet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Drejtimet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Duration = table.Column<string>(type: "text", nullable: false),
                    UniversitetiId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Drejtimet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Drejtimet_Universitetet_UniversitetiId",
                        column: x => x.UniversitetiId,
                        principalTable: "Universitetet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Drejtimet_UniversitetiId",
                table: "Drejtimet",
                column: "UniversitetiId");
        }
    }
}
