namespace QuizAPI.DTOs.Audit
{
    public class AuditLogDTO
    {
        public Guid Id { get; set; }
        public Guid? UserId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? Entity { get; set; }
        public string? EntityId { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Optional filters for reading the audit trail.</summary>
    public class AuditLogQuery
    {
        public Guid? UserId { get; set; }
        public string? Entity { get; set; }
        public string? Action { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
}
