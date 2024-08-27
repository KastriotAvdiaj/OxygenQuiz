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
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("Id");

                    b.ToTable("Users");
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
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany("UserUpdatedAt")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("UpdatedAt");

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.UpdatedAt", b =>
                {
                    b.HasOne("QuizAPI.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("QuizAPI.Models.Permission", b =>
                {
                    b.Navigation("PermissionUpdatedAt");
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
                    b.Navigation("UserUpdatedAt");
                });
#pragma warning restore 612, 618
        }
    }
}
