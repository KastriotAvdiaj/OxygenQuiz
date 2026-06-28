using System.Security.Cryptography;
using System.Text;

namespace QuizAPI.Services.Invitations
{
    /// <inheritdoc cref="IInviteCodeGenerator"/>
    public class InviteCodeGenerator : IInviteCodeGenerator
    {
        // Unambiguous alphabet: no 0/O or 1/I/L, so a code can be read aloud / copied without confusion.
        private const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        private const int CodeLength = 10;   // ~10 chars of 31-symbol entropy ≈ 49 bits; plenty for a capped pool
        private const int GroupSize = 4;     // grouped for readability: XXXX-XXXX-XX

        public string Generate()
        {
            var chars = new char[CodeLength];
            // CSPRNG, not System.Random: these are bearer secrets.
            Span<byte> bytes = stackalloc byte[CodeLength];
            RandomNumberGenerator.Fill(bytes);
            for (var i = 0; i < CodeLength; i++)
                chars[i] = Alphabet[bytes[i] % Alphabet.Length];

            // Group with dashes for readability; redemption strips them again via Normalize.
            var sb = new StringBuilder(CodeLength + CodeLength / GroupSize);
            for (var i = 0; i < CodeLength; i++)
            {
                if (i > 0 && i % GroupSize == 0) sb.Append('-');
                sb.Append(chars[i]);
            }
            return sb.ToString();
        }

        public string Normalize(string rawCode)
        {
            if (string.IsNullOrWhiteSpace(rawCode)) return string.Empty;

            var sb = new StringBuilder(rawCode.Length);
            foreach (var c in rawCode)
            {
                if (c is '-' or ' ') continue; // drop the readability separators
                sb.Append(char.ToUpperInvariant(c));
            }
            return sb.ToString();
        }

        public string Hash(string rawCode)
        {
            var normalized = Normalize(rawCode);
            var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
            return Convert.ToHexString(hashBytes); // 64 hex chars, same scheme as TokenService.HashToken
        }
    }
}
