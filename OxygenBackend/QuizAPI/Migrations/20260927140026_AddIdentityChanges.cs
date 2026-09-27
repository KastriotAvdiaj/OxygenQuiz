using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddIdentityChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UsernameChangedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EmailChangeTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NewEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConsumedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailChangeTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmailChangeTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true,
                filter: "NOT \"IsDeleted\" OR (\"DeletionRequestedAt\" IS NOT NULL AND \"AnonymisedAt\" IS NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_Users_ImmutableName",
                table: "Users",
                column: "ImmutableName",
                unique: true,
                filter: "NOT \"IsDeleted\" OR (\"DeletionRequestedAt\" IS NOT NULL AND \"AnonymisedAt\" IS NULL)");

            // Case-insensitive uniqueness of the display name, over the same rows as the two indexes
            // above. An expression index, which EF can't model, hence raw SQL (Postgres). Together
            // with ImmutableName's index this backs the app-level NameTakenAsync check; the
            // cross-column half of the rule (my display name vs. your immutable one) can't be an
            // index and stays in code. See docs/adr/0017-one-namespace-for-names.md.
            //
            // If this migration fails on an existing database, it found real duplicates (two live
            // accounts sharing an email or a name, which the app-level checks were meant to
            // prevent). Resolve those rows first; the query in docs/auth/account-identity-changes.md
            // lists them.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX \"IX_Users_Username_Lower\" ON \"Users\" (lower(\"Username\")) " +
                "WHERE NOT \"IsDeleted\" OR (\"DeletionRequestedAt\" IS NOT NULL AND \"AnonymisedAt\" IS NULL);");

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeTokens_TokenHash",
                table: "EmailChangeTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailChangeTokens_UserId",
                table: "EmailChangeTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Users_Username_Lower\";");

            migrationBuilder.DropTable(
                name: "EmailChangeTokens");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_ImmutableName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UsernameChangedAt",
                table: "Users");
        }
    }
}
