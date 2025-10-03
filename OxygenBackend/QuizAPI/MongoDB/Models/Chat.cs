using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace ChatApp.Models
{
    // Base entity for MongoDB documents
    public abstract class BaseMongoEntity
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // Cached user info for chat performance (denormalized from SQL)
    public class ChatUserInfo
    {
        [BsonElement("userId")]
        public Guid UserId { get; set; } // Reference to your SQL User.Id

        [BsonElement("username")]
        public string Username { get; set; } = string.Empty;

        [BsonElement("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [BsonElement("avatarUrl")]
        public string? AvatarUrl { get; set; }

        [BsonElement("lastUpdated")]
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

    // Chat room entity
    public class ChatRoom : BaseMongoEntity
    {
        [BsonElement("name")]
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [BsonElement("description")]
        public string? Description { get; set; }

        [BsonElement("isPrivate")]
        public bool IsPrivate { get; set; } = false;

        [BsonElement("createdByUserId")]
        public int CreatedByUserId { get; set; } // SQL User ID

        [BsonElement("members")]
        public List<ChatRoomMember> Members { get; set; } = new();

        [BsonElement("lastMessageAt")]
        public DateTime? LastMessageAt { get; set; }

        [BsonElement("messageCount")]
        public int MessageCount { get; set; } = 0;

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;
    }

    // Chat room member with role
    public class ChatRoomMember
    {
        [BsonElement("userId")]
        public Guid UserId { get; set; } // SQL User ID

        [BsonElement("role")]
        public ChatRoomRole Role { get; set; } = ChatRoomRole.Member;

        [BsonElement("joinedAt")]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("lastReadAt")]
        public DateTime? LastReadAt { get; set; }

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true; // For soft delete when user leaves

        // Cached user info for performance
        [BsonElement("userInfo")]
        public ChatUserInfo UserInfo { get; set; } = new();
    }

    // Message entity
    public class ChatMessage : BaseMongoEntity
    {
        [BsonElement("chatRoomId")]
        [Required]
        public string ChatRoomId { get; set; } = string.Empty;

        [BsonElement("senderId")]
        [Required]
        public int SenderId { get; set; } // SQL User ID

        [BsonElement("content")]
        [Required]
        [StringLength(2000, MinimumLength = 1)]
        public string Content { get; set; } = string.Empty;

        [BsonElement("messageType")]
        public MessageType MessageType { get; set; } = MessageType.Text;

        [BsonElement("isEdited")]
        public bool IsEdited { get; set; } = false;

        [BsonElement("editedAt")]
        public DateTime? EditedAt { get; set; }

        [BsonElement("replyToMessageId")]
        public string? ReplyToMessageId { get; set; }

        [BsonElement("attachments")]
        public List<MessageAttachment> Attachments { get; set; } = new();

        [BsonElement("isDeleted")]
        public bool IsDeleted { get; set; } = false;

        // Cached sender info for performance
        [BsonElement("senderInfo")]
        public ChatUserInfo SenderInfo { get; set; } = new();
    }

    // Message attachment
    public class MessageAttachment
    {
        [BsonElement("fileName")]
        public string FileName { get; set; } = string.Empty;

        [BsonElement("fileUrl")]
        public string FileUrl { get; set; } = string.Empty;

        [BsonElement("fileSize")]
        public long FileSize { get; set; }

        [BsonElement("contentType")]
        public string ContentType { get; set; } = string.Empty;

        [BsonElement("thumbnailUrl")]
        public string? ThumbnailUrl { get; set; }
    }

    // Private conversation (for direct messages)
    public class PrivateConversation : BaseMongoEntity
    {
        [BsonElement("participants")]
        public List<int> Participants { get; set; } = new(); // SQL User IDs

        [BsonElement("participantInfos")]
        public List<ChatUserInfo> ParticipantInfos { get; set; } = new();

        [BsonElement("lastMessageAt")]
        public DateTime? LastMessageAt { get; set; }

        [BsonElement("messageCount")]
        public int MessageCount { get; set; } = 0;

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;
    }

    // User connection tracking (for SignalR)
    public class UserConnection : BaseMongoEntity
    {
        [BsonElement("userId")]
        public Guid UserId { get; set; } // SQL User ID

        [BsonElement("connectionId")]
        public string ConnectionId { get; set; } = string.Empty;

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("lastPingAt")]
        public DateTime LastPingAt { get; set; } = DateTime.UtcNow;

        [BsonElement("userAgent")]
        public string? UserAgent { get; set; }

        [BsonElement("ipAddress")]
        public string? IpAddress { get; set; }
    }

    // Enums
    public enum ChatRoomRole
    {
        Member,
        Moderator,
        Admin,
        Owner
    }

    public enum MessageType
    {
        Text,
        Image,
        File,
        System // For join/leave notifications, etc.
    }
}