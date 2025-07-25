﻿// <auto-generated />
using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using QuizAPI.Data;

#nullable disable

namespace QuizAPI.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    partial class ApplicationDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "7.0.13")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity("QuizAPI.ManyToManyTables.PermissionUpdatedAt", b =>
                {
                    b.Property<int>("PermissionId")
                        .HasColumnType("int");

                    b.Property<int>("UpdatedAtId")
                        .HasColumnType("int");

                    b.HasKey("PermissionId", "UpdatedAtId");

                    b.HasIndex("UpdatedAtId");

                    b.ToTable("PermissionUpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.QuizQuestion", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<int>("OrderInQuiz")
                        .HasColumnType("int");

                    b.Property<int>("PointSystem")
                        .HasColumnType("int");

                    b.Property<int>("QuestionId")
                        .HasColumnType("int");

                    b.Property<int>("QuizId")
                        .HasColumnType("int");

                    b.Property<int>("TimeLimitInSeconds")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.HasIndex("QuestionId");

                    b.HasIndex("QuizId", "QuestionId")
                        .IsUnique();

                    b.ToTable("QuizQuestions");
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.RoleUpdatedAt", b =>
                {
                    b.Property<int>("RoleId")
                        .HasColumnType("int");

                    b.Property<int>("UpdatedAtId")
                        .HasColumnType("int");

                    b.HasKey("RoleId", "UpdatedAtId");

                    b.HasIndex("UpdatedAtId");

                    b.ToTable("RoleUpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.UserUpdatedAt", b =>
                {
                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.Property<int>("UpdatedAtId")
                        .HasColumnType("int");

                    b.HasKey("UserId", "UpdatedAtId");

                    b.HasIndex("UpdatedAtId");

                    b.ToTable("UserUpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.Models.AnswerOption", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<bool>("IsCorrect")
                        .HasColumnType("bit");

                    b.Property<int>("QuestionId")
                        .HasColumnType("int");

                    b.Property<string>("Text")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("Id");

                    b.HasIndex("QuestionId");

                    b.ToTable("AnswerOptions");
                });

            modelBuilder.Entity("QuizAPI.Models.Drejtimi", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<string>("Duration")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<int>("UniversitetiId")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.HasIndex("UniversitetiId");

                    b.ToTable("Drejtimet");
                });

            modelBuilder.Entity("QuizAPI.Models.ImageAsset", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<DateTime>("CreatedDate")
                        .HasColumnType("datetime2");

                    b.Property<int?>("EntityId")
                        .HasColumnType("int");

                    b.Property<string>("EntityType")
                        .HasMaxLength(50)
                        .HasColumnType("nvarchar(50)");

                    b.Property<string>("FileFormat")
                        .IsRequired()
                        .HasMaxLength(10)
                        .HasColumnType("nvarchar(10)");

                    b.Property<string>("FileName")
                        .IsRequired()
                        .HasMaxLength(100)
                        .HasColumnType("nvarchar(100)");

                    b.Property<string>("FilePath")
                        .IsRequired()
                        .HasMaxLength(500)
                        .HasColumnType("nvarchar(500)");

                    b.Property<bool>("IsUsed")
                        .HasColumnType("bit");

                    b.Property<DateTime?>("LastModifiedDate")
                        .HasColumnType("datetime2");

                    b.Property<string>("OriginalFileName")
                        .IsRequired()
                        .HasMaxLength(255)
                        .HasColumnType("nvarchar(255)");

                    b.HasKey("Id");

                    b.ToTable("ImageAssets");
                });

            modelBuilder.Entity("QuizAPI.Models.Permission", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<string>("Description")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("isActive")
                        .HasColumnType("bit");

                    b.HasKey("Id");

                    b.ToTable("Permissions");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionBase", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<int>("CategoryId")
                        .HasColumnType("int");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<int>("DifficultyId")
                        .HasColumnType("int");

                    b.Property<string>("ImageUrl")
                        .HasColumnType("nvarchar(max)");

                    b.Property<int>("LanguageId")
                        .HasColumnType("int");

                    b.Property<int?>("QuestionLanguageId")
                        .HasColumnType("int");

                    b.Property<string>("Text")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<int>("Type")
                        .HasColumnType("int");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.Property<int>("Visibility")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.HasIndex("CategoryId");

                    b.HasIndex("DifficultyId");

                    b.HasIndex("LanguageId");

                    b.HasIndex("QuestionLanguageId");

                    b.HasIndex("UserId");

                    b.ToTable("Questions");

                    b.HasDiscriminator<int>("Type");

                    b.UseTphMappingStrategy();
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionCategory", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<string>("ColorPaletteJson")
                        .HasColumnType("nvarchar(max)");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<bool>("Gradient")
                        .HasColumnType("bit");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.HasKey("Id");

                    b.HasIndex("UserId");

                    b.ToTable("QuestionCategories");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionDifficulty", b =>
                {
                    b.Property<int>("ID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("ID"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("Level")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.Property<int?>("Weight")
                        .HasColumnType("int");

                    b.HasKey("ID");

                    b.HasIndex("UserId");

                    b.ToTable("QuestionDifficulties");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionLanguage", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("Language")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.HasKey("Id");

                    b.HasIndex("UserId");

                    b.ToTable("QuestionLanguages");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.Quiz", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<int>("CategoryId")
                        .HasColumnType("int");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("Description")
                        .HasMaxLength(1000)
                        .HasColumnType("nvarchar(1000)");

                    b.Property<int>("DifficultyId")
                        .HasColumnType("int");

                    b.Property<string>("ImageUrl")
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("IsActive")
                        .HasColumnType("bit");

                    b.Property<bool>("IsPublished")
                        .HasColumnType("bit");

                    b.Property<int>("LanguageId")
                        .HasColumnType("int");

                    b.Property<bool>("ShowFeedbackImmediately")
                        .HasColumnType("bit");

                    b.Property<bool>("ShuffleQuestions")
                        .HasColumnType("bit");

                    b.Property<int?>("TimeLimitInSeconds")
                        .HasMaxLength(2000)
                        .HasColumnType("int");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(255)
                        .HasColumnType("nvarchar(255)");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.Property<int>("Version")
                        .HasColumnType("int");

                    b.Property<int>("Visibility")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.HasIndex("CategoryId");

                    b.HasIndex("DifficultyId");

                    b.HasIndex("LanguageId");

                    b.HasIndex("UserId");

                    b.ToTable("Quizzes");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.QuizSession", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<DateTime?>("CurrentQuestionStartTime")
                        .HasColumnType("datetime2");

                    b.Property<int?>("CurrentQuizQuestionId")
                        .HasColumnType("int");

                    b.Property<DateTime?>("EndTime")
                        .HasColumnType("datetime2");

                    b.Property<bool>("IsCompleted")
                        .HasColumnType("bit");

                    b.Property<int>("QuizId")
                        .HasColumnType("int");

                    b.Property<DateTime>("StartTime")
                        .HasColumnType("datetime2");

                    b.Property<int>("TotalScore")
                        .HasColumnType("int");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.HasKey("Id");

                    b.HasIndex("CurrentQuizQuestionId");

                    b.HasIndex("QuizId");

                    b.HasIndex("UserId");

                    b.ToTable("QuizSessions");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.UserAnswer", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<int>("QuizQuestionId")
                        .HasColumnType("int");

                    b.Property<int>("Score")
                        .HasColumnType("int");

                    b.Property<int?>("SelectedOptionId")
                        .HasColumnType("int");

                    b.Property<Guid>("SessionId")
                        .HasColumnType("uniqueidentifier");

                    b.Property<int>("Status")
                        .HasColumnType("int");

                    b.Property<string>("SubmittedAnswer")
                        .HasColumnType("nvarchar(max)");

                    b.Property<DateTime>("SubmittedTime")
                        .HasColumnType("datetime2");

                    b.HasKey("Id");

                    b.HasIndex("QuizQuestionId");

                    b.HasIndex("SelectedOptionId");

                    b.HasIndex("SessionId");

                    b.ToTable("UserAnswers");
                });

            modelBuilder.Entity("QuizAPI.Models.Role", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<Guid>("ConcurrencyStamp")
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("Description")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("isActive")
                        .HasColumnType("bit");

                    b.HasKey("Id");

                    b.ToTable("Roles");
                });

            modelBuilder.Entity("QuizAPI.Models.Statistics.Questions.QuestionStatistics", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<int>("QuestionId")
                        .HasColumnType("int");

                    b.Property<int>("TimesAnsweredCorrectly")
                        .HasColumnType("int");

                    b.Property<int>("TimesAnsweredIncorrectly")
                        .HasColumnType("int");

                    b.Property<int>("TimesUsedInQuizzes")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.HasIndex("QuestionId")
                        .IsUnique();

                    b.ToTable("QuestionStatistics");
                });

            modelBuilder.Entity("QuizAPI.Models.Universiteti", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<string>("City")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("Id");

                    b.ToTable("Universitetet");
                });

            modelBuilder.Entity("QuizAPI.Models.UpdatedAt", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                    b.Property<string>("Description")
                        .HasColumnType("nvarchar(max)");

                    b.Property<DateTime>("ModifiedAt")
                        .HasColumnType("datetime2");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uniqueidentifier");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("Id");

                    b.HasIndex("UserId");

                    b.ToTable("UpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.Models.User", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uniqueidentifier");

                    b.Property<Guid>("ConcurrencyStamp")
                        .HasColumnType("uniqueidentifier");

                    b.Property<DateTime>("DateRegistered")
                        .HasColumnType("datetime2");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("ImmutableName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("IsDeleted")
                        .HasColumnType("bit");

                    b.Property<DateTime>("LastLogin")
                        .HasColumnType("datetime2");

                    b.Property<string>("PasswordHash")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("ProfileImageUrl")
                        .HasColumnType("nvarchar(max)");

                    b.Property<int>("RoleId")
                        .HasColumnType("int");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("Id");

                    b.HasIndex("RoleId");

                    b.ToTable("Users");
                });

            modelBuilder.Entity("QuizAPI.Models.MultipleChoiceQuestion", b =>
                {
                    b.HasBaseType("QuizAPI.Models.QuestionBase");

                    b.Property<bool>("AllowMultipleSelections")
                        .HasColumnType("bit");

                    b.HasDiscriminator().HasValue(0);
                });

            modelBuilder.Entity("QuizAPI.Models.TrueFalseQuestion", b =>
                {
                    b.HasBaseType("QuizAPI.Models.QuestionBase");

                    b.Property<bool>("CorrectAnswer")
                        .HasColumnType("bit");

                    b.HasDiscriminator().HasValue(1);
                });

            modelBuilder.Entity("QuizAPI.Models.TypeTheAnswerQuestion", b =>
                {
                    b.HasBaseType("QuizAPI.Models.QuestionBase");

                    b.Property<string>("AcceptableAnswers")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("AllowPartialMatch")
                        .HasColumnType("bit");

                    b.Property<string>("CorrectAnswer")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("IsCaseSensitive")
                        .HasColumnType("bit");

                    b.ToTable("Questions", t =>
                        {
                            t.Property("CorrectAnswer")
                                .HasColumnName("TypeTheAnswerQuestion_CorrectAnswer");
                        });

                    b.HasDiscriminator().HasValue(2);
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.PermissionUpdatedAt", b =>
                {
                    b.HasOne("QuizAPI.Models.Permission", "Permission")
                        .WithMany("PermissionUpdatedAt")
                        .HasForeignKey("PermissionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.UpdatedAt", "UpdatedAt")
                        .WithMany("PermissionUpdatedAt")
                        .HasForeignKey("UpdatedAtId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Permission");

                    b.Navigation("UpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.QuizQuestion", b =>
                {
                    b.HasOne("QuizAPI.Models.QuestionBase", "Question")
                        .WithMany("QuizQuestions")
                        .HasForeignKey("QuestionId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.Quiz.Quiz", "Quiz")
                        .WithMany("QuizQuestions")
                        .HasForeignKey("QuizId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Question");

                    b.Navigation("Quiz");
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.RoleUpdatedAt", b =>
                {
                    b.HasOne("QuizAPI.Models.Role", "Role")
                        .WithMany("RoleUpdatedAt")
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.UpdatedAt", "UpdatedAt")
                        .WithMany("RoleUpdatedAt")
                        .HasForeignKey("UpdatedAtId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Role");

                    b.Navigation("UpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.UserUpdatedAt", b =>
                {
                    b.HasOne("QuizAPI.Models.UpdatedAt", "UpdatedAt")
                        .WithMany("UserUpdatedAt")
                        .HasForeignKey("UpdatedAtId")
                        .OnDelete(DeleteBehavior.NoAction)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany("UserUpdatedAt")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.NoAction)
                        .IsRequired();

                    b.Navigation("UpdatedAt");

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.AnswerOption", b =>
                {
                    b.HasOne("QuizAPI.Models.MultipleChoiceQuestion", "Question")
                        .WithMany("AnswerOptions")
                        .HasForeignKey("QuestionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Question");
                });

            modelBuilder.Entity("QuizAPI.Models.Drejtimi", b =>
                {
                    b.HasOne("QuizAPI.Models.Universiteti", "Universiteti")
                        .WithMany()
                        .HasForeignKey("UniversitetiId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Universiteti");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionBase", b =>
                {
                    b.HasOne("QuizAPI.Models.QuestionCategory", "Category")
                        .WithMany("Questions")
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.QuestionDifficulty", "Difficulty")
                        .WithMany("Questions")
                        .HasForeignKey("DifficultyId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.QuestionLanguage", "Language")
                        .WithMany()
                        .HasForeignKey("LanguageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.QuestionLanguage", null)
                        .WithMany("Questions")
                        .HasForeignKey("QuestionLanguageId");

                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Category");

                    b.Navigation("Difficulty");

                    b.Navigation("Language");

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionCategory", b =>
                {
                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionDifficulty", b =>
                {
                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionLanguage", b =>
                {
                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.Quiz", b =>
                {
                    b.HasOne("QuizAPI.Models.QuestionCategory", "Category")
                        .WithMany()
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.QuestionDifficulty", "Difficulty")
                        .WithMany()
                        .HasForeignKey("DifficultyId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.QuestionLanguage", "Language")
                        .WithMany()
                        .HasForeignKey("LanguageId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Category");

                    b.Navigation("Difficulty");

                    b.Navigation("Language");

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.QuizSession", b =>
                {
                    b.HasOne("QuizAPI.ManyToManyTables.QuizQuestion", "CurrentQuizQuestion")
                        .WithMany()
                        .HasForeignKey("CurrentQuizQuestionId");

                    b.HasOne("QuizAPI.Models.Quiz.Quiz", "Quiz")
                        .WithMany()
                        .HasForeignKey("QuizId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany("QuizSessions")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("CurrentQuizQuestion");

                    b.Navigation("Quiz");

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.UserAnswer", b =>
                {
                    b.HasOne("QuizAPI.ManyToManyTables.QuizQuestion", "QuizQuestion")
                        .WithMany("UserAnswers")
                        .HasForeignKey("QuizQuestionId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.AnswerOption", "AnswerOption")
                        .WithMany()
                        .HasForeignKey("SelectedOptionId");

                    b.HasOne("QuizAPI.Models.Quiz.QuizSession", "QuizSession")
                        .WithMany("UserAnswers")
                        .HasForeignKey("SessionId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("AnswerOption");

                    b.Navigation("QuizQuestion");

                    b.Navigation("QuizSession");
                });

            modelBuilder.Entity("QuizAPI.Models.Statistics.Questions.QuestionStatistics", b =>
                {
                    b.HasOne("QuizAPI.Models.QuestionBase", "Question")
                        .WithOne("Statistics")
                        .HasForeignKey("QuizAPI.Models.Statistics.Questions.QuestionStatistics", "QuestionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Question");
                });

            modelBuilder.Entity("QuizAPI.Models.UpdatedAt", b =>
                {
                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.NoAction)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.User", b =>
                {
                    b.HasOne("QuizAPI.Models.Role", "Role")
                        .WithMany()
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Role");
                });

            modelBuilder.Entity("QuizAPI.ManyToManyTables.QuizQuestion", b =>
                {
                    b.Navigation("UserAnswers");
                });

            modelBuilder.Entity("QuizAPI.Models.Permission", b =>
                {
                    b.Navigation("PermissionUpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionBase", b =>
                {
                    b.Navigation("QuizQuestions");

                    b.Navigation("Statistics");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionCategory", b =>
                {
                    b.Navigation("Questions");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionDifficulty", b =>
                {
                    b.Navigation("Questions");
                });

            modelBuilder.Entity("QuizAPI.Models.QuestionLanguage", b =>
                {
                    b.Navigation("Questions");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.Quiz", b =>
                {
                    b.Navigation("QuizQuestions");
                });

            modelBuilder.Entity("QuizAPI.Models.Quiz.QuizSession", b =>
                {
                    b.Navigation("UserAnswers");
                });

            modelBuilder.Entity("QuizAPI.Models.Role", b =>
                {
                    b.Navigation("RoleUpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.Models.UpdatedAt", b =>
                {
                    b.Navigation("PermissionUpdatedAt");

                    b.Navigation("RoleUpdatedAt");

                    b.Navigation("UserUpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.Models.User", b =>
                {
                    b.Navigation("QuizSessions");

                    b.Navigation("UserUpdatedAt");
                });

            modelBuilder.Entity("QuizAPI.Models.MultipleChoiceQuestion", b =>
                {
                    b.Navigation("AnswerOptions");
                });
#pragma warning restore 612, 618
        }
    }
}
