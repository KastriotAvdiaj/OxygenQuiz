using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddInviteCodeRoleGrant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GrantedRoleId",
                table: "InviteCodes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntendedEmail",
                table: "InviteCodes",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InviteCodes_GrantedRoleId",
                table: "InviteCodes",
                column: "GrantedRoleId");

            migrationBuilder.CreateIndex(
                name: "IX_InviteCodes_IntendedEmail",
                table: "InviteCodes",
                column: "IntendedEmail");

            migrationBuilder.AddForeignKey(
                name: "FK_InviteCodes_Roles_GrantedRoleId",
                table: "InviteCodes",
                column: "GrantedRoleId",
                principalTable: "Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InviteCodes_Roles_GrantedRoleId",
                table: "InviteCodes");

            migrationBuilder.DropIndex(
                name: "IX_InviteCodes_GrantedRoleId",
                table: "InviteCodes");

            migrationBuilder.DropIndex(
                name: "IX_InviteCodes_IntendedEmail",
                table: "InviteCodes");

            migrationBuilder.DropColumn(
                name: "GrantedRoleId",
                table: "InviteCodes");

            migrationBuilder.DropColumn(
                name: "IntendedEmail",
                table: "InviteCodes");
        }
    }
}
