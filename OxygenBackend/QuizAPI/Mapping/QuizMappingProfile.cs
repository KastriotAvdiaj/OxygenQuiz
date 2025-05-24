using AutoMapper;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.DTOs.User;
using QuizAPI.ManyToManyTables;
using QuizAPI.Models.Quiz;
using QuizAPI.Models;

public class QuizMappingProfile : Profile
{
    public QuizMappingProfile()
    {
        // --- QuizQuestion Mappings ---

        // QuizQuestion Entity to QuizQuestionDTO (for reading)
        CreateMap<QuizQuestion, QuizQuestionDTO>()
            .ForMember(dest => dest.PointSystem, opt => opt.MapFrom(src => src.PointSystem.ToString()))
            .ForMember(dest => dest.Question, opt => opt.MapFrom(src => src.Question));

        // QuizQuestionCM (Create Model) to QuizQuestion Entity
        CreateMap<QuizQuestionCM, QuizQuestion>()
            .ForMember(dest => dest.QuizId, opt => opt.Ignore())
            .ForMember(dest => dest.Quiz, opt => opt.Ignore())
            .ForMember(dest => dest.Question, opt => opt.Ignore())
            .ForMember(dest => dest.TimeLimitInSeconds, opt => opt.MapFrom(src => src.TimeLimitInSeconds))
            .ForMember(dest => dest.OrderInQuiz, opt => opt.MapFrom(src => src.OrderInQuiz))
            .ForMember(dest => dest.PointSystem, opt => opt.MapFrom(src => Enum.Parse<PointSystem>(src.PointSystem, true)));

        // QuizQuestionUM (Update Model) to QuizQuestion Entity
        CreateMap<QuizQuestionUM, QuizQuestion>()
            .ForMember(dest => dest.Quiz, opt => opt.Ignore())
            .ForMember(dest => dest.Question, opt => opt.Ignore())
            .ForMember(dest => dest.TimeLimitInSeconds, opt => opt.MapFrom(src => src.TimeLimitInSeconds))
            .ForMember(dest => dest.OrderInQuiz, opt => opt.MapFrom(src => src.OrderInQuiz))
            .ForMember(dest => dest.PointSystem, opt => opt.MapFrom(src => Enum.Parse<PointSystem>(src.PointSystem, true)));

        // Quiz Entity to QuizSummaryDTO (for list views)
        CreateMap<Quiz, QuizSummaryDTO>()
            .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category.Name))
            .ForMember(dest => dest.Difficulty, opt => opt.MapFrom(src => src.Difficulty.Level))
            .ForMember(dest => dest.Language, opt => opt.MapFrom(src => src.Language.Language)) // Fixed property name
            .ForMember(dest => dest.QuestionCount, opt => opt.MapFrom(src => src.QuizQuestions.Count))
            .ForMember(dest => dest.User, opt => opt.MapFrom(src => src.User.Username))
        .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => src.Visibility.ToString()));

        // Quiz Entity to QuizDTO (for detail view)
        CreateMap<Quiz, QuizDTO>()
            .ForMember(dest => dest.User, opt => opt.MapFrom(src => src.User))
            .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category))
            .ForMember(dest => dest.Language, opt => opt.MapFrom(src => src.Language))
            .ForMember(dest => dest.Difficulty, opt => opt.MapFrom(src => src.Difficulty))
            .ForMember(dest => dest.Questions, opt => opt.MapFrom(src => src.QuizQuestions))
            .ForMember(dest => dest.ShowFeedbackImmediately, opt => opt.MapFrom(src => src.ShowFeedbackImmediately)) // Added this
            .ForMember(dest => dest.QuestionCount, opt => opt.MapFrom(src => src.QuizQuestions.Count))
            .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => src.Visibility.ToString()));

        // QuizCM (Create Model) to Quiz Entity
        CreateMap<QuizCM, Quiz>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.UserId, opt => opt.Ignore())
            .ForMember(dest => dest.User, opt => opt.Ignore())
            .ForMember(dest => dest.Category, opt => opt.Ignore())
            .ForMember(dest => dest.Language, opt => opt.Ignore())
            .ForMember(dest => dest.Difficulty, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.UtcNow))
            .ForMember(dest => dest.Version, opt => opt.MapFrom(src => 1))
            .ForMember(dest => dest.ShowFeedbackImmediately, opt => opt.MapFrom(src => src.ShowFeedbackImmediately))
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true))
            .ForMember(dest => dest.QuizQuestions, opt => opt.MapFrom(src => src.Questions))
             .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => Enum.Parse<QuizVisibility>(src.Visibility, true)));

        // QuizUM (Update Model) to Quiz Entity
        CreateMap<QuizUM, Quiz>()
            .ForMember(dest => dest.UserId, opt => opt.Ignore())
            .ForMember(dest => dest.User, opt => opt.Ignore())
            .ForMember(dest => dest.Category, opt => opt.Ignore())
            .ForMember(dest => dest.Language, opt => opt.Ignore())
            .ForMember(dest => dest.Difficulty, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.ShowFeedbackImmediately, opt => opt.MapFrom(src => src.ShowFeedbackImmediately))
            .ForMember(dest => dest.QuizQuestions, opt => opt.MapFrom(src => src.Questions))
            .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => Enum.Parse<QuizVisibility>(src.Visibility, true)));

        // Common entity-to-DTO mappings
        CreateMap<User, UserBasicDTO>();
        CreateMap<QuestionCategory, CategoryDTO>();
        CreateMap<QuestionLanguage, LanguageDTO>();
        CreateMap<QuestionDifficulty, DifficultyDTO>();
        CreateMap<QuestionBase, QuestionBaseDTO>();
    }
}