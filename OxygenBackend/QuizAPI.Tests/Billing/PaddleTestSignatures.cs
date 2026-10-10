using System.Security.Cryptography;
using System.Text;

namespace QuizAPI.Tests.Billing;

/// <summary>Builds a <c>Paddle-Signature</c> header the same way Paddle would, for tests that need a valid one.</summary>
internal static class PaddleTestSignatures
{
    public static string Sign(string ts, string body, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{ts}:{body}"));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static string Header(string ts, string body, string secret) =>
        $"ts={ts};h1={Sign(ts, body, secret)}";
}
