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

        public Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
        {
            _logger.LogInformation(
                "[DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}", toEmail, subject, htmlBody);
            return Task.CompletedTask;
        }
    }
}
