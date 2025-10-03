using ChatApp.Models;
using System.ComponentModel.DataAnnotations;

namespace ChatApp.DTOs
{
    // This DTO combines data from both SQL User and MongoDB
    public class ChatUserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public bool IsOnline { get; set; }
        public DateTime? LastSeenAt { get; set; }

        // From SQL User entity
        public string Email { get; set; } = string.Empty;
        public DateTime SqlCreatedAt { get; set; }
    }

    public class ChatRoomDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPrivate { get; set; }
        public ChatUserDto CreatedBy { get; set; } = new();
        public List<ChatRoomMemberDto> Members { get; set; } = new();
        public DateTime? LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
        public int TotalMembers { get; set; }
    }

    public class ChatRoomMemberDto
    {
        public ChatUserDto User { get; set; } = new();
        public ChatRoomRole Role { get; set; }
        public DateTime JoinedAt { get; set; }
        public DateTime? LastReadAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class ChatMessageDto
    {
        public string Id { get; set; } = string.Empty;
        public string ChatRoomId { get; set; } = string.Empty;
        public ChatUserDto Sender { get; set; } = new();
        public string Content { get; set; } = string.Empty;
        public MessageType MessageType { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsEdited { get; set; }
        public DateTime? EditedAt { get; set; }
        public string? ReplyToMessageId { get; set; }
        public List<MessageAttachment> Attachments { get; set; } = new();
        public bool IsDeleted { get; set; }
    }

    // Request DTOs
    public class CreateChatRoomRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }
        public bool IsPrivate { get; set; } = false;
        public List<int> InitialMemberUserIds { get; set; } = new(); // SQL User IDs
    }

    public class SendMessageRequest
    {
        [Required]
        public string ChatRoomId { get; set; } = string.Empty;

        [Required]
        [StringLength(2000, MinimumLength = 1)]
        public string Content { get; set; } = string.Empty;

        public MessageType MessageType { get; set; } = MessageType.Text;
        public string? ReplyToMessageId { get; set; }
    }

    public class JoinRoomRequest
    {
        [Required]
        public string ChatRoomId { get; set; } = string.Empty;
    }

    public class UpdateUserCacheRequest
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
    }
}