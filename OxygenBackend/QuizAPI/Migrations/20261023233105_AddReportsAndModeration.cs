using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddReportsAndModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHouse",
                table: "Quizzes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPicked",
                table: "Quizzes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModerationHeldAt",
                table: "Quizzes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PickedAt",
                table: "Quizzes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "MediaHiddenAt",
                table: "Questions",
                type: "timestamp with time zone",
                nullable: true);

            // Existing quizzes by staff become house quizzes and are picked, so the main catalogue
            // isn't empty the moment it starts showing picked quizzes only. Community quizzes start
            // unpicked; an admin picks the good ones (docs/media/moderation.md).
            migrationBuilder.Sql(@"
                UPDATE ""Quizzes"" q SET ""IsHouse"" = TRUE, ""IsPicked"" = TRUE, ""PickedAt"" = NOW()
                WHERE EXISTS (
                    SELECT 1 FROM ""UserRoles"" ur JOIN ""Roles"" r ON r.""Id"" = ur.""RoleId""
                    WHERE ur.""UserId"" = q.""UserId"" AND r.""Name"" IN ('Admin', 'SuperAdmin'));");

            migrationBuilder.CreateTable(
                name: "ContentReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<int>(type: "integer", nullable: true),
                    QuizId = table.Column<int>(type: "integer", nullable: true),
                    ReporterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<int>(type: "integer", nullable: false),
                    Details = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Outcome = table.Column<int>(type: "integer", nullable: true),
                    ResolutionNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ResolvedById = table.Column<Guid>(type: "uuid", nullable: true),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContentReports_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContentReports_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quizzes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "Id", "Description", "Name", "isActive" },
                values: new object[,]
                {
                    { 17, "Review reports, hide media, hold quizzes", "moderation:manage", false },
                    { 18, "Pick a quiz for the main catalogue", "quiz:pick", false }
                });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "PermissionId", "RoleId" },
                values: new object[,]
                {
                    { 17, 1 },
                    { 18, 1 },
                    { 17, 3 },
                    { 18, 3 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContentReports_OneOpenPerQuestion",
                table: "ContentReports",
                columns: new[] { "ReporterId", "QuestionId" },
                unique: true,
                filter: "\"QuestionId\" IS NOT NULL AND \"Status\" = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ContentReports_OneOpenPerQuiz",
                table: "ContentReports",
                columns: new[] { "ReporterId", "QuizId" },
                unique: true,
                filter: "\"QuestionId\" IS NULL AND \"Status\" = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ContentReports_QuestionId",
                table: "ContentReports",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentReports_QuizId",
                table: "ContentReports",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentReports_Status_CreatedAt",
                table: "ContentReports",
                columns: new[] { "Status", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentReports");

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 17, 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 18, 1 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 17, 3 });

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumns: new[] { "PermissionId", "RoleId" },
                keyValues: new object[] { 18, 3 });

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DropColumn(
                name: "IsHouse",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "IsPicked",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "ModerationHeldAt",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "PickedAt",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "MediaHiddenAt",
                table: "Questions");
        }
    }
}
