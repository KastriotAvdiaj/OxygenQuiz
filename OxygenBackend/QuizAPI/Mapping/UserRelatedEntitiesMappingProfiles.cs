using AutoMapper;
using QuizAPI.DTOs.User;
using QuizAPI.Models;

namespace QuizAPI.Mapping
{
    public class UserRelatedEntitiesMappingProfiles: Profile
    {
        public UserRelatedEntitiesMappingProfiles()
        {
            CreateMap<User, UserDTO>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role.Name));

           
            CreateMap<User, UserBasicDTO>();

            CreateMap<User, FullUserDTO>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role.Name))
                .ForMember(dest => dest.TotalUsers, opt => opt.Ignore());

        }
    }
}
