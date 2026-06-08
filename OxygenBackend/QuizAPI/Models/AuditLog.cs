using System.ComponentModel.DataAnnotations;

namespace QuizAPI.Models
{
    /// <summary>
    /// Append-only audit trail entry: "who did what, to which record, from where, when,
    /// and what changed." Rows are inserted and never updated or deleted. Deliberately has
    /// no FK to User so history survives even if the acting user is removed.
    /// </summary>
    public class AuditLog
    {
        public Guid Id { get; set; }

        /// <summary>The acting user, or null for anonymous/system actions (e.g. a failed login).</summary>
        public Guid? UserId { get; set; }

        /// <summary>Business verb, e.g. "UserLoggedIn", "QuizDeleted", "RoleGranted".</summary>
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        /// <summary>Logical entity type the action targeted, e.g. "Quiz" (null for non-entity actions).</summary>
        [MaxLength(100)]
        public string? Entity { get; set; }

        /// <summary>Id of the targeted entity (string fits Guid- or int-keyed entities).</summary>
        [MaxLength(64)]
        public string? EntityId { get; set; }

        /// <summary>JSON snapshot before the change (null for creates / non-mutating actions).</summary>
        public string? OldValue { get; set; }

        /// <summary>JSON snapshot after the change (null for deletes / non-mutating actions).</summary>
        public string? NewValue { get; set; }

        [MaxLength(64)]
        public string? IpAddress { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
