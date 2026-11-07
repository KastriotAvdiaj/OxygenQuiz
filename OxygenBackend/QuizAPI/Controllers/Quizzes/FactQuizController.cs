using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Exceptions;
using QuizAPI.Services.Facts;
using QuizAPI.Services.Roles;

namespace QuizAPI.Controllers.Quizzes
{
    /// <summary>
    /// Quizzes built from Wikidata fact packs (docs/quiz/fact-quizzes.md). No model is called, so
    /// there is no quota and no spend: the builder is a few milliseconds of templates over a file
    /// that shipped with the app. Like <c>ai-generate</c>, this only returns questions for review;
    /// saving goes through <c>ai-import</c>.
    ///
    /// <para><b>Admins, SuperAdmins and Teachers only</b> (<see cref="RoleRules.AiRoles"/>), since
    /// 2026-11-08: the two packs hold 64 facts between them, so every quiz from them is much the
    /// same quiz — not something to offer every player. docs/quiz/fact-quizzes.md.</para>
    /// </summary>
    [ApiController]
    [Route("api/quiz")]
    [Authorize(Roles = RoleRules.AiRoles)]
    public class FactQuizController : BaseApiController
    {
        private readonly IFactPackCatalog _catalog;

        public FactQuizController(IFactPackCatalog catalog)
        {
            _catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
        }

        [HttpGet("fact-packs")]
        public ActionResult<List<FactPackDTO>> GetPacks() =>
            Ok(_catalog.All.Select(FactPackDTO.From).ToList());

        [HttpPost("fact-quiz")]
        public ActionResult<FactQuizResponseDTO> Build([FromBody] FactQuizRequestDTO request)
        {
            var pack = _catalog.Find(request.PackSlug)
                       ?? throw new NotFoundException($"There's no fact pack called \"{request.PackSlug}\".");

            FactQuizResult result;
            try
            {
                result = FactQuizBuilder.Build(
                    pack,
                    new FactQuizRequest(
                        request.LanguageName.Trim(),
                        request.QuestionCount,
                        request.AllowedTypes,
                        request.DifficultyNames),
                    Random.Shared);
            }
            catch (FactQuizException ex)
            {
                throw new AppValidationException(ex.Message);
            }

            var title = pack.Title.TryGetValue(request.LanguageName.Trim(), out var t) ? t : pack.Slug;
            return Ok(new FactQuizResponseDTO
            {
                Payload = result.Payload,
                Grounding = new AiGroundingDTO
                {
                    Status = "Grounded",
                    Language = request.LanguageName.Trim(),
                    Source = new AiGroundedSourceDTO
                    {
                        Provider = "wikidata",
                        Title = title,
                        Url = pack.QueryUrl,
                        Text = result.SourceText,
                        Language = request.LanguageName.Trim(),
                    },
                },
            });
        }
    }
}
