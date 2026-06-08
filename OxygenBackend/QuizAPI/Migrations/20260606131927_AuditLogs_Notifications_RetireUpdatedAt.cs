using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AuditLogs_Notifications_RetireUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PermissionUpdatedAt");

            migrationBuilder.DropTable(
                name: "RoleUpdatedAt");

            migrationBuilder.DropTable(
                name: "UserUpdatedAt");

            migrationBuilder.DropTable(
                name: "UpdatedAt");

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Entity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EntityId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    OldValue = table.Column<string>(type: "text", nullable: true),
                    NewValue = table.Column<string>(type: "text", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Entity_EntityId",
                table: "AuditLogs",
                columns: new[] { "Entity", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.CreateTable(
                name: "UpdatedAt",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Username = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UpdatedAt", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UpdatedAt_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PermissionUpdatedAt",
                columns: table => new
                {
                    PermissionId = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAtId = table.Column<int>(type: "integer", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "RoleUpdatedAt",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAtId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleUpdatedAt", x => new { x.RoleId, x.UpdatedAtId });
                    table.ForeignKey(
                        name: "FK_RoleUpdatedAt_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RoleUpdatedAt_UpdatedAt_UpdatedAtId",
                        column: x => x.UpdatedAtId,
                        principalTable: "UpdatedAt",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserUpdatedAt",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedAtId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserUpdatedAt", x => new { x.UserId, x.UpdatedAtId });
                    table.ForeignKey(
                        name: "FK_UserUpdatedAt_UpdatedAt_UpdatedAtId",
                        column: x => x.UpdatedAtId,
                        principalTable: "UpdatedAt",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserUpdatedAt_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PermissionUpdatedAt_UpdatedAtId",
                table: "PermissionUpdatedAt",
                column: "UpdatedAtId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleUpdatedAt_UpdatedAtId",
                table: "RoleUpdatedAt",
                column: "UpdatedAtId");

            migrationBuilder.CreateIndex(
                name: "IX_UpdatedAt_UserId",
                table: "UpdatedAt",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserUpdatedAt_UpdatedAtId",
                table: "UserUpdatedAt",
                column: "UpdatedAtId");
        }
    }
}
