using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Models.Moderation;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Repositories.Interfaces
{
    public interface IModerationRepository
    {
        Task AddReportAsync(ContentReport report, CancellationToken ct = default);
        Task<int> SaveChangesAsync(CancellationToken ct = default);

        Task<bool> HasOpenReportAsync(Guid reporterId, int? questionId, int? quizId, CancellationToken ct = default);

        /// <summary>Tracked, unfiltered (a report is a fact about the row, whoever reads it).</summary>
        Task<QuestionBase?> GetQuestionAsync(int id, CancellationToken ct = default);


        /// <summary>Tracked; soft-deleted quizzes are not reportable.</summary>
        Task<Quiz?> GetQuizAsync(int id, CancellationToken ct = default);

        /// <summary>
        /// Whether <paramref name="userId"/> could have seen this question: the caller's question
        /// filter lets them read it (public, theirs, in a Public quiz), or they have played a quiz it
        /// is in — an Unlisted one through its share link, a lobby's. What a report and "Show
        /// anyway" require, so neither can probe ids the caller was never shown.
        /// </summary>
        Task<bool> CanReachQuestionAsync(int questionId, Guid userId, CancellationToken ct = default);

        /// <summary>The same for a quiz: Public, or one the caller has played.</summary>
        Task<bool> CanReachQuizAsync(int quizId, Guid userId, CancellationToken ct = default);

        /// <summary>Distinct reporters with an open report of <paramref name="reason"/> on the target.</summary>
        Task<int> CountOpenReportersAsync(int? questionId, int? quizId, ReportReason reason, CancellationToken ct = default);

        /// <summary>Quizzes in which the question is live (not retired by a later version). Tracked.</summary>
        Task<List<Quiz>> GetQuizzesWithLiveQuestionAsync(int questionId, CancellationToken ct = default);

        /// <summary>Open reports on one target, tracked, for resolving them together.</summary>
        Task<List<ContentReport>> GetOpenReportsAsync(int? questionId, int? quizId, CancellationToken ct = default);

        /// <summary>Every open report with its question and quiz, for the admin lanes.</summary>
        Task<List<ContentReport>> ListOpenWithTargetsAsync(CancellationToken ct = default);

        /// <summary>The most recently resolved reports, for the Resolved lane.</summary>
        Task<List<ContentReport>> ListRecentlyResolvedAsync(int take, CancellationToken ct = default);

        /// <summary>Open wrong-answer reports on content <paramref name="authorId"/> owns.</summary>
        Task<List<ContentReport>> ListOpenWrongAnswerForAuthorAsync(Guid authorId, CancellationToken ct = default);

        Task<List<QuestionBase>> GetQuestionsUsingAssetAsync(Guid assetId, CancellationToken ct = default);
        Task<List<Quiz>> GetQuizzesUsingAssetAsync(Guid assetId, CancellationToken ct = default);

        /// <summary>Usernames by id, for the queue's "by" column.</summary>
        Task<Dictionary<Guid, string>> GetUsernamesAsync(IEnumerable<Guid> ids, CancellationToken ct = default);

        /// <summary>Whether the account holds Admin or SuperAdmin — staff content skips the author step.</summary>
        Task<bool> IsStaffAsync(Guid userId, CancellationToken ct = default);
    }
}

namespace QuizAPI.Repositories
{
    using QuizAPI.Repositories.Interfaces;

    /// <summary>
    /// Data access for reports and moderation. Question reads ignore the global filter: whether a
    /// question was reported, or holds a reported image, is a fact about the database, and the
    /// moderator reading it isn't the question's audience.
    /// </summary>
    public sealed class ModerationRepository(ApplicationDbContext db) : IModerationRepository
    {
        public async Task AddReportAsync(ContentReport report, CancellationToken ct = default) =>
            await db.ContentReports.AddAsync(report, ct);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);

        public Task<bool> HasOpenReportAsync(Guid reporterId, int? questionId, int? quizId, CancellationToken ct = default) =>
            questionId is int q
                ? db.ContentReports.AnyAsync(r => r.ReporterId == reporterId && r.QuestionId == q && r.Status == ReportStatus.Open, ct)
                : db.ContentReports.AnyAsync(r => r.ReporterId == reporterId && r.QuestionId == null && r.QuizId == quizId && r.Status == ReportStatus.Open, ct);

        public Task<QuestionBase?> GetQuestionAsync(int id, CancellationToken ct = default) =>
            db.Questions.IgnoreQueryFilters().FirstOrDefaultAsync(q => q.Id == id, ct);


        public Task<Quiz?> GetQuizAsync(int id, CancellationToken ct = default) =>
            db.Quizzes.FirstOrDefaultAsync(q => q.Id == id, ct);

        public async Task<bool> CanReachQuestionAsync(int questionId, Guid userId, CancellationToken ct = default) =>
            await db.Questions.AnyAsync(q => q.Id == questionId, ct)
            || await db.QuizQuestions.AnyAsync(qq => qq.QuestionId == questionId
                && db.QuizSessions.Any(s => s.QuizId == qq.QuizId && s.UserId == userId), ct);

        public Task<bool> CanReachQuizAsync(int quizId, Guid userId, CancellationToken ct = default) =>
            db.Quizzes.AnyAsync(q => q.Id == quizId
                && (q.Status == QuizStatus.Public || db.QuizSessions.Any(s => s.QuizId == q.Id && s.UserId == userId)), ct);

        public Task<int> CountOpenReportersAsync(int? questionId, int? quizId, ReportReason reason, CancellationToken ct = default) =>
            (questionId is int q
                ? db.ContentReports.Where(r => r.QuestionId == q)
                : db.ContentReports.Where(r => r.QuestionId == null && r.QuizId == quizId))
            .Where(r => r.Status == ReportStatus.Open && r.Reason == reason)
            .Select(r => r.ReporterId).Distinct().CountAsync(ct);

        public Task<List<Quiz>> GetQuizzesWithLiveQuestionAsync(int questionId, CancellationToken ct = default) =>
            db.Quizzes.Where(z => z.QuizQuestions.Any(qq => qq.QuestionId == questionId && qq.RemovedInVersion == null))
                .ToListAsync(ct);

        public Task<List<ContentReport>> GetOpenReportsAsync(int? questionId, int? quizId, CancellationToken ct = default) =>
            (questionId is int q
                ? db.ContentReports.Where(r => r.QuestionId == q)
                : db.ContentReports.Where(r => r.QuestionId == null && r.QuizId == quizId))
            .Where(r => r.Status == ReportStatus.Open).ToListAsync(ct);

        public Task<List<ContentReport>> ListOpenWithTargetsAsync(CancellationToken ct = default) =>
            db.ContentReports.IgnoreQueryFilters()
                .Where(r => r.Status == ReportStatus.Open)
                .Include(r => r.Question).Include(r => r.Quiz)
                .AsNoTracking().ToListAsync(ct);

        public Task<List<ContentReport>> ListRecentlyResolvedAsync(int take, CancellationToken ct = default) =>
            db.ContentReports.IgnoreQueryFilters()
                .Where(r => r.Status == ReportStatus.Resolved)
                .OrderByDescending(r => r.ResolvedAt).Take(take)
                .Include(r => r.Question).Include(r => r.Quiz)
                .AsNoTracking().ToListAsync(ct);

        public Task<List<ContentReport>> ListOpenWrongAnswerForAuthorAsync(Guid authorId, CancellationToken ct = default) =>
            db.ContentReports.IgnoreQueryFilters()
                .Where(r => r.Status == ReportStatus.Open && r.Reason == ReportReason.WrongAnswer
                    && ((r.QuestionId != null && r.Question!.UserId == authorId)
                        || (r.QuestionId == null && r.Quiz!.UserId == authorId)))
                .Include(r => r.Question).Include(r => r.Quiz)
                .OrderByDescending(r => r.CreatedAt)
                .AsNoTracking().ToListAsync(ct);

        public Task<List<QuestionBase>> GetQuestionsUsingAssetAsync(Guid assetId, CancellationToken ct = default) =>
            db.Questions.IgnoreQueryFilters().Where(q => q.MediaAssetId == assetId).ToListAsync(ct);

        public Task<List<Quiz>> GetQuizzesUsingAssetAsync(Guid assetId, CancellationToken ct = default) =>
            db.Quizzes.IgnoreQueryFilters().Where(q => q.CoverAssetId == assetId).ToListAsync(ct);

        public async Task<Dictionary<Guid, string>> GetUsernamesAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
        {
            var set = ids.Distinct().ToList();
            return await db.Users.IgnoreQueryFilters().Where(u => set.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Username, ct);
        }

        public Task<bool> IsStaffAsync(Guid userId, CancellationToken ct = default) =>
            db.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == userId
                && u.UserRoles.Any(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SuperAdmin"), ct);
    }
}
