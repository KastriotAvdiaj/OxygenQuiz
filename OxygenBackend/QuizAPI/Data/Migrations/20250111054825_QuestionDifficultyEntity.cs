using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class QuestionDifficultyEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Difficulty",
                table: "Questions",
                newName: "DifficultyId");

            migrationBuilder.AddColumn<string>(
                name: "DifficultyLevel",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "QuestionDifficulties",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Level = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Weight = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionDifficulties", x => x.ID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Questions_DifficultyId",
                table: "Questions",
                column: "DifficultyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_QuestionDifficulties_DifficultyId",
                table: "Questions",
                column: "DifficultyId",
                principalTable: "QuestionDifficulties",
                principalColumn: "ID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_QuestionDifficulties_DifficultyId",
                table: "Questions");

            migrationBuilder.DropTable(
                name: "QuestionDifficulties");

            migrationBuilder.DropIndex(
                name: "IX_Questions_DifficultyId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "DifficultyLevel",
                table: "Questions");

            migrationBuilder.RenameColumn(
                name: "DifficultyId",
                table: "Questions",
                newName: "Difficulty");
        }
    }
}
