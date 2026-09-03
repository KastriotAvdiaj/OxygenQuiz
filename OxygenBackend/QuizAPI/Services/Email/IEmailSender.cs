namespace QuizAPI.Services.Email
{
    /// <summary>
    /// Sends transactional email. The implementation is swappable in DI — a dev logger today,
    /// a real provider (Resend / Postmark / SMTP) in production. See docs/auth/email-verification.md.
    /// </summary>
    public interface IEmailSender
    {
        /// <param name="textBody">
        /// Plain-text alternative, sent alongside the HTML. Not optional in practice: a message
        /// with no text part reads as bulk mail to spam filters, and it is the only version some
        /// clients will show. Pass null only if there is genuinely no sensible text form.
        /// </param>
        Task SendAsync(
            string toEmail, string subject, string htmlBody, string? textBody = null,
            CancellationToken ct = default);
    }
}
