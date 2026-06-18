using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace QuizAPI.Migrations
{
    /// <summary>
    /// Adds the nullable Quizzes.DeletedAt column that backs quiz soft-delete. Deleting a quiz now
    /// stamps this timestamp instead of removing the row, so played sessions / user answers survive.
    /// A global query filter (DeletedAt == null) hides these rows from every read except admin
    /// reads that opt in via IgnoreQueryFilters. Query filters are model-only, so the schema change
    /// here is just the one column.
    /// </summary>
    /// <inheritdoc />
    public partial class AddQuizSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Quizzes",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Quizzes");
        }
    }
}
