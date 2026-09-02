using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Email
{
    /// <summary>
    /// Sends through Brevo's transactional API (<c>POST /v3/smtp/email</c>).
    ///
    /// <para><b>API rather than SMTP relay</b>, which Brevo also offers. Three reasons: Hetzner
    /// blocks outbound SMTP ports on new accounts until you ask them not to, and a blocked port 587
    /// looks exactly like a misconfiguration; <c>System.Net.Mail.SmtpClient</c> is documented as
    /// obsolete for new work, so SMTP would mean taking a MailKit dependency; and an HTTP status
    /// with a JSON body says what went wrong, where an SMTP code makes you guess. This also reuses
    /// the <c>AddHttpClient</c> pattern already in Program.cs.</para>
    /// </summary>
    public sealed class BrevoEmailSender : IEmailSender
    {
        private readonly HttpClient _http;
        private readonly EmailOptions _options;
        private readonly ILogger<BrevoEmailSender> _logger;

        public BrevoEmailSender(
            HttpClient http, IOptions<EmailOptions> options, ILogger<BrevoEmailSender> logger)
        {
            _http = http;
            _options = options.Value;
            _logger = logger;
        }

        /// <summary>
        /// <b>Never throws on a delivery failure, and that is load-bearing rather than sloppy.</b>
        ///
        /// <para>Two callers make it so. <c>SignupAsync</c> sends the verification mail after the
        /// user row is committed — a throw there would 500 a signup that actually succeeded, and the
        /// account would exist with no way to tell the user so. And
        /// <c>RequestPasswordResetAsync</c> must answer 200 whether or not the address is known: a
        /// throw would make it 500 for a *known* address whose send failed and 200 for an unknown
        /// one, which quietly rebuilds the account-enumeration oracle the endpoint was carefully
        /// designed to avoid (docs/auth/password-reset.md §3).</para>
        ///
        /// <para>So a failure is logged at Error with the provider's own response and swallowed.
        /// The token has already been stored, so the user can simply ask again once the cause is
        /// fixed. <c>LoggingEmailSender</c> never throws either, which is why nothing downstream was
        /// ever written to expect it to.</para>
        /// </summary>
        public async Task SendAsync(
            string toEmail, string subject, string htmlBody, CancellationToken ct = default)
        {
            var payload = new
            {
                sender = new { email = _options.FromAddress, name = _options.FromName },
                to = new[] { new { email = toEmail } },
                subject,
                htmlContent = htmlBody,
            };

            try
            {
                using var content = new StringContent(
                    JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                using var response = await _http.PostAsync("v3/smtp/email", content, ct);

                if (response.IsSuccessStatusCode) return;

                // Brevo puts a machine-readable {code, message} in the body, and it is the
                // difference between "the key is wrong", "this IP is not authorized" and "the
                // sender domain is not verified" — three problems that otherwise look identical
                // from outside. Log it verbatim rather than a tidy summary.
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError(
                    "[Email] Brevo rejected a message to {Recipient}: {Status} {Body}. " +
                    "401/403 usually means the API key or the authorized-IP list; 400 with " +
                    "'sender' in it usually means the From domain is not verified yet.",
                    toEmail, (int)response.StatusCode, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[Email] Sending to {Recipient} failed. The message is lost; the user can " +
                    "request another.", toEmail);
            }
        }
    }
}
