using System;
using System.Collections.Generic;

namespace QuizAPI.DTOs.DataTransfer
{
    // ─────────────────────────────────────────────────────────────────────────────
    // Flat row DTOs for the export/import framework. Every property is a scalar so it
    // maps cleanly to a CSV/Excel column and a JSON field. "Export" rows are richer
    // (ids, created-by, timestamps); "Import" rows carry only what a user may supply,
    // mirroring the corresponding Create Model (CM).
    // ─────────────────────────────────────────────────────────────────────────────

    // ── Categories ──────────────────────────────────────────────────────────────
    public sealed class CategoryExportRow
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool Gradient { get; set; }
        public string? ColorPaletteJson { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public sealed class CategoryImportRow
    {
        public string Name { get; set; } = string.Empty;
        public bool Gradient { get; set; }
        public string? ColorPaletteJson { get; set; }
    }

    // ── Difficulties ────────────────────────────────────────────────────────────
    public sealed class DifficultyExportRow
    {
        public int Id { get; set; }
        public string Level { get; set; } = string.Empty;
        public int? Weight { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public sealed class DifficultyImportRow
    {
        public string Level { get; set; } = string.Empty;
        public int? Weight { get; set; }
    }

    // ── Languages ───────────────────────────────────────────────────────────────
    public sealed class LanguageExportRow
    {
        public int Id { get; set; }
        public string Language { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public sealed class LanguageImportRow
    {
        public string Language { get; set; } = string.Empty;
    }

    // ── Users ───────────────────────────────────────────────────────────────────
    public sealed class UserExportRow
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Roles { get; set; } = string.Empty;   // pipe-separated: "Admin|User"
        public bool IsDeleted { get; set; }
        public DateTime DateRegistered { get; set; }
        public DateTime LastLogin { get; set; }
    }

    public sealed class UserImportRow
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }               // blank -> a default is generated
        public string? Roles { get; set; }                  // pipe-separated; blank -> "user"
    }

    // ── Questions (covers all three subtypes) ───────────────────────────────────
    public sealed class QuestionExportRow
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;     // MultipleChoice / TrueFalse / TypeTheAnswer
        public string Text { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Difficulty { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public string Visibility { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;  // human-readable answer summary
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public sealed class QuestionImportRow
    {
        public string Type { get; set; } = "MultipleChoice"; // MultipleChoice / TrueFalse / TypeTheAnswer
        public string Text { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public int DifficultyId { get; set; }
        public int LanguageId { get; set; }
        public string Visibility { get; set; } = "Global";

        // MultipleChoice
        public string? Options { get; set; }          // pipe-separated option texts: "Red|Green|Blue"
        public string? CorrectOptions { get; set; }   // pipe-separated subset that is correct: "Green"
        public bool AllowMultipleSelections { get; set; }

        // TrueFalse
        public bool? CorrectAnswer { get; set; }

        // TypeTheAnswer
        public string? TypeAnswer { get; set; }            // the canonical correct answer
        public string? AcceptableAnswers { get; set; }     // pipe-separated alternates
        public bool IsCaseSensitive { get; set; }
        public bool AllowPartialMatch { get; set; }
    }

    // ── Quizzes ─────────────────────────────────────────────────────────────────
    public sealed class QuizExportRow
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public string Difficulty { get; set; } = string.Empty;
        public string Visibility { get; set; } = string.Empty;
        public int TimeLimitInSeconds { get; set; }
        public bool ShuffleQuestions { get; set; }
        public bool ShowFeedbackImmediately { get; set; }
        public bool IsPublished { get; set; }
        public int QuestionCount { get; set; }
        public string QuestionIds { get; set; } = string.Empty; // pipe-separated, in quiz order: "12|15|18"
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public sealed class QuizImportRow
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int CategoryId { get; set; }
        public int LanguageId { get; set; }
        public int DifficultyId { get; set; }
        public string Visibility { get; set; } = "Private";   // Private / Public / Friends
        public int? TimeLimitInSeconds { get; set; }
        public bool ShuffleQuestions { get; set; }
        public bool ShowFeedbackImmediately { get; set; }
        public bool IsPublished { get; set; }

        // Optional pipe-separated IDs of EXISTING questions to attach, in order: "12|15|18".
        // Blank imports the quiz as a draft you finish in the editor; any id that doesn't exist
        // causes the whole row to be skipped (CreateQuizAsync validates the set).
        public string? QuestionIds { get; set; }
    }

    // ── Import outcome (returned to the client) ─────────────────────────────────
    public sealed class ImportResult
    {
        public int Imported { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
