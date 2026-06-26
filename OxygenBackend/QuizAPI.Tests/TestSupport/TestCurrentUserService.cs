using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Tests.TestSupport;

/// <summary>
/// Test double for <see cref="ICurrentUserService"/>. The real DbContext uses this inside its
/// global query filters (own/public visibility). Defaulting <see cref="IsAdmin"/> to true makes
/// those filters short-circuit to "see everything", so seeded test data is always visible without
/// having to wire up full Quiz/User ownership graphs.
/// </summary>
public sealed class TestCurrentUserService : ICurrentUserService
{
    public Guid? UserId { get; init; } = Guid.NewGuid();
    public bool IsAuthenticated { get; init; } = true;
    public bool IsAdmin { get; init; } = true;
}
