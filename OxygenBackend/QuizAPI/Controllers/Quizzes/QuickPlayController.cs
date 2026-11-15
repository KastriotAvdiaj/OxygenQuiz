using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.Controllers.Quizzes.Services.QuizServices;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Quizzes
{
    /// <summary>
    /// Quick play (docs/quiz/quick-play.md): which categories and difficulties have a quiz to hand
    /// out, and one quiz for a choice. Anonymous, like the catalogue — a signed-out visitor's one
    /// free quiz starts here too. Neither endpoint returns anything about a quiz but its id; the
    /// play route reads the quiz and applies its own rules.
    /// </summary>
    [ApiController]
    [Route("api/quick-play")]
    [AllowAnonymous]
    public class QuickPlayController : ControllerBase
    {
        /// <summary>Ids a client may list as seen. More than a player would meet; less than a URL's limit.</summary>
        public const int MaxExcluded = 200;

        private readonly IQuickPlayService _quickPlay;
        private readonly ICurrentUserService _currentUser;

        public QuickPlayController(IQuickPlayService quickPlay, ICurrentUserService currentUser)
        {
            _quickPlay = quickPlay;
            _currentUser = currentUser;
        }

        /// <summary>The (category, difficulty) pairs that have at least one quiz, with how many.</summary>
        [HttpGet("options")]
        public async Task<IActionResult> Options([FromQuery] string? languageIds, CancellationToken ct) =>
            Ok(await _quickPlay.GetCombosAsync(Ids(languageIds), ct));

        /// <summary>
        /// One quiz for the choice. 404 when nothing matches at all; otherwise the quiz's id, or
        /// <c>exhausted</c> when this player has had every match.
        /// </summary>
        [HttpGet("pick")]
        public async Task<IActionResult> Pick(
            [FromQuery] int? categoryId,
            [FromQuery] int? difficultyId,
            [FromQuery] string? languageIds,
            [FromQuery] string? exclude,
            [FromQuery] bool allowRepeats,
            CancellationToken ct)
        {
            var pick = await _quickPlay.PickAsync(
                new QuickPlayChoice(categoryId, difficultyId, Ids(languageIds), Ids(exclude), allowRepeats),
                _currentUser.UserId,
                ct);
            return pick is null ? NotFound() : Ok(pick);
        }

        /// <summary>"3,7,12" → ids. Anything that isn't a positive number is dropped, not refused.</summary>
        internal static List<int> Ids(string? csv) =>
            (csv ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(part => int.TryParse(part, out var id) ? id : 0)
                .Where(id => id > 0)
                .Distinct()
                .Take(MaxExcluded)
                .ToList();
    }
}
