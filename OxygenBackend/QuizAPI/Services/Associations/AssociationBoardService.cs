using QuizAPI.Common;
using QuizAPI.Controllers.Image.Services;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Mapping;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Services.Associations
{
    public interface IAssociationBoardService
    {
        /// <summary>Creates an Associations quiz and its Board in one save.</summary>
        Task<QuizDTO> CreateAsync(Guid userId, AssociationQuizCM cm);

        /// <summary>The full Board for the builder, or null when there is none the caller may edit.</summary>
        Task<AssociationBoardDTO?> GetForEditAsync(int quizId, Guid? userId, bool isAdmin);

        /// <summary>Updates the quiz and, if its content changed, replaces the Board copy-on-write. Null = not found / not yours.</summary>
        Task<QuizDTO?> UpdateAsync(Guid userId, AssociationQuizUM um);
    }

    /// <summary>
    /// Authoring for Associations quizzes: create, read for editing, update. The format's
    /// counterpart of the Classic create/update in <c>QuizService</c> — sharing its rules where
    /// the rule is about the <i>quiz</i> (references exist, the publishing gate, ownership,
    /// optimistic concurrency) and owning the ones about the <i>Board</i>.
    ///
    /// <para><b>Writes are whole and atomic.</b> Quiz and Board go through the same DbContext and
    /// one SaveChanges, so a quiz never exists without its Board and a Board is never half saved.</para>
    ///
    /// <para><b>Access is checked here, explicitly.</b> <c>Quiz</c> has no visibility query filter
    /// (ADR 0019): a stranger's edit read or update is answered "not found" — null → 404 — before
    /// anything about the quiz, its format included, is revealed.</para>
    ///
    /// See docs/quiz/associations.md, "Authoring".
    /// </summary>
    public class AssociationBoardService : IAssociationBoardService
    {
        private readonly IQuizRepository _quizzes;
        private readonly IAssociationBoardRepository _boards;
        private readonly IQuizService _quizService;
        private readonly IAssociationRulesProvider _rules;
        private readonly IImageService _images;
        private readonly QuizAPI.Services.Billing.IPlanLimitGuard _planLimits;

        public AssociationBoardService(
            IQuizRepository quizzes,
            IAssociationBoardRepository boards,
            IQuizService quizService,
            IAssociationRulesProvider rules,
            IImageService images,
            QuizAPI.Services.Billing.IPlanLimitGuard planLimits)
        {
            _planLimits = planLimits;
            _quizzes = quizzes;
            _boards = boards;
            _quizService = quizService;
            _rules = rules;
            _images = images;
        }

        public async Task<QuizDTO> CreateAsync(Guid userId, AssociationQuizCM cm)
        {
            // A board is a quiz, so it counts toward the same plan limit (docs/auth/paid-plans.md).
            await _planLimits.EnsureCanCreateQuizAsync(userId);

            var status = QuizMappers.ParseStatus(cm.Status);
            await EnsureQuizFieldsAsync(cm, status, userId);

            // quizId 0: the rules provider takes the quiz id for a future per-quiz override, and a
            // quiz being created has no overrides yet.
            var clean = AssociationBoardValidator.ValidateAndClean(cm.Board, cm.BoardTimeInSeconds, _rules.GetRulesFor(0));

            var quiz = new Quiz
            {
                Title = cm.Title.Trim(),
                Description = cm.Description,
                CategoryId = cm.CategoryId,
                LanguageId = cm.LanguageId,
                DifficultyId = cm.DifficultyId,
                ImageUrl = cm.ImageUrl,
                Status = status,
                Format = QuizFormat.Associations,
                TimeLimitInSeconds = cm.BoardTimeInSeconds,
                ShowFeedbackImmediately = false,
                ShuffleQuestions = false,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                Version = 1,
            };

            var board = AssociationBoardMapping.ToEntity(clean, quizId: 0, createdInVersion: 1);
            board.Quiz = quiz;

            await _quizzes.AddAsync(quiz);
            await _boards.AddAsync(board);
            await _quizzes.SaveChangesAsync();

            if (!string.IsNullOrEmpty(cm.ImageUrl))
                await _images.AssociateImageWithEntityAsync(cm.ImageUrl, "Quizzes", quiz.Id);

            return quiz.ToDto();
        }

        public async Task<AssociationBoardDTO?> GetForEditAsync(int quizId, Guid? userId, bool isAdmin)
        {
            var quiz = await _quizzes.GetByIdUnfilteredAsync(quizId);
            if (quiz is null) return null;
            if (!isAdmin && (userId is null || quiz.UserId != userId)) return null;
            if (quiz.Format != QuizFormat.Associations) return null;

            var board = await _boards.GetLiveAsync(quizId);
            return board is null
                ? null
                : AssociationBoardMapping.ToEditDto(board, quiz.Version, quiz.TimeLimitInSeconds ?? 0);
        }

        public async Task<QuizDTO?> UpdateAsync(Guid userId, AssociationQuizUM um)
        {
            var quiz = await _quizzes.GetTrackedAsync(um.Id);
            if (quiz is null || quiz.UserId != userId) return null;

            // After ownership: only the owner learns this is the wrong kind of quiz for this endpoint.
            QuizFormatGuard.EnsureFormat(quiz.Format, QuizFormat.Associations);

            if (quiz.Version != um.Version)
                throw new ConflictException("The quiz has been modified since you opened it. Reload it and try again.");

            var status = QuizMappers.ParseStatus(um.Status);
            await EnsureQuizFieldsAsync(um, status, userId: null);
            var clean = AssociationBoardValidator.ValidateAndClean(um.Board, um.BoardTimeInSeconds, _rules.GetRulesFor(quiz.Id));

            var newVersion = quiz.Version + 1;

            // Copy-on-write: a changed Board is a new row at the new version, and the old one is
            // retired — never edited — so games pinned to the old version keep their Board.
            var live = await _boards.GetLiveAsync(quiz.Id, track: true);
            if (live is null || !AssociationBoardMapping.HasSameContent(live, clean))
            {
                if (live is not null) live.RemovedInVersion = newVersion;
                await _boards.AddAsync(AssociationBoardMapping.ToEntity(clean, quiz.Id, newVersion));
            }

            var imageChanged = !string.Equals(quiz.ImageUrl, um.ImageUrl, StringComparison.Ordinal);

            quiz.Title = um.Title.Trim();
            quiz.Description = um.Description;
            quiz.CategoryId = um.CategoryId;
            quiz.LanguageId = um.LanguageId;
            quiz.DifficultyId = um.DifficultyId;
            quiz.ImageUrl = um.ImageUrl;
            quiz.Status = status;
            quiz.TimeLimitInSeconds = um.BoardTimeInSeconds;
            quiz.Version = newVersion;

            await _quizzes.SaveChangesAsync();

            if (imageChanged && !string.IsNullOrEmpty(um.ImageUrl))
                await _images.AssociateImageWithEntityAsync(um.ImageUrl, "Quizzes", quiz.Id);

            return quiz.ToDto();
        }

        /// <summary>The rules about the quiz itself, shared with Classic: lookups exist, and the publishing gate.</summary>
        private async Task EnsureQuizFieldsAsync(AssociationQuizCM cm, QuizStatus status, Guid? userId)
        {
            if (string.IsNullOrWhiteSpace(cm.Title))
                throw new AppValidationException("Give the quiz a title.");

            if (!await _quizzes.ReferencedEntitiesExistAsync(cm.CategoryId, cm.LanguageId, cm.DifficultyId, userId))
                throw new AppValidationException("The category, language or difficulty doesn't exist.");

            await _quizService.EnsurePublishableAsync(cm.CategoryId, cm.LanguageId, cm.DifficultyId, status);
        }
    }
}
