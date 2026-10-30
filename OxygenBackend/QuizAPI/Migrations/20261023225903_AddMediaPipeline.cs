using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaPipeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing media is dropped, not migrated (docs/media/media-pipeline.md, "Existing images
            // are deleted, not migrated"): production held a question or two with an image, all on
            // the VPS disk the new pipeline doesn't own. Every media URL on a row must now come from
            // a MediaAsset, so the old ones go — a URL with no asset behind it would be a reference
            // nothing can sweep, moderate or move to R2. The files themselves stay on the uploads
            // volume until removed by hand (docs/deployment/production-runbook.md).
            migrationBuilder.Sql(@"UPDATE ""Questions"" SET ""MediaUrl"" = NULL, ""MediaType"" = 0;");
            migrationBuilder.Sql(@"UPDATE ""Quizzes"" SET ""ImageUrl"" = NULL;");

            migrationBuilder.DropTable(
                name: "ImageAssets");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Questions");

            migrationBuilder.AddColumn<Guid>(
                name: "CoverAssetId",
                table: "Quizzes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CoverCountedAt",
                table: "Quizzes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MediaAssetId",
                table: "Questions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "MediaCountedAt",
                table: "Questions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MediaAssets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ThumbKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ThumbUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ByteSize = table.Column<long>(type: "bigint", nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: true),
                    Height = table.Column<int>(type: "integer", nullable: true),
                    DurationMs = table.Column<int>(type: "integer", nullable: true),
                    UploadedById = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FirstAttachedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UnreferencedSince = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreditAuthor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreditAuthorUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreditSourceUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreditLicense = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreditLicenseUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RemovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaAssets", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_CoverAssetId",
                table: "Quizzes",
                column: "CoverAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_UserId_CoverCountedAt",
                table: "Quizzes",
                columns: new[] { "UserId", "CoverCountedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Questions_MediaAssetId",
                table: "Questions",
                column: "MediaAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_UserId_MediaCountedAt",
                table: "Questions",
                columns: new[] { "UserId", "MediaCountedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_ContentHash",
                table: "MediaAssets",
                column: "ContentHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_UnreferencedSince",
                table: "MediaAssets",
                column: "UnreferencedSince");

            migrationBuilder.CreateIndex(
                name: "IX_MediaAssets_UploadedById_FirstAttachedAt",
                table: "MediaAssets",
                columns: new[] { "UploadedById", "FirstAttachedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_MediaAssets_MediaAssetId",
                table: "Questions",
                column: "MediaAssetId",
                principalTable: "MediaAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Quizzes_MediaAssets_CoverAssetId",
                table: "Quizzes",
                column: "CoverAssetId",
                principalTable: "MediaAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_MediaAssets_MediaAssetId",
                table: "Questions");

            migrationBuilder.DropForeignKey(
                name: "FK_Quizzes_MediaAssets_CoverAssetId",
                table: "Quizzes");

            migrationBuilder.DropTable(
                name: "MediaAssets");

            migrationBuilder.DropIndex(
                name: "IX_Quizzes_CoverAssetId",
                table: "Quizzes");

            migrationBuilder.DropIndex(
                name: "IX_Quizzes_UserId_CoverCountedAt",
                table: "Quizzes");

            migrationBuilder.DropIndex(
                name: "IX_Questions_MediaAssetId",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_UserId_MediaCountedAt",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CoverAssetId",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "CoverCountedAt",
                table: "Quizzes");

            migrationBuilder.DropColumn(
                name: "MediaAssetId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "MediaCountedAt",
                table: "Questions");

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Questions",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ImageAssets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EntityId = table.Column<int>(type: "integer", nullable: true),
                    EntityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    FileFormat = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FileName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImageAssets", x => x.Id);
                });
        }
    }
}
