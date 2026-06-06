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
}