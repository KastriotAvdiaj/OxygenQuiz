namespace QuizAPI.Services.Audit
{
    public interface IAuditService
    {
        /// <summary>
        /// Records a critical action. <paramref name="action"/> is a business verb
        /// (e.g. "UserLoggedIn", "QuizDeleted"). User id and IP are pulled from the
        /// current request context; old/new values are serialized to JSON.
        ///
        /// This method never throws — an audit failure must not break the operation
        /// being audited. It persists immediately, so call it AFTER the primary
        /// operation has been committed.
        /// </summary>
        Task LogAsync(
            string action,
            string? entity = null,
            string? entityId = null,
            object? oldValue = null,
            object? newValue = null,
            Guid? userId = null,
            CancellationToken ct = default);
    }
}
