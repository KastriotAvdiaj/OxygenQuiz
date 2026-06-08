using Microsoft.EntityFrameworkCore;
using QuizAPI.Data;
using QuizAPI.Models;
using QuizAPI.Repositories.Interfaces;

namespace QuizAPI.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly ApplicationDbContext _context;

        public NotificationRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(Notification notification, CancellationToken ct = default) =>
            await _context.Notifications.AddAsync(notification, ct);

        public Task<Notification?> GetByIdAsync(Guid id, bool tracked = false, CancellationToken ct = default)
        {
            var q = _context.Notifications.AsQueryable();
            if (!tracked) q = q.AsNoTracking();
            return q.FirstOrDefaultAsync(n => n.Id == id, ct);
        }

        public async Task<IReadOnlyList<Notification>> GetForUserAsync(Guid userId, bool unreadOnly, CancellationToken ct = default)
        {
            var q = _context.Notifications.AsNoTracking().Where(n => n.UserId == userId);
            if (unreadOnly) q = q.Where(n => !n.IsRead);
            return await q.OrderByDescending(n => n.CreatedAt).ToListAsync(ct);
        }

        public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default) =>
            _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

        public async Task<int> MarkAllReadAsync(Guid userId, CancellationToken ct = default)
        {
            var unread = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync(ct);

            foreach (var n in unread)
                n.IsRead = true;

            return unread.Count;
        }

        public void Remove(Notification notification) => _context.Notifications.Remove(notification);

        public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
            _context.SaveChangesAsync(ct);
    }
}
