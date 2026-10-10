namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// The <c>Billing</c> configuration section (docs/proposals/paid-plans-and-payments.md §5.8).
    /// Everything here is safe to log and inspect — <c>ApiKey</c> and <c>WebhookSecret</c> are
    /// secrets and are read straight off <see cref="IConfiguration"/> in <c>Program.cs</c> instead,
    /// the same way <c>Email:Brevo:ApiKey</c> is, so they never end up bound onto this POCO.
    /// </summary>
    public sealed class BillingOptions
    {
        public const string SectionName = "Billing";

        public bool Enabled { get; set; }

        /// <summary>"Paddle" or "Fake". Fake is refused in Production.</summary>
        public string Provider { get; set; } = "Paddle";

        /// <summary>
        /// "sandbox" or "production" — picks Paddle's API base address. No default: which Paddle
        /// account you're pointed at is never something to fall into quietly, so turning Billing on
        /// without choosing one fails startup (<see cref="Validate"/>) instead of silently landing
        /// on whichever value this default used to be.
        /// </summary>
        public string Environment { get; set; } = "";

        /// <summary>Public. Sent to the browser so Paddle.js can initialise.</summary>
        public string ClientToken { get; set; } = "";

        public BillingPriceOptions Prices { get; set; } = new();

        internal static readonly string[] ValidProviders = ["Paddle", "Fake"];
        internal static readonly string[] ValidEnvironments = ["sandbox", "production"];

        /// <summary>Every reason this configuration can't run, checked once at startup.</summary>
        public IReadOnlyList<string> Validate()
        {
            var errors = new List<string>();

            if (!ValidProviders.Contains(Provider))
                errors.Add($"Billing:Provider must be one of: {string.Join(", ", ValidProviders)}.");

            if (Enabled && !ValidEnvironments.Contains(Environment))
                errors.Add($"Billing:Environment must be explicitly set to one of: {string.Join(", ", ValidEnvironments)} when Billing:Enabled is true.");

            if (Enabled && Provider == "Paddle")
            {
                if (string.IsNullOrWhiteSpace(ClientToken))
                    errors.Add("Billing:ClientToken is required when Billing:Enabled is true and Provider is Paddle.");
                if (string.IsNullOrWhiteSpace(Prices.PlusMonthly) || string.IsNullOrWhiteSpace(Prices.PlusYearly) ||
                    string.IsNullOrWhiteSpace(Prices.TeacherMonthly) || string.IsNullOrWhiteSpace(Prices.TeacherYearly))
                    errors.Add("Billing:Prices must have all four of PlusMonthly, PlusYearly, TeacherMonthly, TeacherYearly set.");
            }

            return errors;
        }
    }

    /// <summary>Paddle price ids, per plan × interval (docs/proposals/paid-plans-and-payments.md §5.8).</summary>
    public sealed class BillingPriceOptions
    {
        public string PlusMonthly { get; set; } = "";
        public string PlusYearly { get; set; } = "";
        public string TeacherMonthly { get; set; } = "";
        public string TeacherYearly { get; set; } = "";
    }
}
