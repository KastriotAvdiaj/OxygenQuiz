using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddProtectedAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsProtected",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Backfill, hand-written — the generated AddColumn above is not enough on its own.
            //
            // A new column takes exactly one default, so every row that already exists lands on
            // false, including the two the column was added to protect. DbSeeder cannot fix that
            // by itself on a first deploy either: EnsureAdminAsync and EnsureGuestAccountAsync
            // both find their row already present, and before ADR 0011 they returned straight
            // away without touching it. (They now self-heal, which covers a database restored
            // from a pre-migration backup — but the flag should be correct the moment the schema
            // lands, not one boot later.)
            //
            // The admin row is matched by its immutable name, the constant EnsureAdminAsync
            // itself matches on; the guest row by its fixed well-known id (GuestAccount.Id),
            // which is exact rather than name-based.
            //
            // See docs/adr/0011-system-accounts-are-protected-rows.md.
            migrationBuilder.Sql(@"
                UPDATE ""Users""
                SET ""IsProtected"" = TRUE
                WHERE ""ImmutableName"" = 'admin'
                   OR ""Id"" = '00000000-0000-0000-0000-000000000001';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Dropping the column discards the backfill with it — nothing to undo separately.
            migrationBuilder.DropColumn(
                name: "IsProtected",
                table: "Users");
        }
    }
}
