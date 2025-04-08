using AutoMapper;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.Mapping
{
    public class QuestionMappingProfile : Profile
    {

        public QuestionMappingProfile()
        {
            // Map DTOs to models
            CreateMap<QuestionBaseDTO, QuestionBase>()
                .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => Enum.Parse<QuestionVisibility>(src.Visibility)));

            CreateMap<MultipleChoiceQuestionDTO, MultipleChoiceQuestion>();
            CreateMap<TrueFalseQuestionDTO, TrueFalseQuestion>();
            CreateMap<TypeAnswerQuestionDTO, TypeAnswerQuestion>();
            CreateMap<AnswerOptionDTO, AnswerOption>();

            // Map models to DTOs
            CreateMap<QuestionBase, QuestionBaseDTO>()
                .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => src.Visibility.ToString()))
                .ForMember(dest => dest.QuestionType, opt => opt.MapFrom(src => src.Type.ToString()));

            CreateMap<MultipleChoiceQuestion, MultipleChoiceQuestionDTO>()
                .IncludeBase<QuestionBase, QuestionBaseDTO>();
            CreateMap<TrueFalseQuestion, TrueFalseQuestionDTO>()
                .IncludeBase<QuestionBase, QuestionBaseDTO>();
            CreateMap<TypeAnswerQuestion, TypeAnswerQuestionDTO>()
                .IncludeBase<QuestionBase, QuestionBaseDTO>();

            CreateMap<AnswerOption, AnswerOptionDTO>();
            CreateMap<QuestionDifficulty, DifficultyDTO>();
            CreateMap<QuestionCategory, CategoryDTO>();
            CreateMap<QuestionLanguage, LanguageDTO>();
            CreateMap<User, UserBasicDTO>();

            // Map creation models
            CreateMap<QuestionBaseCM, QuestionBase>()
                .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => Enum.Parse<QuestionVisibility>(src.Visibility)));

            CreateMap<MultipleChoiceQuestionCM, MultipleChoiceQuestion>()
                .IncludeBase<QuestionBaseCM, QuestionBase>();
            CreateMap<TrueFalseQuestionCM, TrueFalseQuestion>()
                .IncludeBase<QuestionBaseCM, QuestionBase>();
            CreateMap<TypeAnswerQuestionCM, TypeAnswerQuestion>()
                .IncludeBase<QuestionBaseCM, QuestionBase>();
            CreateMap<AnswerOptionCM, AnswerOption>();

            // Map update models
            CreateMap<QuestionBaseUM, QuestionBase>()
                .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => Enum.Parse<QuestionVisibility>(src.Visibility)));

            CreateMap<MultipleChoiceQuestionUM, MultipleChoiceQuestion>()
                .IncludeBase<QuestionBaseUM, QuestionBase>();
            CreateMap<TrueFalseQuestionUM, TrueFalseQuestion>()
                .IncludeBase<QuestionBaseUM, QuestionBase>();
            CreateMap<TypeAnswerQuestionUM, TypeAnswerQuestion>()
                .IncludeBase<QuestionBaseUM, QuestionBase>();
            CreateMap<AnswerOptionUM, AnswerOption>();

            // Map for IndividualQuestionDTO
            CreateMap<QuestionBase, IndividualQuestionDTO>()
                .ForMember(dest => dest.Difficulty, opt => opt.MapFrom(src => src.Difficulty.Level))
                .ForMember(dest => dest.Category, opt => opt.MapFrom(src => src.Category.Name))
                .ForMember(dest => dest.Language, opt => opt.MapFrom(src => src.Language.Language))
                .ForMember(dest => dest.Visibility, opt => opt.MapFrom(src => src.Visibility.ToString()));

            CreateMap<MultipleChoiceQuestion, IndividualQuestionDTO>()
                .IncludeBase<QuestionBase, IndividualQuestionDTO>();
        }


    }
}
