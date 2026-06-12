using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizAPI.Controllers.Questions.Services;
using QuizAPI.Data;
using QuizAPI.DTOs.DataTransfer;
using QuizAPI.DTOs.Question;
using QuizAPI.Filtering;
using QuizAPI.DTOs.User;
using QuizAPI.Models;
using QuizAPI.Services.CurrentUserService;
using QuizAPI.Services.DataTransfer;
using QuizAPI.Services.Interfaces;

namespace QuizAPI.Controllers.DataTransfer
{
    /// <summary>
    /// One endpoint family for the whole Data Export/Import feature. Each list exposes
    ///   GET  api/datatransfer/{entity}/export?format=csv|excel|json
    ///   POST api/datatransfer/{entity}/import   (multipart file; format inferred from extension)
    /// Export projects the entity to a flat row DTO and hands it to the generic serializer;
    /// import parses the file to row DTOs and persists each through the normal create path,
    /// so the same validation the UI uses also guards imported rows.
    ///
    /// Lists covered: categories, difficulties, languages, users, questions.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class DataTransferController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IUserService _userService;
        private readonly IQuestionService _questionService;
        private readonly IDataExportService _exporter;
        private readonly IDataImportService _importer;

        // A safe default for imported users who arrive without a password. Admins should ask
        // these users to reset it on first login.
        private const string DefaultImportPassword = "ChangeMe123!";

        public DataTransferController(
            ApplicationDbContext context,
            ICurrentUserService currentUser,
            IUserService userService,
            IQuestionService questionService,
            IDataExportService exporter,
            IDataImportService importer)
        {
            _context = context;
            _currentUser = currentUser;
            _userService = userService;
            _questionService = questionService;
            _exporter = exporter;
            _importer = importer;
        }

        // ── Categories ──────────────────────────────────────────────────────────
        [HttpGet("categories/export")]
        public async Task<IActionResult> ExportCategories([FromQuery] string? format, CancellationToken ct)
        {
            DataFormatExtensions.TryParse(format, out var fmt);
            var rows = await _context.QuestionCategories.AsNoTracking()
                .OrderBy(c => c.Id)
                .Select(c => new CategoryExportRow
                {
                    Id = c.Id,
                    Name = c.Name,
                    Gradient = c.Gradient,
                    ColorPaletteJson = c.ColorPaletteJson,
                    CreatedBy = c.User.Username,
                    CreatedAt = c.CreatedAt,
                })
                .ToListAsync(ct);

            return FileResultFor(_exporter.Export(rows, fmt, "categories"));
        }

        [HttpPost("categories/import")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> ImportCategories(IFormFile file, CancellationToken ct)
        {
            if (!TryReadFormat(file, out var fmt)) return BadRequest(InvalidFileMessage);
            if (_currentUser.UserId is not Guid userId) return Unauthorized();

            var rows = ParseFile<CategoryImportRow>(file, fmt);
            var result = new ImportResult();

            // Existing names (lower-cased). Adding to this set as we go also catches duplicates
            // that appear more than once within the same file.
            var seenNames = (await _context.QuestionCategories.Select(c => c.Name).ToListAsync(ct))
                .Select(n => (n ?? string.Empty).Trim().ToLowerInvariant())
                .ToHashSet();

            foreach (var r in rows)
            {
                if (string.IsNullOrWhiteSpace(r.Name))
                {
                    result.Skipped++;
                    result.Errors.Add("Skipped a row with an empty Name.");
                    continue;
                }

                if (!seenNames.Add(r.Name.Trim().ToLowerInvariant()))
                {
                    result.Skipped++;
                    result.Errors.Add($"\"{r.Name.Trim()}\" already exists — skipped.");
                    continue;
                }

                _context.QuestionCategories.Add(new QuestionCategory
                {
                    Name = r.Name.Trim(),
                    Gradient = r.Gradient,
                    ColorPaletteJson = r.ColorPaletteJson,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                });
                result.Imported++;
            }

            await _context.SaveChangesAsync(ct);
            return Ok(result);
        }

        // ── Difficulties ────────────────────────────────────────────────────────
        [HttpGet("difficulties/export")]
        public async Task<IActionResult> ExportDifficulties([FromQuery] string? format, CancellationToken ct)
        {
            DataFormatExtensions.TryParse(format, out var fmt);
            var rows = await _context.QuestionDifficulties.AsNoTracking()
                .OrderBy(d => d.ID)
                .Select(d => new DifficultyExportRow
                {
                    Id = d.ID,
                    Level = d.Level,
                    Weight = d.Weight,
                    CreatedBy = d.User.Username,
                    CreatedAt = d.CreatedAt,
                })
                .ToListAsync(ct);

            return FileResultFor(_exporter.Export(rows, fmt, "difficulties"));
        }

        [HttpPost("difficulties/import")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> ImportDifficulties(IFormFile file, CancellationToken ct)
        {
            if (!TryReadFormat(file, out var fmt)) return BadRequest(InvalidFileMessage);
            if (_currentUser.UserId is not Guid userId) return Unauthorized();

            var rows = ParseFile<DifficultyImportRow>(file, fmt);
            var result = new ImportResult();

            var seenLevels = (await _context.QuestionDifficulties.Select(d => d.Level).ToListAsync(ct))
                .Select(l => (l ?? string.Empty).Trim().ToLowerInvariant())
                .ToHashSet();

            foreach (var r in rows)
            {
                if (string.IsNullOrWhiteSpace(r.Level))
                {
                    result.Skipped++;
                    result.Errors.Add("Skipped a row with an empty Level.");
                    continue;
                }

                if (!seenLevels.Add(r.Level.Trim().ToLowerInvariant()))
                {
                    result.Skipped++;
                    result.Errors.Add($"\"{r.Level.Trim()}\" already exists — skipped.");
                    continue;
                }

                _context.QuestionDifficulties.Add(new QuestionDifficulty
                {
                    Level = r.Level.Trim(),
                    Weight = r.Weight,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                });
                result.Imported++;
            }

            await _context.SaveChangesAsync(ct);
            return Ok(result);
        }

        // ── Languages ───────────────────────────────────────────────────────────
        [HttpGet("languages/export")]
        public async Task<IActionResult> ExportLanguages([FromQuery] string? format, CancellationToken ct)
        {
            DataFormatExtensions.TryParse(format, out var fmt);
            var rows = await _context.QuestionLanguages.AsNoTracking()
                .OrderBy(l => l.Id)
                .Select(l => new LanguageExportRow
                {
                    Id = l.Id,
                    Language = l.Language,
                    CreatedBy = l.User.Username,
                    CreatedAt = l.CreatedAt,
                })
                .ToListAsync(ct);

            return FileResultFor(_exporter.Export(rows, fmt, "languages"));
        }

        [HttpPost("languages/import")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> ImportLanguages(IFormFile file, CancellationToken ct)
        {
            if (!TryReadFormat(file, out var fmt)) return BadRequest(InvalidFileMessage);
            if (_currentUser.UserId is not Guid userId) return Unauthorized();

            var rows = ParseFile<LanguageImportRow>(file, fmt);
            var result = new ImportResult();

            var seenLanguages = (await _context.QuestionLanguages.Select(l => l.Language).ToListAsync(ct))
                .Select(l => (l ?? string.Empty).Trim().ToLowerInvariant())
                .ToHashSet();

            foreach (var r in rows)
            {
                if (string.IsNullOrWhiteSpace(r.Language))
                {
                    result.Skipped++;
                    result.Errors.Add("Skipped a row with an empty Language.");
                    continue;
                }

                if (!seenLanguages.Add(r.Language.Trim().ToLowerInvariant()))
                {
                    result.Skipped++;
                    result.Errors.Add($"\"{r.Language.Trim()}\" already exists — skipped.");
                    continue;
                }

                _context.QuestionLanguages.Add(new QuestionLanguage
                {
                    Language = r.Language.Trim(),
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                });
                result.Imported++;
            }

            await _context.SaveChangesAsync(ct);
            return Ok(result);
        }

        // ── Users ───────────────────────────────────────────────────────────────
        // Exports the users matching the same filter the admin has applied to the table (search,
        // roles, date ranges, deleted state) by binding the shared FilterQuery — so the download
        // reflects the visible list across all pages, not every user. An empty query exports all.
        [HttpGet("users/export")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> ExportUsers(
            [FromQuery] FilterQuery query, [FromQuery] string? format, CancellationToken ct)
        {
            DataFormatExtensions.TryParse(format, out var fmt);
            var users = await _userService.GetFilteredUsersAsync(query, ct);
            var rows = users.Select(u => new UserExportRow
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Roles = string.Join("|", u.Roles),
                IsDeleted = u.IsDeleted,
                DateRegistered = u.DateRegistered,
                LastLogin = u.LastLogin,
            }).ToList();

            return FileResultFor(_exporter.Export(rows, fmt, "users"));
        }

        [HttpPost("users/import")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> ImportUsers(IFormFile file, CancellationToken ct)
        {
            if (!TryReadFormat(file, out var fmt)) return BadRequest(InvalidFileMessage);

            var rows = ParseFile<UserImportRow>(file, fmt);
            var result = new ImportResult();

            foreach (var r in rows)
            {
                if (string.IsNullOrWhiteSpace(r.Username) || string.IsNullOrWhiteSpace(r.Email))
                {
                    result.Skipped++;
                    result.Errors.Add("Skipped a row missing Username or Email.");
                    continue;
                }

                try
                {
                    var dto = new CreateUserDTO
                    {
                        Username = r.Username.Trim(),
                        Email = r.Email.Trim(),
                        Password = string.IsNullOrWhiteSpace(r.Password) ? DefaultImportPassword : r.Password,
                        Roles = SplitPipe(r.Roles) is { Count: > 0 } roles ? roles : null,
                    };
                    await _userService.CreateUserAsync(dto, ct);
                    result.Imported++;
                }
                catch (Exception ex)
                {
                    result.Skipped++;
                    result.Errors.Add($"{r.Username}: {ex.Message}");
                }
            }

            return Ok(result);
        }

        // ── Questions (all three subtypes) ───────────────────────────────────────
        [HttpGet("questions/export")]
        public async Task<IActionResult> ExportQuestions([FromQuery] string? format, CancellationToken ct)
        {
            DataFormatExtensions.TryParse(format, out var fmt);
            var rows = new List<QuestionExportRow>();

            var mcs = await _context.MultipleChoiceQuestions.AsNoTracking()
                .Include(q => q.AnswerOptions)
                .Include(q => q.Category)
                .Include(q => q.Difficulty)
                .Include(q => q.Language)
                .Include(q => q.User)
                .ToListAsync(ct);
            foreach (var q in mcs)
            {
                rows.Add(BaseRow(q, "MultipleChoice",
                    details: "Options: " + string.Join(" | ",
                        q.AnswerOptions.Select(o => (o.IsCorrect ? "*" : string.Empty) + o.Text))));
            }

            var tfs = await _context.TrueFalseQuestions.AsNoTracking()
                .Include(q => q.Category).Include(q => q.Difficulty).Include(q => q.Language).Include(q => q.User)
                .ToListAsync(ct);
            foreach (var q in tfs)
                rows.Add(BaseRow(q, "TrueFalse", details: "Correct: " + q.CorrectAnswer));

            var ttas = await _context.TypeTheAnswerQuestions.AsNoTracking()
                .Include(q => q.Category).Include(q => q.Difficulty).Include(q => q.Language).Include(q => q.User)
                .ToListAsync(ct);
            foreach (var q in ttas)
            {
                var alternates = q.AcceptableAnswers is { Count: > 0 }
                    ? " (also: " + string.Join(", ", q.AcceptableAnswers) + ")"
                    : string.Empty;
                rows.Add(BaseRow(q, "TypeTheAnswer", details: "Answer: " + q.CorrectAnswer + alternates));
            }

            var ordered = rows.OrderBy(r => r.Id).ToList();
            return FileResultFor(_exporter.Export(ordered, fmt, "questions"));
        }

        [HttpPost("questions/import")]
        [Authorize(Roles = "SuperAdmin, Admin")]
        public async Task<IActionResult> ImportQuestions(IFormFile file, CancellationToken ct)
        {
            if (!TryReadFormat(file, out var fmt)) return BadRequest(InvalidFileMessage);
            if (_currentUser.UserId is not Guid userId) return Unauthorized();

            var rows = ParseFile<QuestionImportRow>(file, fmt);
            var result = new ImportResult();

            // Dedupe key = "<Type>|<text>" over the current user's questions. Adding to the set as
            // we go also catches duplicates that appear more than once within the same file.
            var seenQuestions = (await _context.Questions
                    .Where(q => q.UserId == userId)
                    .Select(q => new { q.Type, q.Text })
                    .ToListAsync(ct))
                .Select(q => QuestionKey(q.Type, q.Text))
                .ToHashSet();

            foreach (var r in rows)
            {
                if (string.IsNullOrWhiteSpace(r.Text))
                {
                    result.Skipped++;
                    result.Errors.Add("Skipped a question with empty Text.");
                    continue;
                }

                if (!seenQuestions.Add(QuestionKey(ResolveQuestionType(r.Type), r.Text)))
                {
                    result.Skipped++;
                    result.Errors.Add($"\"{Truncate(r.Text, 40)}\" already exists — skipped.");
                    continue;
                }

                try
                {
                    switch ((r.Type ?? string.Empty).Trim().ToLowerInvariant())
                    {
                        case "truefalse":
                        case "tf":
                            await _questionService.CreateTrueFalseQuestionAsync(new TrueFalseQuestionCM
                            {
                                Text = r.Text.Trim(),
                                CategoryId = r.CategoryId,
                                DifficultyId = r.DifficultyId,
                                LanguageId = r.LanguageId,
                                Visibility = NormalizeVisibility(r.Visibility),
                                CorrectAnswer = r.CorrectAnswer ?? false,
                            }, userId);
                            break;

                        case "typetheanswer":
                        case "tta":
                            await _questionService.CreateTypeTheAnswerQuestionAsync(new TypeTheAnswerQuestionCM
                            {
                                Text = r.Text.Trim(),
                                CategoryId = r.CategoryId,
                                DifficultyId = r.DifficultyId,
                                LanguageId = r.LanguageId,
                                Visibility = NormalizeVisibility(r.Visibility),
                                CorrectAnswer = (r.TypeAnswer ?? string.Empty).Trim(),
                                AcceptableAnswers = SplitPipe(r.AcceptableAnswers),
                                IsCaseSensitive = r.IsCaseSensitive,
                                AllowPartialMatch = r.AllowPartialMatch,
                            }, userId);
                            break;

                        default: // MultipleChoice (also "mc")
                            var options = SplitPipe(r.Options);
                            var correct = SplitPipe(r.CorrectOptions);
                            await _questionService.CreateMultipleChoiceQuestionAsync(new MultipleChoiceQuestionCM
                            {
                                Text = r.Text.Trim(),
                                CategoryId = r.CategoryId,
                                DifficultyId = r.DifficultyId,
                                LanguageId = r.LanguageId,
                                Visibility = NormalizeVisibility(r.Visibility),
                                AllowMultipleSelections = r.AllowMultipleSelections,
                                AnswerOptions = options.Select(o => new AnswerOptionCM
                                {
                                    Text = o,
                                    IsCorrect = correct.Contains(o, StringComparer.OrdinalIgnoreCase),
                                }).ToList(),
                            }, userId);
                            break;
                    }
                    result.Imported++;
                }
                catch (Exception ex)
                {
                    result.Skipped++;
                    result.Errors.Add($"\"{Truncate(r.Text, 40)}\": {ex.Message}");
                }
            }

            return Ok(result);
        }

        // ── helpers ──────────────────────────────────────────────────────────────
        private const string InvalidFileMessage = "Upload a .csv, .xlsx or .json file.";

        private static QuestionExportRow BaseRow(QuestionBase q, string type, string details) => new()
        {
            Id = q.Id,
            Type = type,
            Text = q.Text,
            Category = q.Category?.Name ?? string.Empty,
            Difficulty = q.Difficulty?.Level ?? string.Empty,
            Language = q.Language?.Language ?? string.Empty,
            Visibility = q.Visibility.ToString(),
            Details = details,
            CreatedBy = q.User?.Username ?? string.Empty,
            CreatedAt = q.CreatedAt,
        };

        private FileContentResult FileResultFor(ExportFile file) =>
            File(file.Content, file.ContentType, file.FileName);

        // Validates the upload and infers the format from its extension.
        private static bool TryReadFormat(IFormFile? file, out DataFormat format)
        {
            format = DataFormat.Csv;
            if (file == null || file.Length == 0) return false;
            return DataFormatExtensions.TryFromFileName(file.FileName, out format);
        }

        private List<T> ParseFile<T>(IFormFile file, DataFormat format) where T : class, new()
        {
            using var stream = file.OpenReadStream();
            return _importer.Parse<T>(stream, format);
        }

        // "Global" / "Private" — defaults to Global on anything unrecognised.
        private static string NormalizeVisibility(string? raw) =>
            string.Equals(raw?.Trim(), "Private", StringComparison.OrdinalIgnoreCase) ? "Private" : "Global";

        // Maps an import row's Type text to the enum — must match the create switch above so the
        // dedupe key lines up with how the question is actually stored.
        private static QuestionType ResolveQuestionType(string? raw) =>
            (raw ?? string.Empty).Trim().ToLowerInvariant() switch
            {
                "truefalse" or "tf" => QuestionType.TrueFalse,
                "typetheanswer" or "tta" => QuestionType.TypeTheAnswer,
                _ => QuestionType.MultipleChoice,
            };

        private static string QuestionKey(QuestionType type, string? text) =>
            $"{type}|{(text ?? string.Empty).Trim().ToLowerInvariant()}";

        private static List<string> SplitPipe(string? value) =>
            string.IsNullOrWhiteSpace(value)
                ? new List<string>()
                : value.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        private static string Truncate(string s, int max) =>
            string.IsNullOrEmpty(s) || s.Length <= max ? s : s.Substring(0, max) + "…";
    }
}
