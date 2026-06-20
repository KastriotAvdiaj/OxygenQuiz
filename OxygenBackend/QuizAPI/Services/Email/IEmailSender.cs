namespace QuizAPI.Services.Email
{
    /// <summary>
    /// Sends transactional email. The implementation is swappable in DI — a dev logger today,
    /// a real provider (Resend / Postmark / SMTP) in production. See docs/email-verification.md.
    /// </summary>
    public interface IEmailSender
    {
        Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
    }
}
