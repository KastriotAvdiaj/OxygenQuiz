using Microsoft.AspNetCore.SignalR;
using QuizAPI.DTOs.Notification;
using QuizAPI.Exceptions;
using QuizAPI.Hubs;
using QuizAPI.Hubs.Clients;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Controllers.Notifications.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _repository;
        private readonly IHubContext<NotificationHub, INotificationClient> _hub;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            INotificationRepository repository,
            IHubContext<NotificationHub, INotificationClient> hub,
            ILogger<NotificationService> logger)
        {
            _repository = repository;
            _hub = hub;
            _logger = logger;
        }

        public Task<NotificationDTO> CreateAsync(Guid userId, string type, string title, string message, CancellationToken ct = default) =>
            CreateWithLinkAsync(userId, type, title, message, link: null, ct);

        /// <summary>An in-app path: one leading slash, no scheme, no backslash, short enough to store.</summary>
        internal static string? SafeLink(string? link)
        {
            link = link?.Trim();
            return string.IsNullOrEmpty(link) || link.Length > 300
                   || !link.StartsWith('/') || link.StartsWith("//", StringComparison.Ordinal)
                   || link.Contains('\\') || link.Contains("://", StringComparison.Ordinal)
                ? null
                : link;
        }

        public async Task<NotificationDTO> CreateWithLinkAsync(
            Guid userId, string type, string title, string message, string? link, CancellationToken ct = default)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = string.IsNullOrWhiteSpace(type) ? "info" : type,
                Title = title,
                Message = message,
                Link = SafeLink(link),
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
            };

            await _repository.AddAsync(notification, ct);
            await _repository.SaveChangesAsync(ct);

            var dto = ToDto(notification);

            // Push to the user's live connections (if any). Best-effort: a hub failure
            // must not fail the create — the notification is already persisted and will
            // show up via REST / the unread-count poll regardless.
            try
            {
                await _hub.Clients.User(userId.ToString()).ReceiveNotification(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to push notification {Id} to user {UserId}", notification.Id, userId);
            }

            return dto;
        }

        public async Task<IReadOnlyList<NotificationDTO>> GetForUserAsync(Guid userId, bool unreadOnly = false, CancellationToken ct = default)
        {
            var items = await _repository.GetForUserAsync(userId, unreadOnly, ct);
            return items.Select(ToDto).ToList();
        }

        public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default) =>
            _repository.GetUnreadCountAsync(userId, ct);

        public async Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct = default)
        {
            var notification = await _repository.GetByIdAsync(id, tracked: true, ct);
            if (notification is null || notification.UserId != userId)
                throw new NotFoundException("Notification not found.");

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                await _repository.SaveChangesAsync(ct);
            }
        }

        public async Task<int> MarkAllReadAsync(Guid userId, CancellationToken ct = default)
        {
            var count = await _repository.MarkAllReadAsync(userId, ct);
            if (count > 0) await _repository.SaveChangesAsync(ct);
            return count;
        }

        public async Task DeleteAsync(Guid id, Guid userId, CancellationToken ct = default)
        {
            var notification = await _repository.GetByIdAsync(id, tracked: true, ct);
            if (notification is null || notification.UserId != userId)
                throw new NotFoundException("Notification not found.");

            _repository.Remove(notification);
            await _repository.SaveChangesAsync(ct);
        }

        private static NotificationDTO ToDto(Notification n) => new()
        {
            Id = n.Id,
            UserId = n.UserId,
            Type = n.Type,
            Title = n.Title,
            Message = n.Message,
            Link = n.Link,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
        };
    }
}
