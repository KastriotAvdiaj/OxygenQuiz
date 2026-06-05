using ChatApp.Models;
using System.ComponentModel.DataAnnotations;

namespace ChatApp.DTOs
{
    // Lean, embeddable user reference. No email, no presence, no SQL timestamps.
    // This is what appears inside messages, memberships, and "created by".
    public class ChatUserRef
    {
        public Guid UserId { get; init; }
        public string Username { get; init; } = string.Empty;
        public string? AvatarUrl { get; init; }
    }

    // Presence is volatile and read-fresh. Returned ONLY by a live roster endpoint,
    // never cached, never embedded in historical messages.
    public class ChatMemberPresenceDto
    {
        public ChatUserRef User { get; init; } = new();
        public bool IsOnline { get; init; }
        public DateTime? LastSeenAt { get; init; }
    }

    public class ChatRoomDto
    {
        public string Id { get; set; } = string.Empty;          // Mongo ObjectId as string
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPrivate { get; set; }
        public ChatUserRef CreatedBy { get; set; } = new();
        public List<ChatRoomMemberDto> Members { get; set; } = new();
        public DateTime? LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
        public int TotalMembers { get; set; }
    }

    // Structural membership facts only. Presence lives on ChatMemberPresenceDto.
    public class ChatRoomMemberDto
    {
        public ChatUserRef User { get; set; } = new();
        public ChatRoomRole Role { get; set; }
        public DateTime JoinedAt { get; set; }
        public DateTime? LastReadAt { get; set; }
        public bool IsActive { get; set; }
    }

    //public class ChatMessageDto
    //{
    //    public string Id { get; set; } = string.Empty;
    //    public string ChatRoomId { get; set; } = string.Empty;
    //    public ChatUserRef Sender { get; set; } = new();
    //    public string Content { get; set; } = string.Empty;
    //    public MessageType MessageType { get; set; }
    //    public DateTime CreatedAt { get; set; }
    //    public bool IsEdited { get; set; }
    //    public DateTime? EditedAt { get; set; }
    //    public string? ReplyToMessageId { get; set; }
    //    public List<AttachmentDto> Attachments { get; set; } = new();
    //    public bool IsDeleted { get; set; }
    //}

    // Request DTOs
    public class CreateChatRoomRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsPrivate { get; set; } = false;
        public List<Guid> InitialMemberUserIds { get; set; } = new();
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
}