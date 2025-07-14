using AutoMapper;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Models.Quiz;

namespace QuizAPI.Mapping
{
    public class QuizSessionMappingProfile : Profile
    {
        public QuizSessionMappingProfile()
        {

            CreateMap<QuizSession, QuizSessionDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title))
                .ForMember(dest => dest.IsCompleted, opt => opt.MapFrom(src => src.EndTime.HasValue));

            CreateMap<QuizSession, QuizSessionSummaryDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title))
                .ForMember(dest => dest.TotalQuestions, opt => opt.MapFrom(src => src.UserAnswers.Count))
                .ForMember(dest => dest.CorrectAnswers, opt => opt.MapFrom(src => src.UserAnswers.Count(ua => ua.IsCorrect)))
                .ForMember(dest => dest.IsCompleted, opt => opt.MapFrom(src => src.EndTime.HasValue))
                .ForMember(dest => dest.Duration, opt => opt.MapFrom(src =>
                    src.EndTime.HasValue ? (TimeSpan?)(src.EndTime.Value - src.StartTime) : null));

            CreateMap<QuizSessionCM, QuizSession>();


            // --- UserAnswer Mappings ---

            CreateMap<UserAnswer, UserAnswerDto>()
                .ForMember(dest => dest.QuestionText, opt => opt.MapFrom(src => src.QuizQuestion.Question.Text))
                .ForMember(dest => dest.SelectedOptionText, opt => opt.MapFrom(src => src.AnswerOption.Text));

            CreateMap<UserAnswerCM, UserAnswer>();
        }

    }
}
