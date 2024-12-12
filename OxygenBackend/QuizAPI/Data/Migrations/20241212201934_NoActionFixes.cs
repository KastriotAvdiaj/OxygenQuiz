using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class NoActionFixes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt");

            migrationBuilder.DropForeignKey(
                name: "FK_UserUpdatedAt_UpdatedAt_UpdatedAtId",
                table: "UserUpdatedAt");

            migrationBuilder.DropForeignKey(
                name: "FK_UserUpdatedAt_Users_UserId",
                table: "UserUpdatedAt");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Questions",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Questions_UserId",
                table: "Questions",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_Users_UserId",
                table: "Questions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserUpdatedAt_UpdatedAt_UpdatedAtId",
                table: "UserUpdatedAt",
                column: "UpdatedAtId",
                principalTable: "UpdatedAt",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserUpdatedAt_Users_UserId",
                table: "UserUpdatedAt",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Users_UserId",
                table: "Questions");

            migrationBuilder.DropForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt");

            migrationBuilder.DropForeignKey(
                name: "FK_UserUpdatedAt_UpdatedAt_UpdatedAtId",
                table: "UserUpdatedAt");

            migrationBuilder.DropForeignKey(
                name: "FK_UserUpdatedAt_Users_UserId",
                table: "UserUpdatedAt");

            migrationBuilder.DropIndex(
                name: "IX_Questions_UserId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Questions");

            migrationBuilder.AddForeignKey(
                name: "FK_UpdatedAt_Users_UserId",
                table: "UpdatedAt",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserUpdatedAt_UpdatedAt_UpdatedAtId",
                table: "UserUpdatedAt",
                column: "UpdatedAtId",
                principalTable: "UpdatedAt",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserUpdatedAt_Users_UserId",
                table: "UserUpdatedAt",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
