namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// The Paddle webhook endpoint secret. Not bound from configuration directly — it's a secret,
    /// read off <c>IConfiguration</c> in <c>Program.cs</c> and set here, the same reasoning as
    /// <see cref="BillingOptions"/> never carrying <c>ApiKey</c>/<c>WebhookSecret</c>.
    /// </summary>
    public sealed class PaddleWebhookOptions
    {
        public string Secret { get; set; } = "";
    }
}
