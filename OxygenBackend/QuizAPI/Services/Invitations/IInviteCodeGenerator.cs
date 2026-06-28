namespace QuizAPI.Services.Invitations
{
    /// <summary>
    /// Mints and normalizes invite codes. Generation and redemption both go through the same
    /// <see cref="Normalize"/>/<see cref="Hash"/> here so the two paths can never drift (a code
    /// generated one way and hashed another would never match).
    /// </summary>
    public interface IInviteCodeGenerator
    {
        /// <summary>Returns a fresh, human-friendly plaintext code, e.g. <c>K7QM-3FXP-9T</c>.</summary>
        string Generate();

        /// <summary>Trims, uppercases, and strips dashes/spaces so formatting can't trip up redemption.</summary>
        string Normalize(string rawCode);

        /// <summary>SHA-256 (hex) of the normalized code. The stored/looked-up value.</summary>
        string Hash(string rawCode);
    }
}
