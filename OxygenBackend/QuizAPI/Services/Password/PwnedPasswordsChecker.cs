using System.Security.Cryptography;
using System.Text;

namespace QuizAPI.Services.Password
{
    /// <summary>
    /// Screens against Have I Been Pwned's Pwned Passwords corpus (~850 million real breached
    /// passwords) using the <b>k-anonymity range API</b>.
    ///
    /// <para><b>The password never leaves this server, and neither does its full hash.</b> We send
    /// the first five hex characters of its SHA-1 and get back every suffix sharing that prefix —
    /// on the order of 800 of them — then look for ours locally. HIBP learns that somebody asked
    /// about one of ~800 possible passwords, which tells it nothing. That property is the whole
    /// reason this is acceptable to call from a signup form; a naive "POST the password to an API
    /// that tells you if it's bad" would not be.</para>
    ///
    /// <para>SHA-1 is not a security choice here and is not a weakness: it is the index format the
    /// corpus is published in, and it is being used to look up a value, not to protect one. Stored
    /// passwords are BCrypt, as they were.</para>
    ///
    /// <para><b>Fails open, on purpose.</b> A timeout, a 500 or no network resolves to "not
    /// breached". The alternative — refusing every signup and password reset because a third party
    /// is down — trades a small, quiet reduction in password quality for a total outage of two
    /// features. Because <c>NotACommonPasswordAttribute</c> has already run and is offline, failing
    /// open degrades to yesterday's policy rather than to no policy at all. Every failure is logged
    /// at Warning, so a permanently broken check is visible rather than silent.</para>
    /// </summary>
    public sealed class PwnedPasswordsChecker : IBreachedPasswordChecker
    {
        private readonly HttpClient _http;
        private readonly ILogger<PwnedPasswordsChecker> _logger;

        public PwnedPasswordsChecker(HttpClient http, ILogger<PwnedPasswordsChecker> logger)
        {
            _http = http;
            _logger = logger;
        }

        public async Task<bool> IsBreachedAsync(string password, CancellationToken ct = default)
        {
            if (string.IsNullOrEmpty(password)) return false;

            var (prefix, suffix) = HashPrefixAndSuffix(password);

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"range/{prefix}");
                // Ask HIBP to pad the response with fake entries. Without it the number of returned
                // suffixes is itself a (weak) signal about the prefix, observable to anyone
                // watching the connection size. Padded responses are a fixed-ish size.
                request.Headers.Add("Add-Padding", "true");

                using var response = await _http.SendAsync(request, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "[PwnedPasswords] Range lookup returned {Status}; treating the password as " +
                        "unknown. The local common-password list still applied.",
                        (int)response.StatusCode);
                    return false;
                }

                var body = await response.Content.ReadAsStringAsync(ct);
                return ContainsSuffix(body, suffix);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw; // the caller gave up; not our failure to swallow
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "[PwnedPasswords] Range lookup failed; treating the password as unknown. The " +
                    "local common-password list still applied.");
                return false;
            }
        }

        /// <summary>SHA-1, uppercase hex, split 5 / 35 as the range API expects.</summary>
        internal static (string Prefix, string Suffix) HashPrefixAndSuffix(string password)
        {
            var hash = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(password)));
            return (hash[..5], hash[5..]);
        }

        /// <summary>
        /// Looks for our suffix in the response body, which is lines of <c>SUFFIX:COUNT</c>.
        ///
        /// <para>Pulled out and made internal so the parsing is unit-testable without the network —
        /// the interesting failure here is a match that silently stops matching (a case change, a
        /// stray CR, a count column that gains a field), and that failure looks exactly like
        /// "nothing was breached", which is indistinguishable from working.</para>
        /// </summary>
        internal static bool ContainsSuffix(string responseBody, string suffix)
        {
            if (string.IsNullOrEmpty(responseBody)) return false;

            foreach (var line in responseBody.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var span = line.AsSpan().Trim();          // trailing \r on CRLF responses
                var colon = span.IndexOf(':');
                var candidate = colon >= 0 ? span[..colon] : span;

                if (candidate.Equals(suffix, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }
    }
}
