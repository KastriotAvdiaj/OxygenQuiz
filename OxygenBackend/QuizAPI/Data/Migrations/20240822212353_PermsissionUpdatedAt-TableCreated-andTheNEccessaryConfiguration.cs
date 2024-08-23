using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class PermsissionUpdatedAtTableCreatedandTheNEccessaryConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PermissionUpdatedAt",
                columns: table => new
                {
                    PermissionId = table.Column<int>(type: "int", nullable: false),
                    UpdatedAtId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PermissionUpdatedAt", x => new { x.PermissionId, x.UpdatedAtId });
                    table.ForeignKey(
                        name: "FK_PermissionUpdatedAt_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PermissionUpdatedAt_UpdatedAt_UpdatedAtId",
                        column: x => x.UpdatedAtId,
                        principalTable: "UpdatedAt",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PermissionUpdatedAt_UpdatedAtId",
                table: "PermissionUpdatedAt",
                column: "UpdatedAtId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PermissionUpdatedAt");
        }
    }
}
