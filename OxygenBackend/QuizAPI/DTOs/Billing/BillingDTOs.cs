namespace QuizAPI.DTOs.Billing
{
    /// <summary>Which price to open a checkout transaction for.</summary>
    public class CheckoutRequestDTO
    {
        /// <summary>"Plus" or "Teacher".</summary>
        public string Plan { get; set; } = "";
        /// <summary>"Month" or "Year".</summary>
        public string Interval { get; set; } = "";
    }

    /// <summary>The id to pass to <c>Paddle.Checkout.open({ transactionId })</c>.</summary>
    public class CheckoutResponseDTO
    {
        public string TransactionId { get; set; } = "";
    }

    /// <summary>A Paddle-hosted session the browser follows to manage the subscription.</summary>
    public class PortalResponseDTO
    {
        public string Url { get; set; } = "";
    }
}
