using AutoMapper;
using Newtonsoft.Json;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.Mapping
{
    public class SecondaryEntitiesMappingProfile : Profile
    {
        public SecondaryEntitiesMappingProfile() {

            CreateMap<User, UserBasicDTO>();
            CreateMap<QuestionCategory, QuestionCategoryDTO>()
                .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.User.Username));
            CreateMap<QuestionLanguage, QuestionLanguageDTO>()
                .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.User.Username));
            CreateMap<QuestionDifficulty, QuestionDifficultyDTO>()
                .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.User.Username));
            CreateMap<QuestionBase, QuestionBaseDTO>();


           CreateMap<QuestionCategoryCM, QuestionCategory>()
    .ForMember(dest => dest.Id, opt => opt.Ignore())
    .ForMember(dest => dest.UserId, opt => opt.Ignore())
    .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
    .ForMember(dest => dest.ColorPaletteJson, 
               opt => opt.MapFrom(src => src.ColorPalette != null && src.ColorPalette.Any() 
                   ? JsonConvert.SerializeObject(src.ColorPalette) 
                   : null))
    .ForMember(dest => dest.Gradient, opt => opt.MapFrom(src => src.Gradient))
    .ForMember(dest => dest.Questions, opt => opt.Ignore());
        }
    }
}
