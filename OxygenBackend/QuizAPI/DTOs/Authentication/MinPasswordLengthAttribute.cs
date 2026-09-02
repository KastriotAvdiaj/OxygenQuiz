using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Authentication
{
    /// <summary>
    /// Minimum password length, read from <c>Auth:MinPasswordLength</c> at validation time rather
    /// than baked into the attribute.
    ///
    /// <para><b>Why not just <c>[MinLength(n)]</c>.</b> The number was 12, hard-coded in two DTOs
    /// and mirrored by hand in two more places on the client, and there was no way to relax it for
    /// development without also relaxing it for production. Making it configuration means one
    /// value, one place, and a development environment that can set it to 1 so a throwaway test
    /// account does not need a passphrase.</para>
    ///
    /// <para><b>Eight is the floor in production, and that is not a downgrade dressed up.</b>
    /// NIST SP 800-63B puts the minimum for user-chosen secrets at 8 characters and explicitly
    /// recommends screening against a breached/common list <i>instead of</i> composition rules —
    /// which is exactly the pairing here, since <see cref="NotACommonPasswordAttribute"/> still
    /// applies. Length alone was never what was protecting these accounts.</para>
    ///
    /// <para>The client learns the same number from <c>GET /Authentication/auth-config</c>, so the
    /// two cannot drift the way the hand-copied 12 did.</para>
    /// </summary>
    [AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
    public sealed class MinPasswordLengthAttribute : ValidationAttribute
    {
        /// <summary>
        /// Used when configuration is missing or unreadable. Deliberately the production value:
        /// a misread config should tighten to the documented floor, never silently drop the rule.
        /// </summary>
        public const int Fallback = 8;

        public static int Resolve(IConfiguration? configuration) =>
            configuration?.GetValue<int?>("Auth:MinPasswordLength") is int n && n > 0 ? n : Fallback;

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            // Not our rule to enforce: [Required] reports a missing value, and reporting it twice
            // shows the user two errors for one mistake.
            if (value is not string password) return ValidationResult.Success;

            var minimum = Resolve(validationContext.GetService(typeof(IConfiguration)) as IConfiguration);

            return password.Length >= minimum
                ? ValidationResult.Success
                : new ValidationResult(
                    $"Password must be at least {minimum} characters.",
                    validationContext.MemberName is null ? null : new[] { validationContext.MemberName });
        }
    }
}
