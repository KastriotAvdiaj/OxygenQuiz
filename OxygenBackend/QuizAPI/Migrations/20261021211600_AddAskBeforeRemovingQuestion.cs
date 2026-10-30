using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAskBeforeRemovingQuestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AskBeforeRemovingQuestion",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                // true, not EF's generated false: every existing user should keep being asked
                // until they choose "Don't ask again" (the model's own default is true too).
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AskBeforeRemovingQuestion",
                table: "UserSettings");
        }
    }
}
