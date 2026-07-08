namespace QuizAPI.Exceptions
{
    public abstract class AppException(string message) : Exception(message)
    {
    }

    public class NotFoundException(string message) : AppException(message)
    {
    }

    public class ConflictException(string message) : AppException(message)
    {
    }

    public sealed class UnauthorizedException(string message) : AppException(message)
    {
    }

    public sealed class AppValidationException(string message) : AppException(message)
    {
    }

    /// <summary>The caller is authenticated but not allowed to perform this specific action
    /// (e.g. an Admin trying to grant the SuperAdmin role). Maps to HTTP 403.</summary>
    public sealed class ForbiddenException(string message) : AppException(message)
    {
    }
}