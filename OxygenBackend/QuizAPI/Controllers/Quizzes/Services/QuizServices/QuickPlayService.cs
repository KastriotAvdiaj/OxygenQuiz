using Microsoft.EntityFrameworkCore;
using QuizAPI.Common;
using QuizAPI.Models.Quiz;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Controllers.Quizzes.Services.QuizServices
{
    /// <summary>How many quick-play quizzes one category has at one difficulty.</summary>
    public record QuickPlayComboDTO(int CategoryId, int DifficultyId, int Count);

    /// <summary>
    /// The answer to "give me a quiz": the quiz to start, or <see cref="Exhausted"/> — there are
    /// quizzes for this choice, and this player has had every one of them.
    /// </summary>
    public record QuickPlayPickDTO(int? QuizId, bool Exhausted);

    public record QuickPlayChoice(
        int? CategoryId,
        int? DifficultyId,
        IReadOnlyCollection<int> LanguageIds,
        IReadOnlyCollection<int> Exclude,
        bool AllowRepeats);

    public interface IQuickPlayService
    {
        Task<List<QuickPlayComboDTO>> GetCombosAsync(IReadOnlyCollection<int> languageIds, CancellationToken ct = default);

        /// <summary>Null when no quiz at all matches the choice.</summary>
        Task<QuickPlayPickDTO?> PickAsync(QuickPlayChoice choice, Guid? userId, CancellationToken ct = default);
    }

    /// <summary>
    /// Quick play (docs/quiz/quick-play.md): a category and a difficulty in, one quiz out. The
    /// player chooses nothing else — so which quizzes may be handed out, and which one, is the rule
    /// this class exists for.
    ///
    /// <para><b>What may be handed out</b> is narrower than the catalogue: Public, not held by
    /// moderation, a released format (ADR 0019), <b>Classic</b>, and <b>picked</b>. Picked because
    /// nobody chose this quiz — in the catalogue a visitor opts into community quizzes behind a
    /// switch and a notice; here the site is choosing for them, so it chooses from what the team
    /// has vouched for. The same for every caller, an admin included: quick play is the visitor's
    /// path and should show an admin what a visitor gets.</para>
    ///
    /// <para><b>Which one</b> is random among the ones this player hasn't had: the ids the client
    /// says it has seen (a guest has nothing else), and for a signed-in player every quiz they
    /// have a session of. When that leaves nothing the answer is <c>Exhausted</c>, not a silent
    /// repeat — the player is told, and asks again with <c>AllowRepeats</c> if they want one.</para>
    /// </summary>
    public class QuickPlayService : IQuickPlayService
    {
        private readonly IQuizRepository _quizzes;
        private readonly Random _random;

        public QuickPlayService(IQuizRepository quizzes, Random? random = null)
        {
            _quizzes = quizzes;
            _random = random ?? Random.Shared;
        }

        private IQueryable<Quiz> Eligible(IReadOnlyCollection<int> languageIds)
        {
            var quizzes = _quizzes.Query().VisibleTo(canSeePreview: false)
                .Where(q => q.Status == QuizStatus.Public
                            && q.ModerationHeldAt == null
                            && q.Format == QuizFormat.Classic
                            && q.IsPicked);
            return languageIds.Count == 0 ? quizzes : quizzes.Where(q => languageIds.Contains(q.LanguageId));
        }

        public async Task<List<QuickPlayComboDTO>> GetCombosAsync(
            IReadOnlyCollection<int> languageIds, CancellationToken ct = default)
        {
            var rows = await Eligible(languageIds)
                .GroupBy(q => new { q.CategoryId, q.DifficultyId })
                .Select(g => new { g.Key.CategoryId, g.Key.DifficultyId, Count = g.Count() })
                .ToListAsync(ct);
            return rows.Select(r => new QuickPlayComboDTO(r.CategoryId, r.DifficultyId, r.Count)).ToList();
        }

        public async Task<QuickPlayPickDTO?> PickAsync(QuickPlayChoice choice, Guid? userId, CancellationToken ct = default)
        {
            var quizzes = Eligible(choice.LanguageIds);
            if (choice.CategoryId is { } categoryId) quizzes = quizzes.Where(q => q.CategoryId == categoryId);
            if (choice.DifficultyId is { } difficultyId) quizzes = quizzes.Where(q => q.DifficultyId == difficultyId);

            var ids = await quizzes.Select(q => q.Id).ToListAsync(ct);
            if (ids.Count == 0) return null;

            var seen = new HashSet<int>(choice.Exclude);
            if (choice.AllowRepeats)
            {
                // "Play one again": anything but what the client names — the quiz just played —
                // unless that is all there is.
                var again = ids.Where(id => !seen.Contains(id)).ToList();
                return new QuickPlayPickDTO(Draw(again.Count > 0 ? again : ids), Exhausted: false);
            }

            if (userId is { } uid)
                seen.UnionWith(await _quizzes.GetPlayedQuizIdsAsync(uid, ids, ct));

            var fresh = ids.Where(id => !seen.Contains(id)).ToList();
            return fresh.Count == 0
                ? new QuickPlayPickDTO(null, Exhausted: true)
                : new QuickPlayPickDTO(Draw(fresh), Exhausted: false);
        }

        private int Draw(List<int> ids) => ids[_random.Next(ids.Count)];
    }
}
