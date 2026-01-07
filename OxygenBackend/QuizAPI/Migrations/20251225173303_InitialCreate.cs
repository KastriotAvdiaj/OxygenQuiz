using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuizAPI.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImageAssets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FileName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FileFormat = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    EntityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    EntityId = table.Column<int>(type: "integer", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImageAssets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ConcurrencyStamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Universitetet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Universitetet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ImmutableName = table.Column<string>(type: "text", nullable: false),
                    Username = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    DateRegistered = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RoleId = table.Column<int>(type: "integer", nullable: false),
                    ConcurrencyStamp = table.Column<Guid>(type: "uuid", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    LastLogin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProfileImageUrl = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Drejtimet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Duration = table.Column<string>(type: "text", nullable: false),
                    UniversitetiId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Drejtimet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Drejtimet_Universitetet_UniversitetiId",
                        column: x => x.UniversitetiId,
                        principalTable: "Universitetet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuestionCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ColorPaletteJson = table.Column<string>(type: "text", nullable: true),
                    Gradient = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionCategories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuestionDifficulties",
                columns: table => new
                {
                    ID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Level = table.Column<string>(type: "text", nullable: false),
                    Weight = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionDifficulties", x => x.ID);
                    table.ForeignKey(
                        name: "FK_QuestionDifficulties_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuestionLanguages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Language = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionLanguages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionLanguages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UpdatedAt",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Text = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    Visibility = table.Column<int>(type: "integer", nullable: false),
                    DifficultyId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    QuestionLanguageId = table.Column<int>(type: "integer", nullable: true),
                    AllowMultipleSelections = table.Column<bool>(type: "boolean", nullable: true),
                    CorrectAnswer = table.Column<bool>(type: "boolean", nullable: true),
                    TypeTheAnswerQuestion_CorrectAnswer = table.Column<string>(type: "text", nullable: true),
                    IsCaseSensitive = table.Column<bool>(type: "boolean", nullable: true),
                    AllowPartialMatch = table.Column<bool>(type: "boolean", nullable: true),
                    AcceptableAnswers = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Questions_QuestionCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "QuestionCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Questions_QuestionDifficulties_DifficultyId",
                        column: x => x.DifficultyId,
                        principalTable: "QuestionDifficulties",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Questions_QuestionLanguages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "QuestionLanguages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Questions_QuestionLanguages_QuestionLanguageId",
                        column: x => x.QuestionLanguageId,
                        principalTable: "QuestionLanguages",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Questions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Quizzes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    LanguageId = table.Column<int>(type: "integer", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    TimeLimitInSeconds = table.Column<int>(type: "integer", maxLength: 2000, nullable: true),
                    ShowFeedbackImmediately = table.Column<bool>(type: "boolean", nullable: false),
                    DifficultyId = table.Column<int>(type: "integer", nullable: false),
                    ShuffleQuestions = table.Column<bool>(type: "boolean", nullable: false),
                    Visibility = table.Column<int>(type: "integer", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quizzes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Quizzes_QuestionCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "QuestionCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Quizzes_QuestionDifficulties_DifficultyId",
                        column: x => x.DifficultyId,
                        principalTable: "QuestionDifficulties",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Quizzes_QuestionLanguages_LanguageId",
                        column: x => x.LanguageId,
                        principalTable: "QuestionLanguages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Quizzes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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

            migrationBuilder.CreateTable(
                name: "AnswerOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Text = table.Column<string>(type: "text", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false),
                    QuestionId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnswerOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnswerOptions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuestionStatistics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuestionId = table.Column<int>(type: "integer", nullable: false),
                    TimesUsedInQuizzes = table.Column<int>(type: "integer", nullable: false),
                    TimesAnsweredCorrectly = table.Column<int>(type: "integer", nullable: false),
                    TimesAnsweredIncorrectly = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionStatistics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionStatistics_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuizQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuizId = table.Column<int>(type: "integer", nullable: false),
                    QuestionId = table.Column<int>(type: "integer", nullable: false),
                    TimeLimitInSeconds = table.Column<int>(type: "integer", nullable: false),
                    PointSystem = table.Column<int>(type: "integer", nullable: false),
                    OrderInQuiz = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizQuestions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuizQuestions_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quizzes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuizSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuizId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotalScore = table.Column<int>(type: "integer", nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CurrentQuizQuestionId = table.Column<int>(type: "integer", nullable: true),
                    CurrentQuestionStartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AbandonmentReason = table.Column<int>(type: "integer", nullable: true),
                    AbandonedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizSessions_QuizQuestions_CurrentQuizQuestionId",
                        column: x => x.CurrentQuizQuestionId,
                        principalTable: "QuizQuestions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_QuizSessions_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quizzes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuizSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserAnswers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuizQuestionId = table.Column<int>(type: "integer", nullable: false),
                    SelectedOptionId = table.Column<int>(type: "integer", nullable: true),
                    SubmittedAnswer = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: false),
                    QuestionStartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubmittedTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAnswers_AnswerOptions_SelectedOptionId",
                        column: x => x.SelectedOptionId,
                        principalTable: "AnswerOptions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserAnswers_QuizQuestions_QuizQuestionId",
                        column: x => x.QuizQuestionId,
                        principalTable: "QuizQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserAnswers_QuizSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "QuizSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnswerOptions_QuestionId",
                table: "AnswerOptions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_Drejtimet_UniversitetiId",
                table: "Drejtimet",
                column: "UniversitetiId");

            migrationBuilder.CreateIndex(
                name: "IX_PermissionUpdatedAt_UpdatedAtId",
                table: "PermissionUpdatedAt",
                column: "UpdatedAtId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionCategories_UserId",
                table: "QuestionCategories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionDifficulties_UserId",
                table: "QuestionDifficulties",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionLanguages_UserId",
                table: "QuestionLanguages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_CategoryId",
                table: "Questions",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_DifficultyId",
                table: "Questions",
                column: "DifficultyId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_LanguageId",
                table: "Questions",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_QuestionLanguageId",
                table: "Questions",
                column: "QuestionLanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_UserId_Visibility_Id",
                table: "Questions",
                columns: new[] { "UserId", "Visibility", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_QuestionStatistics_QuestionId",
                table: "QuestionStatistics",
                column: "QuestionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestions_QuestionId",
                table: "QuizQuestions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestions_QuizId_QuestionId",
                table: "QuizQuestions",
                columns: new[] { "QuizId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizSessions_CurrentQuizQuestionId",
                table: "QuizSessions",
                column: "CurrentQuizQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSessions_QuizId",
                table: "QuizSessions",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSessions_UserId",
                table: "QuizSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_CategoryId",
                table: "Quizzes",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_DifficultyId",
                table: "Quizzes",
                column: "DifficultyId");

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_LanguageId",
                table: "Quizzes",
                column: "LanguageId");

            migrationBuilder.CreateIndex(
                name: "IX_Quizzes_UserId_Visibility_Id",
                table: "Quizzes",
                columns: new[] { "UserId", "Visibility", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_RoleUpdatedAt_UpdatedAtId",
                table: "RoleUpdatedAt",
                column: "UpdatedAtId");

            migrationBuilder.CreateIndex(
                name: "IX_UpdatedAt_UserId",
                table: "UpdatedAt",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAnswers_QuizQuestionId",
                table: "UserAnswers",
                column: "QuizQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAnswers_SelectedOptionId",
                table: "UserAnswers",
                column: "SelectedOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAnswers_SessionId",
                table: "UserAnswers",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_UserUpdatedAt_UpdatedAtId",
                table: "UserUpdatedAt",
                column: "UpdatedAtId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Drejtimet");

            migrationBuilder.DropTable(
                name: "ImageAssets");

            migrationBuilder.DropTable(
                name: "PermissionUpdatedAt");

            migrationBuilder.DropTable(
                name: "QuestionStatistics");

            migrationBuilder.DropTable(
                name: "RoleUpdatedAt");

            migrationBuilder.DropTable(
                name: "UserAnswers");

            migrationBuilder.DropTable(
                name: "UserUpdatedAt");

            migrationBuilder.DropTable(
                name: "Universitetet");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "AnswerOptions");

            migrationBuilder.DropTable(
                name: "QuizSessions");

            migrationBuilder.DropTable(
                name: "UpdatedAt");

            migrationBuilder.DropTable(
                name: "QuizQuestions");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "Quizzes");

            migrationBuilder.DropTable(
                name: "QuestionCategories");

            migrationBuilder.DropTable(
                name: "QuestionDifficulties");

            migrationBuilder.DropTable(
                name: "QuestionLanguages");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Roles");
        }
    }
}
