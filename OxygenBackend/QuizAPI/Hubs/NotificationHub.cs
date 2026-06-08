using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using QuizAPI.Hubs.Clients;

namespace QuizAPI.Hubs
{
    /// <summary>
    /// Per-user notification channel. No client-callable methods are needed: SignalR maps
    /// each connection to its user via the NameIdentifier claim, so the server pushes with
    /// <c>Clients.User(userId)</c>. Requires authentication (the JWT is supplied via the
    /// access_token query string for the WebSocket handshake — see Program.cs).
    /// </summary>
    [Authorize]
    public class NotificationHub : Hub<INotificationClient>
    {
    }
}
