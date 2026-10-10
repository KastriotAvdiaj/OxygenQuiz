using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using QuizAPI.DTOs.Billing;
using QuizAPI.Exceptions;
using QuizAPI.Models.Billing;
using QuizAPI.Repositories.Interfaces;
using QuizAPI.Services.Billing;
using QuizAPI.Services.CurrentUserService;

namespace QuizAPI.Controllers.Billing
{
    /// <summary>
    /// Checkout and the customer portal (docs/proposals/paid-plans-and-payments.md §5.4, §5.5).
    /// The transaction is opened server-side with the caller's own id from the JWT — never a value
    /// the browser could supply — so a purchase can't be attached to someone else's account.
    /// </summary>
    [ApiController]
    [Route("api/billing")]
    [Authorize]
    public class BillingController : ControllerBase
    {
        private readonly IBillingProvider _provider;
        private readonly ISubscriptionSyncService _sync;
        private readonly ISubscriptionRepository _subscriptions;
        private readonly IUserRepository _users;
        private readonly ICurrentUserService _current;
        private readonly BillingOptions _options;

        public BillingController(
            IBillingProvider provider, ISubscriptionSyncService sync, ISubscriptionRepository subscriptions,
            IUserRepository users, ICurrentUserService current, IOptions<BillingOptions> options)
        {
            _provider = provider;
            _sync = sync;
            _subscriptions = subscriptions;
            _users = users;
            _current = current;
            _options = options.Value;
        }

        /// <summary>Opens a Paddle transaction for one price and returns its id for Paddle.js to open.</summary>
        [HttpPost("checkout")]
        public async Task<ActionResult<CheckoutResponseDTO>> Checkout([FromBody] CheckoutRequestDTO dto, CancellationToken ct)
        {
            if (_current.UserId is not Guid userId) return Unauthorized();
            if (!_options.Enabled)
                throw new BillingUnavailableException("Billing is not configured on this server.");

            var plan = ParsePlan(dto.Plan);
            var interval = ParseInterval(dto.Interval);
            var priceId = BillingPriceCatalog.GetPriceId(_options.Prices, plan, interval);

            var user = await _users.GetByIdAsync(userId, ct: ct)
                ?? throw new NotFoundException("No such user.");

            var transactionId = await _provider.CreateCheckoutTransactionAsync(userId, user.Email, priceId, ct);

            // The Fake provider has no webhook of its own — run the same upsert the real one would
            // trigger later, synchronously, before returning (docs/proposals/paid-plans-and-payments.md
            // §5.8: dev/CI/E2E must exercise the real entitlement logic with no Paddle account).
            if (_options.Provider == "Fake")
                await _sync.SyncAsync(transactionId, ct);

            return Ok(new CheckoutResponseDTO { TransactionId = transactionId });
        }

        /// <summary>A Paddle-hosted session URL where the caller can manage their subscription.</summary>
        [HttpPost("portal")]
        public async Task<ActionResult<PortalResponseDTO>> Portal(CancellationToken ct)
        {
            if (_current.UserId is not Guid userId) return Unauthorized();
            if (!_options.Enabled)
                throw new BillingUnavailableException("Billing is not configured on this server.");

            var customerId = await _subscriptions.GetCustomerIdAsync(userId, ct)
                ?? throw new NotFoundException("No billing account yet.");

            var url = await _provider.CreatePortalSessionAsync(customerId, ct);
            return Ok(new PortalResponseDTO { Url = url });
        }

        private static PlanTier ParsePlan(string? value) =>
            Enum.TryParse<PlanTier>(value, ignoreCase: true, out var tier) && tier != PlanTier.Free
                ? tier
                : throw new AppValidationException("Plan must be Plus or Teacher.");

        private static BillingInterval ParseInterval(string? value) =>
            Enum.TryParse<BillingInterval>(value, ignoreCase: true, out var interval) && interval != BillingInterval.None
                ? interval
                : throw new AppValidationException("Interval must be Month or Year.");
    }
}
