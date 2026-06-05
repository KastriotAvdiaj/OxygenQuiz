namespace QuizAPI.Services.Permissions
{
    public interface IPermissionService
    {
        Task<bool> HasPermissionAsync(Guid userId, string permission);
        Task<bool> CanActOnResourceAsync(Guid userId, Guid ownerId, string resource, string action);
}
}
