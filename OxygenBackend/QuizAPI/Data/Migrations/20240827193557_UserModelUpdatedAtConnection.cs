using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class UserModelUpdatedAtConnection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "DateModified",
                table: "Users",
                newName: "LastLogin");

            migrationBuilder.AddColumn<Guid>(
                name: "ConcurrencyStamp",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "ImmutableName",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ProfileImageUrl",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "UpdatedAt",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UserUpdatedAt",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAtId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserUpdatedAt", x => new { x.UserId, x.UpdatedAtId });
                    table.ForeignKey(
                        name: "FK_UserUpdatedAt_UpdatedAt_UpdatedAtId",
                        column: x => x.UpdatedAtId,
                        principalTable: "UpdatedAt",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserUpdatedAt_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserUpdatedAt_UpdatedAtId",
                table: "UserUpdatedAt",
                column: "UpdatedAtId");

            migrationBuilder.AddForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt");

            migrationBuilder.DropTable(
                name: "UserUpdatedAt");

            migrationBuilder.DropColumn(
                name: "ConcurrencyStamp",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ImmutableName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "LastLogin",
                table: "Users",
                newName: "DateModified");

            migrationBuilder.AddForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
