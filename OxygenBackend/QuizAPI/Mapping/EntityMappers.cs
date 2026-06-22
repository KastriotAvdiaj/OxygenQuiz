using System.Linq.Expressions;
using Newtonsoft.Json;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.DTOs.User;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Mapping
{
    // Manual replacements for the former AutoMapper profiles. Each mapping is a
    // static Expression<Func<TEntity, TDto>> so it can be used two ways with one
    // definition:
    //   • EF query projection  → query.Select(Mapper.Project)   (translated to SQL)
    //   • in-memory mapping     → entity.ToDto()                 (compiled delegate)
    // Navigation accesses are null-guarded so the compiled in-memory path matches
    // AutoMapper's null-propagation and EF's outer-join semantics.

    public static class SecondaryMappers
    {
        public static readonly Expression<Func<User, UserBasicDTO>> ProjectUserBasic =
            u => new UserBasicDTO { Id = u.Id, Username = u.Username, ProfileImageUrl = u.ProfileImageUrl };

        public static readonly Expression<Func<QuestionCategory, QuestionCategoryDTO>> ProjectCategory =
            c => new QuestionCategoryDTO
            {
                Id = c.Id,
                Name = c.Name,
                Username = c.User == null ? null : c.User.Username,
                ColorPaletteJson = c.ColorPaletteJson,
                CreatedAt = c.CreatedAt,
                Gradient = c.Gradient
            };

        public static readonly Expression<Func<QuestionLanguage, QuestionLanguageDTO>> ProjectLanguage =
            l => new QuestionLanguageDTO
            {
                ID = l.Id,
                Language = l.Language,
                Username = l.User == null ? null : l.User.Username,
                CreatedAt = l.CreatedAt
            };

        public static readonly Expression<Func<QuestionDifficulty, QuestionDifficultyDTO>> ProjectDifficulty =
            d => new QuestionDifficultyDTO
            {
                ID = d.ID,
                Level = d.Level,
                Weight = d.Weight,
                Username = d.User == null ? null : d.User.Username,
                CreatedAt = d.CreatedAt
            };

        private static readonly Func<User, UserBasicDTO> _userBasic = ProjectUserBasic.Compile();
        private static readonly Func<QuestionCategory, QuestionCategoryDTO> _category = ProjectCategory.Compile();
        private static readonly Func<QuestionLanguage, QuestionLanguageDTO> _language = ProjectLanguage.Compile();
        private static readonly Func<QuestionDifficulty, QuestionDifficultyDTO> _difficulty = ProjectDifficulty.Compile();

        public static UserBasicDTO ToBasicDto(this User u) => _userBasic(u);
        public static QuestionCategoryDTO ToDto(this QuestionCategory c) => _category(c);
        public static QuestionLanguageDTO ToDto(this QuestionLanguage l) => _language(l);
        public static QuestionDifficultyDTO ToDto(this QuestionDifficulty d) => _difficulty(d);

        // QuestionCategoryCM → QuestionCategory (Id/UserId/CreatedAt/Questions set by the caller).
        public static QuestionCategory ToEntity(this QuestionCategoryCM cm)
        {
            var entity = new QuestionCategory();
            cm.ApplyTo(entity);
            return entity;
        }

        // In-place update of an existing category from a create/edit model.
        public static void ApplyTo(this QuestionCategoryCM cm, QuestionCategory entity)
        {
            entity.Name = cm.Name;
            entity.Gradient = cm.Gradient;
            entity.ColorPaletteJson = cm.ColorPalette != null && cm.ColorPalette.Any()
                ? JsonConvert.SerializeObject(cm.ColorPalette)
                : null;
        }
    }

    public static class QuestionMappers
    {
        // Base-only projection (matches the former ProjectTo<QuestionBaseDTO>).
        public static readonly Expression<Func<QuestionBase, QuestionBaseDTO>> ProjectBase =
            q => new QuestionBaseDTO
            {
                Id = q.Id,
                Text = q.Text,
                CreatedAt = q.CreatedAt,
                ImageUrl = q.ImageUrl,
                MediaUrl = q.MediaUrl ?? q.ImageUrl,
                MediaType =
                    q.MediaType == QuestionMediaType.Image ? "Image" :
                    q.MediaType == QuestionMediaType.Audio ? "Audio" :
                    q.MediaType == QuestionMediaType.Video ? "Video" :
                    (q.ImageUrl != null ? "Image" : "None"),
                Visibility = q.Visibility.ToString(),
                Type = q.Type.ToString(),
                Difficulty = q.Difficulty == null ? null : new QuestionDifficultyDTO
                {
                    ID = q.Difficulty.ID,
                    Level = q.Difficulty.Level,
                    Weight = q.Difficulty.Weight,
                    Username = q.Difficulty.User == null ? null : q.Difficulty.User.Username,
                    CreatedAt = q.Difficulty.CreatedAt
                },
                Category = q.Category == null ? null : new QuestionCategoryDTO
                {
                    Id = q.Category.Id,
                    Name = q.Category.Name,
                    Username = q.Category.User == null ? null : q.Category.User.Username,
                    ColorPaletteJson = q.Category.ColorPaletteJson,
                    CreatedAt = q.Category.CreatedAt,
                    Gradient = q.Category.Gradient
                },
                Language = q.Language == null ? null : new QuestionLanguageDTO
                {
                    ID = q.Language.Id,
                    Language = q.Language.Language,
                    Username = q.Language.User == null ? null : q.Language.User.Username,
                    CreatedAt = q.Language.CreatedAt
                },
                User = q.User == null ? null : new UserBasicDTO
                {
                    Id = q.User.Id,
                    Username = q.User.Username,
                    ProfileImageUrl = q.User.ProfileImageUrl
                }
            };

        public static readonly Expression<Func<MultipleChoiceQuestion, MultipleChoiceQuestionDTO>> ProjectMultipleChoice =
            q => new MultipleChoiceQuestionDTO
            {
                Id = q.Id,
                Text = q.Text,
                CreatedAt = q.CreatedAt,
                ImageUrl = q.ImageUrl,
                MediaUrl = q.MediaUrl ?? q.ImageUrl,
                MediaType =
                    q.MediaType == QuestionMediaType.Image ? "Image" :
                    q.MediaType == QuestionMediaType.Audio ? "Audio" :
                    q.MediaType == QuestionMediaType.Video ? "Video" :
                    (q.ImageUrl != null ? "Image" : "None"),
                Visibility = q.Visibility.ToString(),
                Type = q.Type.ToString(),
                Difficulty = q.Difficulty == null ? null : new QuestionDifficultyDTO
                {
                    ID = q.Difficulty.ID,
                    Level = q.Difficulty.Level,
                    Weight = q.Difficulty.Weight,
                    Username = q.Difficulty.User == null ? null : q.Difficulty.User.Username,
                    CreatedAt = q.Difficulty.CreatedAt
                },
                Category = q.Category == null ? null : new QuestionCategoryDTO
                {
                    Id = q.Category.Id,
                    Name = q.Category.Name,
                    Username = q.Category.User == null ? null : q.Category.User.Username,
                    ColorPaletteJson = q.Category.ColorPaletteJson,
                    CreatedAt = q.Category.CreatedAt,
                    Gradient = q.Category.Gradient
                },
                Language = q.Language == null ? null : new QuestionLanguageDTO
                {
                    ID = q.Language.Id,
                    Language = q.Language.Language,
                    Username = q.Language.User == null ? null : q.Language.User.Username,
                    CreatedAt = q.Language.CreatedAt
                },
                User = q.User == null ? null : new UserBasicDTO
                {
                    Id = q.User.Id,
                    Username = q.User.Username,
                    ProfileImageUrl = q.User.ProfileImageUrl
                },
                AllowMultipleSelections = q.AllowMultipleSelections,
                AnswerOptions = q.AnswerOptions
                    .Select(a => new AnswerOptionDTO { ID = a.Id, Text = a.Text, IsCorrect = a.IsCorrect })
                    .ToList()
            };

        public static readonly Expression<Func<TrueFalseQuestion, TrueFalseQuestionDTO>> ProjectTrueFalse =
            q => new TrueFalseQuestionDTO
            {
                Id = q.Id,
                Text = q.Text,
                CreatedAt = q.CreatedAt,
                ImageUrl = q.ImageUrl,
                MediaUrl = q.MediaUrl ?? q.ImageUrl,
                MediaType =
                    q.MediaType == QuestionMediaType.Image ? "Image" :
                    q.MediaType == QuestionMediaType.Audio ? "Audio" :
                    q.MediaType == QuestionMediaType.Video ? "Video" :
                    (q.ImageUrl != null ? "Image" : "None"),
                Visibility = q.Visibility.ToString(),
                Type = q.Type.ToString(),
                Difficulty = q.Difficulty == null ? null : new QuestionDifficultyDTO
                {
                    ID = q.Difficulty.ID,
                    Level = q.Difficulty.Level,
                    Weight = q.Difficulty.Weight,
                    Username = q.Difficulty.User == null ? null : q.Difficulty.User.Username,
                    CreatedAt = q.Difficulty.CreatedAt
                },
                Category = q.Category == null ? null : new QuestionCategoryDTO
                {
                    Id = q.Category.Id,
                    Name = q.Category.Name,
                    Username = q.Category.User == null ? null : q.Category.User.Username,
                    ColorPaletteJson = q.Category.ColorPaletteJson,
                    CreatedAt = q.Category.CreatedAt,
                    Gradient = q.Category.Gradient
                },
                Language = q.Language == null ? null : new QuestionLanguageDTO
                {
                    ID = q.Language.Id,
                    Language = q.Language.Language,
                    Username = q.Language.User == null ? null : q.Language.User.Username,
                    CreatedAt = q.Language.CreatedAt
                },
                User = q.User == null ? null : new UserBasicDTO
                {
                    Id = q.User.Id,
                    Username = q.User.Username,
                    ProfileImageUrl = q.User.ProfileImageUrl
                },
                CorrectAnswer = q.CorrectAnswer
            };

        public static readonly Expression<Func<TypeTheAnswerQuestion, TypeTheAnswerQuestionDTO>> ProjectTypeTheAnswer =
            q => new TypeTheAnswerQuestionDTO
            {
                Id = q.Id,
                Text = q.Text,
                CreatedAt = q.CreatedAt,
                ImageUrl = q.ImageUrl,
                MediaUrl = q.MediaUrl ?? q.ImageUrl,
                MediaType =
                    q.MediaType == QuestionMediaType.Image ? "Image" :
                    q.MediaType == QuestionMediaType.Audio ? "Audio" :
                    q.MediaType == QuestionMediaType.Video ? "Video" :
                    (q.ImageUrl != null ? "Image" : "None"),
                Visibility = q.Visibility.ToString(),
                Type = q.Type.ToString(),
                Difficulty = q.Difficulty == null ? null : new QuestionDifficultyDTO
                {
                    ID = q.Difficulty.ID,
                    Level = q.Difficulty.Level,
                    Weight = q.Difficulty.Weight,
                    Username = q.Difficulty.User == null ? null : q.Difficulty.User.Username,
                    CreatedAt = q.Difficulty.CreatedAt
                },
                Category = q.Category == null ? null : new QuestionCategoryDTO
                {
                    Id = q.Category.Id,
                    Name = q.Category.Name,
                    Username = q.Category.User == null ? null : q.Category.User.Username,
                    ColorPaletteJson = q.Category.ColorPaletteJson,
                    CreatedAt = q.Category.CreatedAt,
                    Gradient = q.Category.Gradient
                },
                Language = q.Language == null ? null : new QuestionLanguageDTO
                {
                    ID = q.Language.Id,
                    Language = q.Language.Language,
                    Username = q.Language.User == null ? null : q.Language.User.Username,
                    CreatedAt = q.Language.CreatedAt
                },
                User = q.User == null ? null : new UserBasicDTO
                {
                    Id = q.User.Id,
                    Username = q.User.Username,
                    ProfileImageUrl = q.User.ProfileImageUrl
                },
                CorrectAnswer = q.CorrectAnswer,
                IsCaseSensitive = q.IsCaseSensitive,
                AllowPartialMatch = q.AllowPartialMatch,
                AcceptableAnswers = q.AcceptableAnswers
            };

        private static readonly Func<QuestionBase, QuestionBaseDTO> _base = ProjectBase.Compile();
        private static readonly Func<MultipleChoiceQuestion, MultipleChoiceQuestionDTO> _mcq = ProjectMultipleChoice.Compile();
        private static readonly Func<TrueFalseQuestion, TrueFalseQuestionDTO> _tf = ProjectTrueFalse.Compile();
        private static readonly Func<TypeTheAnswerQuestion, TypeTheAnswerQuestionDTO> _tta = ProjectTypeTheAnswer.Compile();

        public static MultipleChoiceQuestionDTO ToDto(this MultipleChoiceQuestion q) => _mcq(q);
        public static TrueFalseQuestionDTO ToDto(this TrueFalseQuestion q) => _tf(q);
        public static TypeTheAnswerQuestionDTO ToDto(this TypeTheAnswerQuestion q) => _tta(q);

        // Polymorphic in-memory mapping: returns the rich per-type DTO (matches the
        // former AutoMapper Include<>/IncludeBase<> behaviour for QuestionBaseDTO lists).
        public static QuestionBaseDTO ToDto(this QuestionBase q) => q switch
        {
            MultipleChoiceQuestion m => _mcq(m),
            TrueFalseQuestion t => _tf(t),
            TypeTheAnswerQuestion ta => _tta(ta),
            _ => _base(q)
        };

        public static List<QuestionBaseDTO> ToDtoList(this IEnumerable<QuestionBase> questions) =>
            questions.Select(ToDto).ToList();

        // Parses the wire string ("Image"/"Audio"/"Video"/"None") into the enum, defaulting to None.
        private static QuestionMediaType ParseMediaType(string? s) =>
            Enum.TryParse<QuestionMediaType>(s, ignoreCase: true, out var t) ? t : QuestionMediaType.None;

        // ── Creation models → entities (service sets UserId/CreatedAt/Type/Visibility) ──
        public static MultipleChoiceQuestion ToEntity(this MultipleChoiceQuestionCM cm) => new()
        {
            Text = cm.Text,
            ImageUrl = cm.ImageUrl,
            MediaUrl = cm.MediaUrl,
            MediaType = ParseMediaType(cm.MediaType),
            DifficultyId = cm.DifficultyId,
            CategoryId = cm.CategoryId,
            LanguageId = cm.LanguageId,
            AllowMultipleSelections = cm.AllowMultipleSelections,
            AnswerOptions = cm.AnswerOptions
                .Select(a => new AnswerOption { Text = a.Text, IsCorrect = a.IsCorrect })
                .ToList()
        };

        public static TrueFalseQuestion ToEntity(this TrueFalseQuestionCM cm) => new()
        {
            Text = cm.Text,
            ImageUrl = cm.ImageUrl,
            MediaUrl = cm.MediaUrl,
            MediaType = ParseMediaType(cm.MediaType),
            DifficultyId = cm.DifficultyId,
            CategoryId = cm.CategoryId,
            LanguageId = cm.LanguageId,
            CorrectAnswer = cm.CorrectAnswer
        };

        public static TypeTheAnswerQuestion ToEntity(this TypeTheAnswerQuestionCM cm) => new()
        {
            Text = cm.Text,
            ImageUrl = cm.ImageUrl,
            MediaUrl = cm.MediaUrl,
            MediaType = ParseMediaType(cm.MediaType),
            DifficultyId = cm.DifficultyId,
            CategoryId = cm.CategoryId,
            LanguageId = cm.LanguageId,
            CorrectAnswer = cm.CorrectAnswer,
            IsCaseSensitive = cm.IsCaseSensitive,
            AllowPartialMatch = cm.AllowPartialMatch,
            AcceptableAnswers = cm.AcceptableAnswers
        };

        // ── Update models → existing entities (scalar fields only) ──
        // AnswerOptions are intentionally left to SyncAnswerOptionsAsync; Visibility is
        // set by the service after this call.
        private static void ApplyBase(QuestionBaseUM um, QuestionBase q)
        {
            q.Text = um.Text;
            q.ImageUrl = um.ImageUrl;
            q.MediaUrl = um.MediaUrl;
            q.MediaType = ParseMediaType(um.MediaType);
            q.DifficultyId = um.DifficultyId;
            q.CategoryId = um.CategoryId;
            q.LanguageId = um.LanguageId;
        }

        public static void ApplyTo(this MultipleChoiceQuestionUM um, MultipleChoiceQuestion q)
        {
            ApplyBase(um, q);
            q.AllowMultipleSelections = um.AllowMultipleSelections;
        }

        public static void ApplyTo(this TrueFalseQuestionUM um, TrueFalseQuestion q)
        {
            ApplyBase(um, q);
            q.CorrectAnswer = um.CorrectAnswer;
        }

        public static void ApplyTo(this TypeTheAnswerQuestionUM um, TypeTheAnswerQuestion q)
        {
            ApplyBase(um, q);
            q.CorrectAnswer = um.CorrectAnswer;
            q.IsCaseSensitive = um.IsCaseSensitive;
            q.AllowPartialMatch = um.AllowPartialMatch;
            q.AcceptableAnswers = um.AcceptableAnswers;
        }
    }

    public static class QuizMappers
    {
        public static readonly Expression<Func<Quiz, QuizSummaryDTO>> ProjectSummary =
            q => new QuizSummaryDTO
            {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                ImageUrl = q.ImageUrl,
                TimeLimitInSeconds = q.TimeLimitInSeconds ?? 0,
                IsPublished = q.IsPublished,
                IsActive = q.IsActive,
                CreatedAt = q.CreatedAt,
                Category = q.Category == null ? string.Empty : q.Category.Name,
                ColorPaletteJson = q.Category == null ? null : q.Category.ColorPaletteJson,
                Gradient = q.Category != null && q.Category.Gradient,
                Difficulty = q.Difficulty == null ? string.Empty : q.Difficulty.Level,
                Language = q.Language == null ? string.Empty : q.Language.Language,
                QuestionCount = q.QuizQuestions.Count,
                User = q.User == null ? string.Empty : q.User.Username,
                Visibility = q.Visibility.ToString(),
                DeletedAt = q.DeletedAt
            };

        public static readonly Expression<Func<Quiz, QuizDTO>> ProjectDetail =
            q => new QuizDTO
            {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                TimeLimitInSeconds = q.TimeLimitInSeconds ?? 0,
                ShowFeedbackImmediately = q.ShowFeedbackImmediately,
                ShuffleQuestions = q.ShuffleQuestions,
                IsPublished = q.IsPublished,
                IsActive = q.IsActive,
                CreatedAt = q.CreatedAt,
                Version = q.Version,
                ImageUrl = q.ImageUrl,
                QuestionCount = q.QuizQuestions.Count,
                Visibility = q.Visibility.ToString(),
                User = q.User == null ? null : new UserBasicDTO
                {
                    Id = q.User.Id,
                    Username = q.User.Username,
                    ProfileImageUrl = q.User.ProfileImageUrl
                },
                Category = q.Category == null ? new QuestionCategoryDTO() : new QuestionCategoryDTO
                {
                    Id = q.Category.Id,
                    Name = q.Category.Name,
                    Username = q.Category.User == null ? null : q.Category.User.Username,
                    ColorPaletteJson = q.Category.ColorPaletteJson,
                    CreatedAt = q.Category.CreatedAt,
                    Gradient = q.Category.Gradient
                },
                Language = q.Language == null ? new QuestionLanguageDTO() : new QuestionLanguageDTO
                {
                    ID = q.Language.Id,
                    Language = q.Language.Language,
                    Username = q.Language.User == null ? null : q.Language.User.Username,
                    CreatedAt = q.Language.CreatedAt
                },
                Difficulty = q.Difficulty == null ? new QuestionDifficultyDTO() : new QuestionDifficultyDTO
                {
                    ID = q.Difficulty.ID,
                    Level = q.Difficulty.Level,
                    Weight = q.Difficulty.Weight,
                    Username = q.Difficulty.User == null ? null : q.Difficulty.User.Username,
                    CreatedAt = q.Difficulty.CreatedAt
                }
            };

        private static readonly Func<Quiz, QuizSummaryDTO> _summary = ProjectSummary.Compile();
        private static readonly Func<Quiz, QuizDTO> _detail = ProjectDetail.Compile();

        public static QuizSummaryDTO ToSummaryDto(this Quiz q) => _summary(q);
        public static QuizDTO ToDto(this Quiz q) => _detail(q);
        public static List<QuizSummaryDTO> ToSummaryDtoList(this IEnumerable<Quiz> quizzes) =>
            quizzes.Select(_summary).ToList();

        // QuizQuestion → QuizQuestionDTO (in-memory; nested question mapped polymorphically).
        public static QuizQuestionDTO ToDto(this QuizQuestion qq) => new()
        {
            QuizId = qq.QuizId,
            QuestionId = qq.QuestionId,
            TimeLimitInSeconds = qq.TimeLimitInSeconds,
            PointSystem = qq.PointSystem.ToString(),
            OrderInQuiz = qq.OrderInQuiz,
            Question = qq.Question == null ? new QuestionBaseDTO() : qq.Question.ToDto()
        };

        public static List<QuizQuestionDTO> ToDtoList(this IEnumerable<QuizQuestion> quizQuestions) =>
            quizQuestions.Select(ToDto).ToList();

        // ── Create models → entities (service sets ownership/timestamps/relations) ──
        public static Quiz ToEntity(this QuizCM cm) => new()
        {
            Title = cm.Title,
            Description = cm.Description,
            CategoryId = cm.CategoryId,
            LanguageId = cm.LanguageId,
            DifficultyId = cm.DifficultyId,
            TimeLimitInSeconds = cm.TimeLimitInSeconds,
            ShowFeedbackImmediately = cm.ShowFeedbackImmediately,
            ShuffleQuestions = cm.ShuffleQuestions,
            IsPublished = cm.IsPublished,
            ImageUrl = cm.ImageUrl,
            Visibility = Enum.Parse<QuizVisibility>(cm.Visibility, true)
        };

        public static QuizQuestion ToEntity(this QuizQuestionCM cm) => new()
        {
            QuestionId = cm.QuestionId,
            TimeLimitInSeconds = cm.TimeLimitInSeconds,
            OrderInQuiz = cm.OrderInQuiz,
            PointSystem = Enum.Parse<PointSystem>(cm.PointSystem, true)
        };

        public static QuizQuestion ToEntity(this QuizQuestionUM um) => new()
        {
            QuestionId = um.QuestionId,
            TimeLimitInSeconds = um.TimeLimitInSeconds,
            OrderInQuiz = um.OrderInQuiz,
            PointSystem = Enum.Parse<PointSystem>(um.PointSystem, true)
        };
    }

    public static class QuizSessionMappers
    {
        public static readonly Expression<Func<UserAnswer, UserAnswerDto>> ProjectUserAnswer =
            ua => new UserAnswerDto
            {
                Id = ua.Id,
                Status = ua.Status,
                Score = ua.Score,
                SelectedOptionId = ua.SelectedOptionId,
                SubmittedAnswer = ua.SubmittedAnswer,
                QuestionText = ua.QuizQuestion.Question.Text,
                MediaUrl = ua.QuizQuestion.Question.MediaUrl ?? ua.QuizQuestion.Question.ImageUrl,
                MediaType =
                    ua.QuizQuestion.Question.MediaType == QuestionMediaType.Image ? "Image" :
                    ua.QuizQuestion.Question.MediaType == QuestionMediaType.Audio ? "Audio" :
                    ua.QuizQuestion.Question.MediaType == QuestionMediaType.Video ? "Video" :
                    (ua.QuizQuestion.Question.ImageUrl != null ? "Image" : "None"),
                QuestionType = ua.QuizQuestion.Question.Type,
                TimeLimitInSeconds = ua.QuizQuestion.TimeLimitInSeconds,
                TimeSpentInSeconds = ua.SubmittedTime.HasValue
                    ? (double?)(ua.SubmittedTime.Value - ua.QuestionStartTime).TotalSeconds
                    : null,
                AnswerOptions = ua.QuizQuestion.Question is MultipleChoiceQuestion
                    ? ((MultipleChoiceQuestion)ua.QuizQuestion.Question).AnswerOptions
                        .Select(a => new AnswerOptionDTO { ID = a.Id, Text = a.Text, IsCorrect = a.IsCorrect })
                        .ToList()
                    : null,
                CorrectAnswerBoolean = ua.QuizQuestion.Question is TrueFalseQuestion
                    ? (bool?)((TrueFalseQuestion)ua.QuizQuestion.Question).CorrectAnswer
                    : null,
                CorrectAnswerText = ua.QuizQuestion.Question is TypeTheAnswerQuestion
                    ? ((TypeTheAnswerQuestion)ua.QuizQuestion.Question).CorrectAnswer
                    : null,
                AcceptableAnswers = ua.QuizQuestion.Question is TypeTheAnswerQuestion
                    ? ((TypeTheAnswerQuestion)ua.QuizQuestion.Question).AcceptableAnswers
                    : null
            };

        public static readonly Expression<Func<QuizSession, QuizSessionDto>> ProjectSession =
            s => new QuizSessionDto
            {
                Id = s.Id,
                QuizId = s.QuizId,
                UserId = s.UserId,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                TotalScore = s.TotalScore,
                IsCompleted = s.IsCompleted,
                AbandonmentReason = s.AbandonmentReason,
                AbandonedAt = s.AbandonedAt,
                QuizTitle = s.Quiz.Title,
                HasInstantFeedback = s.Quiz.ShowFeedbackImmediately,
                QuizDescription = s.Quiz.Description,
                Category = s.Quiz.Category.Name,
                TotalQuestions = s.Quiz.QuizQuestions.Count,
                UserAnswers = s.UserAnswers
                    .OrderBy(ua => ua.QuizQuestion.OrderInQuiz)
                    .Select(ua => new UserAnswerDto
                    {
                        Id = ua.Id,
                        Status = ua.Status,
                        Score = ua.Score,
                        SelectedOptionId = ua.SelectedOptionId,
                        SubmittedAnswer = ua.SubmittedAnswer,
                        QuestionText = ua.QuizQuestion.Question.Text,
                        MediaUrl = ua.QuizQuestion.Question.MediaUrl ?? ua.QuizQuestion.Question.ImageUrl,
                        MediaType =
                            ua.QuizQuestion.Question.MediaType == QuestionMediaType.Image ? "Image" :
                            ua.QuizQuestion.Question.MediaType == QuestionMediaType.Audio ? "Audio" :
                            ua.QuizQuestion.Question.MediaType == QuestionMediaType.Video ? "Video" :
                            (ua.QuizQuestion.Question.ImageUrl != null ? "Image" : "None"),
                        QuestionType = ua.QuizQuestion.Question.Type,
                        TimeLimitInSeconds = ua.QuizQuestion.TimeLimitInSeconds,
                        TimeSpentInSeconds = ua.SubmittedTime.HasValue
                            ? (double?)(ua.SubmittedTime.Value - ua.QuestionStartTime).TotalSeconds
                            : null,
                        AnswerOptions = ua.QuizQuestion.Question is MultipleChoiceQuestion
                            ? ((MultipleChoiceQuestion)ua.QuizQuestion.Question).AnswerOptions
                                .Select(a => new AnswerOptionDTO { ID = a.Id, Text = a.Text, IsCorrect = a.IsCorrect })
                                .ToList()
                            : null,
                        CorrectAnswerBoolean = ua.QuizQuestion.Question is TrueFalseQuestion
                            ? (bool?)((TrueFalseQuestion)ua.QuizQuestion.Question).CorrectAnswer
                            : null,
                        CorrectAnswerText = ua.QuizQuestion.Question is TypeTheAnswerQuestion
                            ? ((TypeTheAnswerQuestion)ua.QuizQuestion.Question).CorrectAnswer
                            : null,
                        AcceptableAnswers = ua.QuizQuestion.Question is TypeTheAnswerQuestion
                            ? ((TypeTheAnswerQuestion)ua.QuizQuestion.Question).AcceptableAnswers
                            : null
                    })
                    .ToList()
            };

        public static readonly Expression<Func<QuizSession, QuizSessionSummaryDto>> ProjectSummary =
            s => new QuizSessionSummaryDto
            {
                Id = s.Id,
                QuizId = s.QuizId,
                QuizTitle = s.Quiz.Title,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                TotalScore = s.TotalScore,
                TotalQuestions = s.Quiz.QuizQuestions.Count,
                CorrectAnswers = s.UserAnswers.Count(ua => ua.Status == AnswerStatus.Correct),
                IsCompleted = s.IsCompleted,
                Duration = s.EndTime.HasValue ? (TimeSpan?)(s.EndTime.Value - s.StartTime) : null,
                AbandonmentReason = s.AbandonmentReason,
                AbandonedAt = s.AbandonedAt
            };

        private static readonly Func<UserAnswer, UserAnswerDto> _userAnswer = ProjectUserAnswer.Compile();
        private static readonly Func<QuizSession, QuizSessionDto> _session = ProjectSession.Compile();
        private static readonly Func<QuizSession, QuizSessionSummaryDto> _summary = ProjectSummary.Compile();

        public static UserAnswerDto ToDto(this UserAnswer ua) => _userAnswer(ua);
        public static List<UserAnswerDto> ToDtoList(this IEnumerable<UserAnswer> answers) =>
            answers.Select(_userAnswer).ToList();
        public static QuizSessionDto ToDto(this QuizSession s) => _session(s);
        public static QuizSessionSummaryDto ToSummaryDto(this QuizSession s) => _summary(s);
        public static List<QuizSessionSummaryDto> ToSummaryDtoList(this IEnumerable<QuizSession> sessions) =>
            sessions.Select(_summary).ToList();

        // QuizQuestion → CurrentQuestionDto (live play). TimeRemainingInSeconds is set by the service.
        public static CurrentQuestionDto ToCurrentQuestionDto(this QuizQuestion qq)
        {
            List<AnswerOptionForQuizPlaying> options = qq.Question switch
            {
                MultipleChoiceQuestion mcq => mcq.AnswerOptions
                    .Select(a => new AnswerOptionForQuizPlaying { ID = a.Id, Text = a.Text })
                    .ToList(),
                TrueFalseQuestion => new List<AnswerOptionForQuizPlaying>
                {
                    new() { ID = 1, Text = "True" },
                    new() { ID = 2, Text = "False" }
                },
                _ => new List<AnswerOptionForQuizPlaying>()
            };

            return new CurrentQuestionDto
            {
                QuizQuestionId = qq.Id,
                QuestionText = qq.Question.Text,
                // Prefer the new media fields; fall back to the legacy ImageUrl so old
                // image-only questions still show during play.
                MediaUrl = qq.Question.MediaUrl ?? qq.Question.ImageUrl,
                MediaType = qq.Question.MediaType != QuestionMediaType.None
                    ? qq.Question.MediaType.ToString()
                    : (qq.Question.ImageUrl != null ? "Image" : "None"),
                TimeLimitInSeconds = qq.TimeLimitInSeconds,
                QuestionType = qq.Question.Type.ToString(),
                Options = options,
                AllowMultipleSelections =
                    qq.Question is MultipleChoiceQuestion mcQuestion && mcQuestion.AllowMultipleSelections
            };
        }

        // QuizSessionCM → QuizSession (service sets StartTime/state).
        public static QuizSession ToEntity(this QuizSessionCM cm) => new()
        {
            QuizId = cm.QuizId,
            UserId = cm.UserId
        };

        // UserAnswerCM → UserAnswer (service sets Status/Score/timing).
        public static UserAnswer ToEntity(this UserAnswerCM cm) => new()
        {
            SessionId = cm.SessionId,
            QuizQuestionId = cm.QuizQuestionId,
            SelectedOptionId = cm.SelectedOptionId,
            SubmittedAnswer = cm.SubmittedAnswer
        };
    }
}
