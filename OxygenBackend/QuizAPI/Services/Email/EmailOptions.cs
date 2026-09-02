namespace QuizAPI.Services.Email
{
    /// <summary>
    /// Bound from the <c>Email</c> configuration section.
    /// </summary>
    public sealed class EmailOptions
    {
        public const string SectionName = "Email";

        /// <summary>
        /// The From address. Must be on a domain verified in Brevo, or mail is rejected outright —
        /// verification is a DNS step (SPF/DKIM), not something the code can arrange.
        /// </summary>
        public string FromAddress { get; set; } = string.Empty;

        public string FromName { get; set; } = "Oxygen Quiz";

        public BrevoOptions Brevo { get; set; } = new();

        public sealed class BrevoOptions
        {
            /// <summary>
            /// Blank means "no provider configured", and the app falls back to
            /// <see cref="LoggingEmailSender"/>. Supply it as <c>Email__Brevo__ApiKey</c>; never in
            /// appsettings.
            /// </summary>
            public string ApiKey { get; set; } = string.Empty;

            public int TimeoutSeconds { get; set; } = 10;
        }
    }
}
