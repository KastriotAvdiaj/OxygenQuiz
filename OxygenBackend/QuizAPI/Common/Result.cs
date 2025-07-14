// File: Common/Result.cs

namespace QuizAPI.Common;

/// <summary>
/// Defines the common contract for the result of an operation.
/// </summary>
public interface IResult
{
    bool IsSuccess { get; }
    string? ErrorMessage { get; }
    List<string> ValidationErrors { get; }
}

/// <summary>
/// A generic result of an operation that can hold a data payload.
/// </summary>
public class Result<T> : IResult // <-- Implement the interface
{
    public bool IsSuccess { get; private set; }
    public T? Data { get; private set; }
    public string? ErrorMessage { get; private set; }
    public List<string> ValidationErrors { get; private set; } = new();

    // No changes needed in the constructor or factory methods
    private Result(bool isSuccess, T? data = default, string? errorMessage = null, List<string>? validationErrors = null)
    {
        IsSuccess = isSuccess;
        Data = data;
        ErrorMessage = errorMessage;
        ValidationErrors = validationErrors ?? new List<string>();
    }

    public static Result<T> Success(T data) => new(true, data);
    public static Result<T> Failure(string errorMessage) => new(false, errorMessage: errorMessage);
    public static Result<T> ValidationFailure(List<string> errors) => new(false, validationErrors: errors);
    public static Result<T> ValidationFailure(string error) => new(false, validationErrors: new List<string> { error });
}

/// <summary>
/// A non-generic result of an operation.
/// </summary>
public class Result : IResult // <-- Implement the interface
{
    public bool IsSuccess { get; private set; }
    public string? ErrorMessage { get; private set; }
    public List<string> ValidationErrors { get; private set; } = new();

    // No changes needed in the constructor or factory methods
    private Result(bool isSuccess, string? errorMessage = null, List<string>? validationErrors = null)
    {
        IsSuccess = isSuccess;
        ErrorMessage = errorMessage;
        ValidationErrors = validationErrors ?? new List<string>();
    }

    public static Result Success() => new(true);
    public static Result Failure(string errorMessage) => new(false, errorMessage);
    public static Result ValidationFailure(List<string> errors) => new(false, validationErrors: errors);
    public static Result ValidationFailure(string error) => new(false, validationErrors: new List<string> { error });
}