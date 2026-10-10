using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace QuizAPI.Services.Billing
{
    /// <summary>
    /// Verifies Paddle's <c>Paddle-Signature</c> webhook header (docs/proposals/paid-plans-and-payments.md
    /// §5.5). Static and pure — no DI — so it can be unit-tested against a recorded sandbox request
    /// with nothing but a string in, a bool out.
    /// </summary>
    public static class PaddleSignatureVerifier
    {
        /// <summary>
        /// <paramref name="header"/> looks like <c>"ts=1671552777;h1=4e2..."</c>. Verifies
        /// HMAC-SHA256("{ts}:{rawBody}", secret) against <c>h1</c> in constant time, and rejects a
        /// timestamp older than <paramref name="maxAge"/> — a replayed, otherwise-valid signature
        /// can't be re-sent indefinitely.
        /// </summary>
        public static bool Verify(string? header, string rawBody, string secret, TimeSpan maxAge, TimeProvider clock)
        {
            if (string.IsNullOrWhiteSpace(header) || string.IsNullOrEmpty(secret)) return false;

            string? ts = null, h1 = null;
            foreach (var part in header.Split(';'))
            {
                var kv = part.Split('=', 2);
                if (kv.Length != 2) continue;
                if (kv[0] == "ts") ts = kv[1];
                else if (kv[0] == "h1") h1 = kv[1];
            }
            if (ts is null || h1 is null) return false;

            if (!long.TryParse(ts, NumberStyles.Integer, CultureInfo.InvariantCulture, out var tsSeconds)) return false;
            var signedAt = DateTimeOffset.FromUnixTimeSeconds(tsSeconds);
            if ((clock.GetUtcNow() - signedAt).Duration() > maxAge) return false;

            byte[] actual;
            try
            {
                actual = Convert.FromHexString(h1);
            }
            catch (FormatException)
            {
                return false; // malformed h1 — fails verification, not an unhandled exception
            }

            var expected = Compute(ts, rawBody, secret);
            return actual.Length == expected.Length && CryptographicOperations.FixedTimeEquals(actual, expected);
        }

        private static byte[] Compute(string ts, string rawBody, string secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            return hmac.ComputeHash(Encoding.UTF8.GetBytes($"{ts}:{rawBody}"));
        }
    }
}
