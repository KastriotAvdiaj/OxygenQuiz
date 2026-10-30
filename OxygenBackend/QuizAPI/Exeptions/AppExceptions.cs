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

    /// <summary>A per-account allowance is used up — a media quota, the cap on unsaved uploads.
    /// Maps to HTTP 429, like the rate limiter, because the client's move is the same: wait or
    /// free something up. The message says which.</summary>
    public sealed class QuotaExceededException(string message) : AppException(message)
    {
    }

    /// <summary>
    /// Something outside this site that the request depends on is switched off, down or refusing us
    /// (an image source, say). 503 — the caller can try again later or another way.
    /// </summary>
    public sealed class ServiceUnavailableException(string message) : AppException(message)
    {
    }
}
