//using ChatApp.Models;
//using QuizAPI.DTOs.User;
//using QuizAPI.Models;

//public static ChatUserProjection ToChatProjection(this User user) =>
//    new()
//    {
//        Id = user.Id,
//        Username = user.Username,
//        ProfileImageUrl = user.ProfileImageUrl
//    };

//public static ChatUserInfo ToChatUserInfo(this ChatUserProjection p) =>
//    new()
//    {
//        UserId = p.Id,
//        Username = p.Username,
//        AvatarUrl = p.ProfileImageUrl,
//        LastUpdated = DateTime.UtcNow
//    };