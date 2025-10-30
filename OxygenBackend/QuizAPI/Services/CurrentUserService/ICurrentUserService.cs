namespace QuizAPI.Services.CurrentUserService
{
    public interface ICurrentUserService
    {
        /// <summary>
        /// Gets the unique ID of the current user. Returns null if the user is not authenticated.
        /// </summary>
        Guid? UserId { get; }

        /// <summary>
        /// Gets a value indicating whether the current user is authenticated.
        /// </summary>
        bool IsAuthenticated { get; }

        /// <summary>
        /// Gets a value indicating whether the current user has an Admin or SuperAdmin role.
        /// </summary>
        bool IsAdmin { get; }
    }
}
