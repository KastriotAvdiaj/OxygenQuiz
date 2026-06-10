using QuizAPI.Filtering;
using QuizAPI.Models;
using static QuizAPI.Filtering.FilterOperator;

namespace QuizAPI.Controllers.Audit
{
    /// <summary>
    /// Whitelist of fields clients may filter / search / sort the audit trail by. The default
    /// sort keeps the "newest first" ordering the page relies on. See docs/filtering.md.
    /// </summary>
    public static class AuditLogFilterFields
    {
        public static readonly FilterFieldSet<AuditLog> Fields = new FilterFieldSet<AuditLog>()
            .Field("action",    a => a.Action,    new[] { Eq, In, Contains }, searchable: true)
            .Field("entity",    a => a.Entity,    new[] { Eq, In })
            .Field("userId",    a => a.UserId,    new[] { Eq, In })
            .Field("ipAddress", a => a.IpAddress, new[] { Eq, Contains })
            .Field("createdAt", a => a.CreatedAt, new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true, defaultSort: true);
    }
}
