namespace QuizAPI.Services.Email
{
    /// <summary>
    /// Development email sender: doesn't actually send anything — it logs the message (including the
    /// confirmation link) so the flow is fully testable locally without an email provider. Swap for a
    /// real provider (Resend / Postmark / SMTP) in production; see docs/auth/email-verification.md.
    /// </summary>
    public class LoggingEmailSender : IEmailSender
    {
        private readonly ILogger<LoggingEmailSender> _logger;

        public LoggingEmailSender(ILogger<LoggingEmailSender> logger) => _logger = logger;

        public Task SendAsync(
            string toEmail, string subject, string htmlBody, string? textBody = null,
            CancellationToken ct = default)
        {
            // The TEXT part when there is one. This log is read by a developer hunting for a
            // confirmation link, and 4KB of table markup buries the URL it exists to show.
            _logger.LogInformation(
                "[DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}",
                toEmail, subject, string.IsNullOrWhiteSpace(textBody) ? htmlBody : textBody);
            return Task.CompletedTask;
        }
    }
}
